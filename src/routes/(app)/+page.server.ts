import { and, eq, gte, isNotNull, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { dashboard_attention_settings_depends_key } from '$lib/dashboard_attention_settings_cache';
import { transformed_media_depends_key } from '$lib/transformed_media_cache';
import { transformed_media_url } from '$lib/transformed_urls';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import { sql_shot_calendar_date } from '$lib/server/gallery_shot_date_sql';
import {
	build_gallery_meta_rows,
	upload_id_from_gallery_preview_path
} from '$lib/server/gallery_upload_meta';
import {
	resolve_upload_preview_full_relative_path,
	resolve_upload_preview_thumb_relative_path
} from '$lib/server/raw_upload/write_preview_jpeg';
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
import { get_dashboard_needs_attention_settings } from '$lib/server/services/settings/dashboard_attention_settings';
import { build_needs_attention_where_sql } from '$lib/server/needs_attention_sql';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import type { PageServerLoad } from './$types';

function trim_param(sp: URLSearchParams, key: string): string {
	return (sp.get(key) ?? '').trim();
}

function parse_gallery_focus(sp: URLSearchParams): dashboard_gallery_focus_mode | null {
	const v = (sp.get('gallery_focus') ?? '').trim();
	if (v === 'needs_attention' || v === 'archived') return v;
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
	return out.toString();
}

export const load: PageServerLoad = async ({ url, depends }) => {
	depends(transformed_media_depends_key);
	depends(dashboard_attention_settings_depends_key);

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
	const gallery_focus_active = gallery_focus != null;

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

	const gallery_filters_active = exif_filters_active || starred_only || gallery_focus_active;
	const needs_db_id_filter = exif_filters_active || starred_only || gallery_focus_active;

	const shot_date = sql_shot_calendar_date();

	const [
		all_paths,
		upload_flag_rows,
		iso_agg_row,
		date_agg_row,
		camera_pair_rows,
		lens_pair_rows,
		upload_pipeline_settings,
		needs_attention_settings
	] = await Promise.all([
		list_transformed_media_paths(),
		load_dashboard_upload_flag_rows(),
		load_dashboard_iso_aggregate(),
		load_dashboard_shot_date_aggregate(),
		load_dashboard_camera_pair_rows(),
		load_dashboard_lens_pair_rows(),
		get_upload_preview_pipeline_settings(),
		get_dashboard_needs_attention_settings()
	]);

	const upload_flags = new Map(
		upload_flag_rows.map((r) => [
			r.id,
			{ starred: r.starred ?? 0, archived_at_ms: r.archived_at_ms ?? null }
		])
	);

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

	/**
	 * Main gallery walks the filesystem. Archiving used to delete thumbs, so archived rows often
	 * have no paths in `all_paths`. Build archived grid paths from DB ids + on-disk thumb resolution.
	 */
	let scope_paths: string[];
	if (gallery_focus === 'archived') {
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

	let filtered_paths: string[];

	if (needs_db_id_filter) {
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

	const total_count = filtered_paths.length;
	const raw_page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page_number = Number.isFinite(raw_page) && raw_page >= 1 ? raw_page : 1;
	const total_pages = Math.max(1, Math.ceil(total_count / dashboard_images_per_page));
	const current_page = Math.min(page_number, total_pages);
	const start = (current_page - 1) * dashboard_images_per_page;
	const slice = filtered_paths.slice(start, start + dashboard_images_per_page);

	const preview_upload_ids = slice
		.map((p) => upload_id_from_gallery_preview_path(p))
		.filter((id): id is string => id != null);

	const meta_by_upload_id = new Map<string, ReturnType<typeof build_gallery_meta_rows>>();

	if (preview_upload_ids.length > 0) {
		const rows = await load_raw_upload_meta_rows_for_ids(preview_upload_ids);

		for (const row of rows) {
			const caption_rows = build_gallery_meta_rows(row);
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

	const gallery_filter_query = build_gallery_filter_query(url.searchParams);

	return {
		needs_attention_settings,
		transformed_source: get_transformed_source_description(),
		images,
		pagination: {
			current_page,
			total_pages,
			total_count,
			images_per_page: dashboard_images_per_page,
			has_previous: current_page > 1,
			has_next: current_page < total_pages
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
			iso_max: iso_max_raw
		},
		gallery_filter_meta: {
			iso_stats,
			date_stats,
			camera_pairs,
			lens_pairs
		},
		gallery_filter_query
	};
};
