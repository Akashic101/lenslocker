import { and, eq, gte, inArray, isNotNull, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { transformed_media_url } from '$lib/gallery/transformed_urls';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import { sql_shot_calendar_date } from '$lib/server/gallery_shot_date_sql';
import {
	build_gallery_meta_rows,
	upload_id_from_gallery_preview_path
} from '$lib/server/gallery_upload_meta';
import { build_needs_attention_where_sql } from '$lib/server/needs_attention_sql';
import {
	resolve_upload_preview_full_relative_path,
	resolve_upload_preview_thumb_relative_path
} from '$lib/server/raw_upload/write_preview_jpeg';
import {
	get_album_by_id,
	is_album_id_format,
	list_album_summaries,
	list_raw_upload_ids_in_album,
	type album_summary_row
} from '$lib/server/services/album/album_service';
import { get_dashboard_needs_attention_settings } from '$lib/server/services/settings/dashboard_attention_settings';
import { get_general_display_settings } from '$lib/server/services/settings/general_display_settings';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import {
	dashboard_images_per_page,
	list_archived_raw_upload_ids,
	list_upload_ids_matching_filter,
	load_dashboard_camera_pair_rows,
	load_dashboard_iso_aggregate,
	load_dashboard_lens_pair_rows,
	load_dashboard_shot_date_aggregate,
	load_dashboard_upload_flag_rows,
	load_raw_upload_meta_rows_for_ids,
	type dashboard_gallery_focus_mode
} from '$lib/server/services/dashboard/dashboard_service';
import {
	get_transformed_source_description,
	list_transformed_media_paths
} from '$lib/server/transformed';
import { db } from '$lib/server/db';

export { dashboard_images_per_page };

/** URL `sort=` values; default `date_desc` when absent or invalid. */
type gallery_sort_key =
	| 'date_desc'
	| 'date_asc'
	| 'iso_desc'
	| 'iso_asc'
	| 'size_desc'
	| 'size_asc';

const gallery_sort_allowed = new Set<gallery_sort_key>([
	'date_desc',
	'date_asc',
	'iso_desc',
	'iso_asc',
	'size_desc',
	'size_asc'
]);

function parse_gallery_sort(sp: URLSearchParams): gallery_sort_key {
	const v = (sp.get('sort') ?? '').trim() as gallery_sort_key;
	if (gallery_sort_allowed.has(v)) return v;
	return 'date_desc';
}

type gallery_path_sort_meta = {
	shot_sort_key: string | null;
	iso: number | null;
	size: number;
	uploaded_at_ms: number;
};

function chunk_unique_strings(items: string[], chunk_size: number): string[][] {
	const unique = [...new Set(items)];
	const out: string[][] = [];
	for (let i = 0; i < unique.length; i += chunk_size) {
		out.push(unique.slice(i, i + chunk_size));
	}
	return out;
}

async function load_gallery_path_sort_meta(
	upload_ids: string[]
): Promise<Map<string, gallery_path_sort_meta>> {
	const map = new Map<string, gallery_path_sort_meta>();
	if (upload_ids.length === 0) return map;

	const shot_cal_sql = sql_shot_calendar_date();

	for (const chunk of chunk_unique_strings(upload_ids, 450)) {
		const rows = await db
			.select({
				id: raw_image_upload.id,
				shot_cal: sql<string | null>`(${shot_cal_sql})`,
				datetime_original: raw_image_upload.datetime_original,
				iso_speed: raw_image_upload.iso_speed,
				byte_size: raw_image_upload.byte_size,
				uploaded_at_ms: raw_image_upload.uploaded_at_ms
			})
			.from(raw_image_upload)
			.where(inArray(raw_image_upload.id, chunk));

		for (const r of rows) {
			const shot_sort_key = normalize_shot_for_sort(r.datetime_original, r.shot_cal);
			const iso =
				r.iso_speed == null || !Number.isFinite(Number(r.iso_speed)) ? null : Number(r.iso_speed);
			map.set(r.id, {
				shot_sort_key,
				iso,
				size: r.byte_size,
				uploaded_at_ms: r.uploaded_at_ms
			});
		}
	}
	return map;
}

function normalize_shot_for_sort(
	datetime_original_raw: string | null,
	shot_calendar_raw: string | null
): string | null {
	const datetime_original = datetime_original_raw?.trim() ?? '';
	if (datetime_original !== '') {
		const exif_match = datetime_original.match(
			/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
		);
		if (exif_match) {
			const [, y, mo, d, h, mi, s] = exif_match;
			const hh = h ?? '00';
			const mm = mi ?? '00';
			const ss = s ?? '00';
			return `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;
		}
	}
	const shot_calendar = shot_calendar_raw?.trim() ?? '';
	if (shot_calendar === '') return null;
	return `${shot_calendar} 00:00:00`;
}

function cmp_shot_date(a: string | null, b: string | null, desc: boolean): number {
	const a_n = a == null;
	const b_n = b == null;
	if (a_n && b_n) return 0;
	if (a_n) return 1;
	if (b_n) return -1;
	const sa = a as string;
	const sb = b as string;
	const c = sa.localeCompare(sb);
	return desc ? -c : c;
}

function cmp_iso(a: number | null, b: number | null, desc: boolean): number {
	const a_n = a == null || !Number.isFinite(a);
	const b_n = b == null || !Number.isFinite(b);
	if (a_n && b_n) return 0;
	if (a_n) return 1;
	if (b_n) return -1;
	const diff = desc ? (b as number) - (a as number) : (a as number) - (b as number);
	return diff !== 0 ? diff : 0;
}

function cmp_size(a: number, b: number, desc: boolean): number {
	const diff = desc ? b - a : a - b;
	return diff !== 0 ? diff : 0;
}

function compare_gallery_paths(
	path_a: string,
	path_b: string,
	sort: gallery_sort_key,
	meta: Map<string, gallery_path_sort_meta>
): number {
	const id_a = upload_id_from_gallery_preview_path(path_a);
	const id_b = upload_id_from_gallery_preview_path(path_b);
	const ma = id_a != null ? meta.get(id_a) : undefined;
	const mb = id_b != null ? meta.get(id_b) : undefined;

	if (ma == null && mb == null) return path_a.localeCompare(path_b);
	if (ma == null) return 1;
	if (mb == null) return -1;

	let c: number;
	switch (sort) {
		case 'date_desc':
			c = cmp_shot_date(ma.shot_sort_key, mb.shot_sort_key, true);
			break;
		case 'date_asc':
			c = cmp_shot_date(ma.shot_sort_key, mb.shot_sort_key, false);
			break;
		case 'iso_desc':
			c = cmp_iso(ma.iso, mb.iso, true);
			break;
		case 'iso_asc':
			c = cmp_iso(ma.iso, mb.iso, false);
			break;
		case 'size_desc':
			c = cmp_size(ma.size, mb.size, true);
			break;
		case 'size_asc':
			c = cmp_size(ma.size, mb.size, false);
			break;
		default:
			c = 0;
	}

	if (c !== 0) return c;
	c = mb.uploaded_at_ms - ma.uploaded_at_ms;
	if (c !== 0) return c;
	return path_a.localeCompare(path_b);
}

async function sort_gallery_paths(paths: string[], sort: gallery_sort_key): Promise<string[]> {
	if (paths.length <= 1) return paths;
	const ids = paths
		.map((p) => upload_id_from_gallery_preview_path(p))
		.filter((id): id is string => id != null);
	const meta = await load_gallery_path_sort_meta(ids);
	const copy = [...paths];
	copy.sort((a, b) => compare_gallery_paths(a, b, sort, meta));
	return copy;
}

type gallery_grid_image_row = {
	relative_path: string;
	src: string;
	full_src: string | null;
	upload_id: string | null;
	starred: boolean;
	alt: string;
	meta: { rows: { key: string; text: string }[] } | null;
};

function trim_param(sp: URLSearchParams, key: string): string {
	return (sp.get(key) ?? '').trim();
}

function parse_gallery_focus(sp: URLSearchParams): dashboard_gallery_focus_mode | null {
	const v = (sp.get('gallery_focus') ?? '').trim();
	if (v === 'needs_attention' || v === 'archived' || v === 'albums' || v === 'album') {
		return v;
	}
	return null;
}

function build_gallery_filter_query(sp: URLSearchParams): string {
	const keys = [
		'camera_make',
		'camera_model',
		'lens_make',
		'lens_model',
		'date_from',
		'date_to',
		'iso_min',
		'iso_max',
		'starred_only'
	] as const;
	const out = new URLSearchParams();
	for (const k of keys) {
		const v = (sp.get(k) ?? '').trim();
		if (v !== '') out.set(k, v);
	}
	const focus = parse_gallery_focus(sp);
	if (focus != null) out.set('gallery_focus', focus);
	const album_id = (sp.get('album_id') ?? '').trim();
	if (album_id !== '') out.set('album_id', album_id);
	out.set('sort', parse_gallery_sort(sp));
	return out.toString();
}

function build_gallery_dashboard_return(params: {
	needs_attention_settings: Awaited<ReturnType<typeof get_dashboard_needs_attention_settings>>;
	images: gallery_grid_image_row[];
	safe_offset: number;
	safe_limit: number;
	total_count: number;
	gallery_filters_active: boolean;
	exif_filters_active: boolean;
	gallery_focus: dashboard_gallery_focus_mode | null;
	starred_only: boolean;
	camera_make: string;
	camera_model: string;
	lens_make: string;
	lens_model: string;
	date_from: string;
	date_to: string;
	iso_min_raw: string;
	iso_max_raw: string;
	iso_agg_row: Awaited<ReturnType<typeof load_dashboard_iso_aggregate>>;
	date_agg_row: Awaited<ReturnType<typeof load_dashboard_shot_date_aggregate>>;
	camera_pair_rows: Awaited<ReturnType<typeof load_dashboard_camera_pair_rows>>;
	lens_pair_rows: Awaited<ReturnType<typeof load_dashboard_lens_pair_rows>>;
	gallery_filter_query: string;
	albums: album_summary_row[];
	current_album: { id: string; name: string } | null;
	album_id: string | null;
	gallery_sort: gallery_sort_key;
}) {
	const {
		needs_attention_settings,
		images,
		safe_offset,
		safe_limit,
		total_count,
		gallery_filters_active,
		exif_filters_active,
		gallery_focus,
		starred_only,
		camera_make,
		camera_model,
		lens_make,
		lens_model,
		date_from,
		date_to,
		iso_min_raw,
		iso_max_raw,
		iso_agg_row,
		date_agg_row,
		camera_pair_rows,
		lens_pair_rows,
		gallery_filter_query,
		albums,
		current_album,
		album_id,
		gallery_sort
	} = params;

	const camera_pairs = camera_pair_rows.map((r) => ({
		make: r.make ?? '',
		model: r.model ?? ''
	}));

	const lens_pairs = lens_pair_rows.map((r) => ({
		lens_make: r.lens_make ?? '',
		lens_model: r.lens_model ?? ''
	}));

	const iso_stats = {
		min: iso_agg_row?.iso_min_db ?? null,
		max: iso_agg_row?.iso_max_db ?? null
	};

	const date_stats = {
		min: date_agg_row?.date_min_db ?? null,
		max: date_agg_row?.date_max_db ?? null
	};

	const has_more = safe_offset + images.length < total_count;

	return {
		needs_attention_settings,
		transformed_source: get_transformed_source_description(),
		images,
		gallery_infinite: {
			offset: safe_offset,
			batch_size: safe_limit,
			total_count,
			has_more
		},
		gallery_filters: {
			active: gallery_filters_active,
			exif_filters_active,
			gallery_focus,
			starred_only,
			camera_make,
			camera_model,
			lens_make,
			lens_model,
			date_from,
			date_to,
			iso_min: iso_min_raw,
			iso_max: iso_max_raw,
			album_id,
			sort: gallery_sort
		},
		gallery_filter_meta: {
			iso_stats,
			date_stats,
			camera_pairs,
			lens_pairs
		},
		gallery_filter_query,
		albums,
		current_album
	};
}

/**
 * Resolves filtered gallery paths and dashboard metadata for the URL, then hydrates one slice
 * (meta + full preview paths) for grid tiles.
 */
export async function load_gallery_dashboard(url: URL, offset: number, limit: number) {
	const safe_limit = Math.min(Math.max(1, limit), 100);
	const safe_offset = Math.max(0, offset);

	const camera_make = trim_param(url.searchParams, 'camera_make');
	const camera_model = trim_param(url.searchParams, 'camera_model');
	const lens_make = trim_param(url.searchParams, 'lens_make');
	const lens_model = trim_param(url.searchParams, 'lens_model');
	const date_from = trim_param(url.searchParams, 'date_from');
	const date_to = trim_param(url.searchParams, 'date_to');
	const iso_min_raw = trim_param(url.searchParams, 'iso_min');
	const iso_max_raw = trim_param(url.searchParams, 'iso_max');
	const starred_only = url.searchParams.get('starred_only') === '1';
	const gallery_focus = parse_gallery_focus(url.searchParams);
	const album_id_raw = trim_param(url.searchParams, 'album_id');
	const album_id_for_row =
		gallery_focus === 'album' && album_id_raw !== '' && is_album_id_format(album_id_raw)
			? album_id_raw
			: null;

	const iso_min_parsed = iso_min_raw === '' ? null : Number.parseInt(iso_min_raw, 10);
	const iso_max_parsed = iso_max_raw === '' ? null : Number.parseInt(iso_max_raw, 10);
	const iso_min = iso_min_parsed != null && Number.isFinite(iso_min_parsed) ? iso_min_parsed : null;
	const iso_max = iso_max_parsed != null && Number.isFinite(iso_max_parsed) ? iso_max_parsed : null;

	const exif_filters_active =
		camera_make !== '' ||
		camera_model !== '' ||
		lens_make !== '' ||
		lens_model !== '' ||
		date_from !== '' ||
		date_to !== '' ||
		iso_min_raw !== '' ||
		iso_max_raw !== '';

	const gallery_focus_active = gallery_focus != null && gallery_focus !== 'albums';
	const gallery_filters_active = exif_filters_active || starred_only || gallery_focus_active;

	const gallery_sort = parse_gallery_sort(url.searchParams);
	const shot_date = sql_shot_calendar_date();

	if (gallery_focus === 'albums') {
		const [
			iso_agg_row,
			date_agg_row,
			camera_pair_rows,
			lens_pair_rows,
			needs_attention_settings,
			albums
		] = await Promise.all([
			load_dashboard_iso_aggregate(),
			load_dashboard_shot_date_aggregate(),
			load_dashboard_camera_pair_rows(),
			load_dashboard_lens_pair_rows(),
			get_dashboard_needs_attention_settings(),
			list_album_summaries()
		]);

		return build_gallery_dashboard_return({
			needs_attention_settings,
			images: [],
			safe_offset,
			safe_limit,
			total_count: 0,
			gallery_filters_active,
			exif_filters_active,
			gallery_focus,
			starred_only,
			camera_make,
			camera_model,
			lens_make,
			lens_model,
			date_from,
			date_to,
			iso_min_raw,
			iso_max_raw,
			iso_agg_row,
			date_agg_row,
			camera_pair_rows,
			lens_pair_rows,
			gallery_filter_query: build_gallery_filter_query(url.searchParams),
			albums,
			current_album: null,
			album_id: null,
			gallery_sort
		});
	}

	const [
		all_paths,
		upload_flag_rows,
		iso_agg_row,
		date_agg_row,
		camera_pair_rows,
		lens_pair_rows,
		upload_pipeline_settings,
		general_display_settings,
		needs_attention_settings,
		albums
	] = await Promise.all([
		list_transformed_media_paths(),
		load_dashboard_upload_flag_rows(),
		load_dashboard_iso_aggregate(),
		load_dashboard_shot_date_aggregate(),
		load_dashboard_camera_pair_rows(),
		load_dashboard_lens_pair_rows(),
		get_upload_preview_pipeline_settings(),
		get_general_display_settings(),
		get_dashboard_needs_attention_settings(),
		list_album_summaries()
	]);

	const upload_flags = new Map(
		upload_flag_rows.map((r) => [
			r.id,
			{ starred: r.starred ?? 0, archived_at_ms: r.archived_at_ms ?? null }
		])
	);

	let current_album: { id: string; name: string } | null = null;
	let album_member_ids: string[] = [];

	let scope_paths: string[];
	if (gallery_focus === 'album') {
		if (album_id_for_row == null) {
			scope_paths = [];
		} else {
			const album_row = await get_album_by_id(album_id_for_row);
			if (album_row == null) {
				scope_paths = [];
			} else {
				current_album = { id: album_row.id, name: album_row.name };
				album_member_ids = await list_raw_upload_ids_in_album(album_id_for_row);
				const preferred_format = upload_pipeline_settings.upload_preview_format;
				const resolved = await Promise.all(
					album_member_ids.map((id) =>
						resolve_upload_preview_thumb_relative_path(id, preferred_format)
					)
				);
				scope_paths = resolved.filter((rel): rel is string => rel != null);
				scope_paths.sort((a, b) => a.localeCompare(b));
			}
		}
	} else if (gallery_focus === 'archived') {
		const archived_rows = await list_archived_raw_upload_ids();
		const preferred_format = upload_pipeline_settings.upload_preview_format;
		const resolved = await Promise.all(
			archived_rows.map((r) => resolve_upload_preview_thumb_relative_path(r.id, preferred_format))
		);
		scope_paths = resolved.filter((rel): rel is string => rel != null);
		scope_paths.sort((a, b) => a.localeCompare(b));
	} else {
		scope_paths = all_paths.filter((p) => {
			const upload_id = upload_id_from_gallery_preview_path(p);
			if (upload_id == null) return gallery_focus == null;

			const f = upload_flags.get(upload_id);
			if (f == null) return gallery_focus == null;
			return f.archived_at_ms == null;
		});
	}

	const needs_db_id_filter_non_album = gallery_focus !== 'album' && gallery_filters_active;

	let filtered_paths: string[];

	if (gallery_focus === 'album') {
		if (album_member_ids.length === 0) {
			filtered_paths = [];
		} else if (!exif_filters_active && !starred_only) {
			filtered_paths = scope_paths;
		} else {
			const parts: SQL[] = [inArray(raw_image_upload.id, album_member_ids)];

			if (starred_only) parts.push(eq(raw_image_upload.starred, 1));

			const before_exif = parts.length;
			if (exif_filters_active) {
				if (camera_make !== '') parts.push(eq(raw_image_upload.make, camera_make));
				if (camera_model !== '') parts.push(eq(raw_image_upload.model, camera_model));
				if (lens_make !== '') parts.push(eq(raw_image_upload.lens_make, lens_make));
				if (lens_model !== '') parts.push(eq(raw_image_upload.lens_model, lens_model));

				if (date_from !== '') {
					parts.push(isNotNull(shot_date));
					parts.push(sql`${shot_date} >= ${date_from}`);
				}
				if (date_to !== '') {
					parts.push(isNotNull(shot_date));
					parts.push(sql`${shot_date} <= ${date_to}`);
				}

				const iso_filter_requested = iso_min_raw !== '' || iso_max_raw !== '';
				if (iso_filter_requested) {
					parts.push(isNotNull(raw_image_upload.iso_speed));
					if (iso_min != null) parts.push(gte(raw_image_upload.iso_speed, iso_min));
					if (iso_max != null) parts.push(lte(raw_image_upload.iso_speed, iso_max));
				}

				if (parts.length === before_exif) {
					parts.push(sql`1 = 0`);
				}
			}

			const matching_ids = await list_upload_ids_matching_filter(and(...parts)!);
			const id_set = new Set(matching_ids);
			filtered_paths = scope_paths.filter((p) => {
				const upload_id = upload_id_from_gallery_preview_path(p);
				if (upload_id == null) return false;
				return id_set.has(upload_id);
			});
		}
	} else if (needs_db_id_filter_non_album) {
		const parts: SQL[] = [];

		if (gallery_focus === 'archived') {
			parts.push(isNotNull(raw_image_upload.archived_at_ms));
		} else {
			parts.push(isNull(raw_image_upload.archived_at_ms));
		}

		if (gallery_focus === 'needs_attention') {
			parts.push(
				build_needs_attention_where_sql(needs_attention_settings.required_field_keys, shot_date)
			);
		}

		if (starred_only) parts.push(eq(raw_image_upload.starred, 1));

		const before_exif = parts.length;
		if (exif_filters_active) {
			if (camera_make !== '') parts.push(eq(raw_image_upload.make, camera_make));
			if (camera_model !== '') parts.push(eq(raw_image_upload.model, camera_model));
			if (lens_make !== '') parts.push(eq(raw_image_upload.lens_make, lens_make));
			if (lens_model !== '') parts.push(eq(raw_image_upload.lens_model, lens_model));

			if (date_from !== '') {
				parts.push(isNotNull(shot_date));
				parts.push(sql`${shot_date} >= ${date_from}`);
			}
			if (date_to !== '') {
				parts.push(isNotNull(shot_date));
				parts.push(sql`${shot_date} <= ${date_to}`);
			}

			const iso_filter_requested = iso_min_raw !== '' || iso_max_raw !== '';
			if (iso_filter_requested) {
				parts.push(isNotNull(raw_image_upload.iso_speed));
				if (iso_min != null) parts.push(gte(raw_image_upload.iso_speed, iso_min));
				if (iso_max != null) parts.push(lte(raw_image_upload.iso_speed, iso_max));
			}

			if (parts.length === before_exif) {
				parts.push(sql`1 = 0`);
			}
		}

		const matching_ids = await list_upload_ids_matching_filter(and(...parts)!);
		const id_set = new Set(matching_ids);
		filtered_paths = scope_paths.filter((p) => {
			const upload_id = upload_id_from_gallery_preview_path(p);
			if (upload_id == null) return false;
			return id_set.has(upload_id);
		});
	} else {
		filtered_paths = scope_paths;
	}

	filtered_paths = await sort_gallery_paths(filtered_paths, gallery_sort);

	const total_count = filtered_paths.length;
	const slice = filtered_paths.slice(safe_offset, safe_offset + safe_limit);

	const preview_upload_ids = slice
		.map((p) => upload_id_from_gallery_preview_path(p))
		.filter((id): id is string => id != null);

	const meta_by_upload_id = new Map<string, ReturnType<typeof build_gallery_meta_rows>>();

	if (preview_upload_ids.length > 0) {
		const rows = await load_raw_upload_meta_rows_for_ids(preview_upload_ids);

		const meta_opts = { time_format: general_display_settings.time_format };
		for (const row of rows) {
			const caption_rows = build_gallery_meta_rows(row, meta_opts);
			if (caption_rows.length > 0) meta_by_upload_id.set(row.id, caption_rows);
		}
	}

	const full_preview_relative_by_upload_id = new Map<string, string>();
	if (preview_upload_ids.length > 0) {
		const preferred_format = upload_pipeline_settings.upload_preview_format;
		for (const uid of new Set(preview_upload_ids)) {
			const rel = await resolve_upload_preview_full_relative_path(uid, preferred_format);
			if (rel != null) full_preview_relative_by_upload_id.set(uid, rel);
		}
	}

	const images = slice.map((relative_path) => {
		const upload_id = upload_id_from_gallery_preview_path(relative_path);
		const caption_rows = upload_id ? meta_by_upload_id.get(upload_id) : undefined;
		const full_relative = upload_id
			? (full_preview_relative_by_upload_id.get(upload_id) ?? null)
			: null;
		const flags = upload_id ? upload_flags.get(upload_id) : undefined;
		const starred = flags != null && flags.starred === 1;
		return {
			relative_path,
			src: transformed_media_url(relative_path),
			full_src: full_relative ? transformed_media_url(full_relative) : null,
			upload_id,
			starred,
			alt: relative_path,
			meta: caption_rows && caption_rows.length > 0 ? { rows: caption_rows } : null
		};
	});

	return build_gallery_dashboard_return({
		needs_attention_settings,
		images,
		safe_offset,
		safe_limit,
		total_count,
		gallery_filters_active,
		exif_filters_active,
		gallery_focus,
		starred_only,
		camera_make,
		camera_model,
		lens_make,
		lens_model,
		date_from,
		date_to,
		iso_min_raw,
		iso_max_raw,
		iso_agg_row,
		date_agg_row,
		camera_pair_rows,
		lens_pair_rows,
		gallery_filter_query: build_gallery_filter_query(url.searchParams),
		albums,
		current_album,
		album_id: album_id_for_row,
		gallery_sort
	});
}
