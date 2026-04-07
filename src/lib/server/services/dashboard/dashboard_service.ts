import { and, asc, eq, inArray, isNotNull, max, min, or, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import { sql_shot_calendar_date } from '$lib/server/gallery_shot_date_sql';

/** Paginated grid on the main dashboard. */
export const dashboard_images_per_page = 50;

export type dashboard_gallery_focus_mode = 'needs_attention' | 'archived' | 'albums' | 'album';

export async function load_dashboard_upload_flag_rows(user_id: string) {
	return db
		.select({
			id: raw_image_upload.id,
			starred: raw_image_upload.starred,
			archived_at_ms: raw_image_upload.archived_at_ms
		})
		.from(raw_image_upload)
		.where(eq(raw_image_upload.user_id, user_id));
}

export async function load_dashboard_iso_aggregate(user_id: string) {
	const [row] = await db
		.select({
			iso_min_db: min(raw_image_upload.iso_speed),
			iso_max_db: max(raw_image_upload.iso_speed)
		})
		.from(raw_image_upload)
		.where(eq(raw_image_upload.user_id, user_id));
	return row;
}

export async function load_dashboard_shot_date_aggregate(user_id: string) {
	const shot_date = sql_shot_calendar_date();
	const [row] = await db
		.select({
			date_min_db: sql<string | null>`min(${shot_date})`.mapWith(String),
			date_max_db: sql<string | null>`max(${shot_date})`.mapWith(String)
		})
		.from(raw_image_upload)
		.where(eq(raw_image_upload.user_id, user_id));
	return row;
}

export async function load_dashboard_camera_pair_rows(user_id: string) {
	return db
		.selectDistinct({
			make: raw_image_upload.make,
			model: raw_image_upload.model
		})
		.from(raw_image_upload)
		.where(
			and(
				eq(raw_image_upload.user_id, user_id),
				or(
					sql`trim(coalesce(${raw_image_upload.make}, '')) != ''`,
					sql`trim(coalesce(${raw_image_upload.model}, '')) != ''`
				)
			)
		)
		.orderBy(asc(raw_image_upload.make), asc(raw_image_upload.model));
}

export async function load_dashboard_lens_pair_rows(user_id: string) {
	return db
		.selectDistinct({
			lens_make: raw_image_upload.lens_make,
			lens_model: raw_image_upload.lens_model
		})
		.from(raw_image_upload)
		.where(
			and(
				eq(raw_image_upload.user_id, user_id),
				or(
					sql`trim(coalesce(${raw_image_upload.lens_make}, '')) != ''`,
					sql`trim(coalesce(${raw_image_upload.lens_model}, '')) != ''`
				)
			)
		)
		.orderBy(asc(raw_image_upload.lens_make), asc(raw_image_upload.lens_model));
}

export async function list_archived_raw_upload_ids(user_id: string) {
	return db
		.select({ id: raw_image_upload.id })
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.user_id, user_id), isNotNull(raw_image_upload.archived_at_ms)));
}

export async function list_upload_ids_matching_filter(user_id: string, where_expr: SQL) {
	const rows = await db
		.select({ id: raw_image_upload.id })
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.user_id, user_id), where_expr));
	return rows.map((r) => r.id);
}

/** Columns needed for `build_gallery_meta_rows` under each grid tile. */
export async function load_raw_upload_meta_rows_for_ids(user_id: string, upload_ids: string[]) {
	if (upload_ids.length === 0) return [];
	return db
		.select({
			id: raw_image_upload.id,
			make: raw_image_upload.make,
			model: raw_image_upload.model,
			lens_make: raw_image_upload.lens_make,
			lens_model: raw_image_upload.lens_model,
			image_width: raw_image_upload.image_width,
			image_height: raw_image_upload.image_height,
			pixel_x_dimension: raw_image_upload.pixel_x_dimension,
			pixel_y_dimension: raw_image_upload.pixel_y_dimension,
			x_resolution: raw_image_upload.x_resolution,
			y_resolution: raw_image_upload.y_resolution,
			resolution_unit: raw_image_upload.resolution_unit,
			datetime_original: raw_image_upload.datetime_original,
			byte_size: raw_image_upload.byte_size,
			iso_speed: raw_image_upload.iso_speed,
			exposure_time_seconds: raw_image_upload.exposure_time_seconds,
			exposure_time: raw_image_upload.exposure_time,
			f_number: raw_image_upload.f_number
		})
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.user_id, user_id), inArray(raw_image_upload.id, upload_ids)));
}
