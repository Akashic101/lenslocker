import { sql, count, desc, asc, gte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';

const thirty_six_months_ms = Math.round(36 * 30.44 * 24 * 60 * 60 * 1000);

const iso_bucket_defs = [
	{ key: 'unknown', label: 'Unknown' },
	{ key: 'le_200', label: '≤200' },
	{ key: 'b_201_400', label: '201–400' },
	{ key: 'b_401_800', label: '401–800' },
	{ key: 'b_801_1600', label: '801–1600' },
	{ key: 'b_1601_3200', label: '1601–3200' },
	{ key: 'b_3201_6400', label: '3201–6400' },
	{ key: 'above_6400', label: '6401+' }
] as const;

function format_camera_label(make: string | null, model: string | null): string {
	const m = (make ?? '').trim();
	const mo = (model ?? '').trim();
	if (m === '' && mo === '') return 'Unknown camera';
	if (m === '') return mo;
	if (mo === '') return m;
	return `${m} ${mo}`;
}

function ym_to_chart_label(ym: string): string {
	const parts = ym.split('-');
	const y = Number(parts[0]);
	const mo = Number(parts[1]);
	if (!Number.isFinite(y) || !Number.isFinite(mo)) return ym;
	return new Date(y, mo - 1, 1).toLocaleString('en', { month: 'short', year: 'numeric' });
}

export type gallery_statistics_v1 = {
	kpis: {
		total: number;
		total_bytes: number;
		active: number;
		archived: number;
		starred: number;
	};
	/** Mutually exclusive: in-gallery unstarred, in-gallery starred, archived (any star). */
	gallery_archived_starred: { labels: string[]; series: number[] };
	uploads_by_month: { labels: string[]; series: number[] };
	top_cameras: { labels: string[]; series: number[] };
	iso_buckets: { labels: string[]; series: number[] };
	gps: { labels: string[]; series: number[] };
};

export async function load_gallery_statistics_v1(): Promise<gallery_statistics_v1> {
	const [kpi_row] = await db
		.select({
			total: count(),
			total_bytes: sql<number>`coalesce(sum(${raw_image_upload.byte_size}), 0)`.mapWith(Number),
			active:
				sql<number>`coalesce(sum(case when ${raw_image_upload.archived_at_ms} is null then 1 else 0 end), 0)`.mapWith(
					Number
				),
			archived:
				sql<number>`coalesce(sum(case when ${raw_image_upload.archived_at_ms} is not null then 1 else 0 end), 0)`.mapWith(
					Number
				),
			starred:
				sql<number>`coalesce(sum(case when ${raw_image_upload.starred} = 1 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			gallery_unstarred:
				sql<number>`coalesce(sum(case when ${raw_image_upload.archived_at_ms} is null and ${raw_image_upload.starred} != 1 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			starred_in_gallery:
				sql<number>`coalesce(sum(case when ${raw_image_upload.archived_at_ms} is null and ${raw_image_upload.starred} = 1 then 1 else 0 end), 0)`.mapWith(
					Number
				)
		})
		.from(raw_image_upload);

	const total = Number(kpi_row?.total ?? 0);
	const total_bytes = Number(kpi_row?.total_bytes ?? 0);
	const active = Number(kpi_row?.active ?? 0);
	const archived = Number(kpi_row?.archived ?? 0);
	const starred = Number(kpi_row?.starred ?? 0);
	const gallery_unstarred = Number(kpi_row?.gallery_unstarred ?? 0);
	const starred_in_gallery = Number(kpi_row?.starred_in_gallery ?? 0);

	const gallery_archived_starred = {
		labels: ['Gallery', 'Starred', 'Archived'],
		series: [gallery_unstarred, starred_in_gallery, archived]
	};

	const ym_expr = sql<string>`strftime('%Y-%m', cast(${raw_image_upload.uploaded_at_ms} as real) / 1000, 'unixepoch')`;

	let month_rows = await db
		.select({
			ym: ym_expr,
			c: count()
		})
		.from(raw_image_upload)
		.where(gte(raw_image_upload.uploaded_at_ms, Date.now() - thirty_six_months_ms))
		.groupBy(ym_expr)
		.orderBy(asc(ym_expr));

	if (month_rows.length === 0 && total > 0) {
		month_rows = await db
			.select({
				ym: ym_expr,
				c: count()
			})
			.from(raw_image_upload)
			.groupBy(ym_expr)
			.orderBy(asc(ym_expr));
	}

	if (month_rows.length > 36) {
		month_rows = month_rows.slice(-36);
	}

	const uploads_by_month = {
		labels: month_rows.map((r) => ym_to_chart_label(String(r.ym))),
		series: month_rows.map((r) => Number(r.c))
	};

	const camera_rows = await db
		.select({
			make: raw_image_upload.make,
			model: raw_image_upload.model,
			c: count()
		})
		.from(raw_image_upload)
		.groupBy(raw_image_upload.make, raw_image_upload.model)
		.orderBy(desc(count()))
		.limit(10);

	const top_cameras = {
		labels: camera_rows.map((r) => format_camera_label(r.make, r.model)),
		series: camera_rows.map((r) => Number(r.c))
	};

	const [iso_row] = await db
		.select({
			unknown:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} is null then 1 else 0 end), 0)`.mapWith(
					Number
				),
			le_200:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} is not null and ${raw_image_upload.iso_speed} <= 200 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			b_201_400:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} > 200 and ${raw_image_upload.iso_speed} <= 400 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			b_401_800:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} > 400 and ${raw_image_upload.iso_speed} <= 800 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			b_801_1600:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} > 800 and ${raw_image_upload.iso_speed} <= 1600 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			b_1601_3200:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} > 1600 and ${raw_image_upload.iso_speed} <= 3200 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			b_3201_6400:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} > 3200 and ${raw_image_upload.iso_speed} <= 6400 then 1 else 0 end), 0)`.mapWith(
					Number
				),
			above_6400:
				sql<number>`coalesce(sum(case when ${raw_image_upload.iso_speed} > 6400 then 1 else 0 end), 0)`.mapWith(
					Number
				)
		})
		.from(raw_image_upload);

	const iso_counts = iso_row ?? {
		unknown: 0,
		le_200: 0,
		b_201_400: 0,
		b_401_800: 0,
		b_801_1600: 0,
		b_1601_3200: 0,
		b_3201_6400: 0,
		above_6400: 0
	};

	const iso_buckets = {
		labels: iso_bucket_defs.map((d) => d.label),
		series: iso_bucket_defs.map((d) => Number(iso_counts[d.key]))
	};

	const [gps_row] = await db
		.select({
			geotagged:
				sql<number>`coalesce(sum(case when ${raw_image_upload.gps_latitude} is not null and ${raw_image_upload.gps_longitude} is not null then 1 else 0 end), 0)`.mapWith(
					Number
				),
			not_geotagged:
				sql<number>`coalesce(sum(case when ${raw_image_upload.gps_latitude} is null or ${raw_image_upload.gps_longitude} is null then 1 else 0 end), 0)`.mapWith(
					Number
				)
		})
		.from(raw_image_upload);

	const gps = {
		labels: ['Geotagged', 'No GPS'],
		series: [Number(gps_row?.geotagged ?? 0), Number(gps_row?.not_geotagged ?? 0)]
	};

	return {
		kpis: { total, total_bytes, active, archived, starred },
		gallery_archived_starred,
		uploads_by_month,
		top_cameras,
		iso_buckets,
		gps
	};
}
