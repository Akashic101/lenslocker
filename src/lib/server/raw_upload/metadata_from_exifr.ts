import { getTableColumns } from 'drizzle-orm';
import exifr from 'exifr';
import { raw_image_upload, type RawImageUploadInsert } from '$lib/server/db/raw_image_upload.schema';

const file_field_keys = new Set([
	'id',
	'original_filename',
	'stored_filename',
	'relative_storage_path',
	'byte_size',
	'mime_type',
	'sha256_hex',
	'uploaded_at_ms'
]);

const integer_metadata_keys = new Set<string>([
	'pixel_x_dimension',
	'pixel_y_dimension',
	'image_width',
	'image_height',
	'orientation',
	'samples_per_pixel',
	'planar_configuration',
	'resolution_unit',
	'rows_per_strip',
	'tile_width',
	'tile_length',
	'exposure_program',
	'iso_speed',
	'recommended_exposure_index',
	'metering_mode',
	'light_source',
	'flash',
	'focal_length_in_35mm_film',
	'subject_distance_range',
	'exposure_mode',
	'white_balance',
	'white_balance_temperature',
	'scene_capture_type',
	'gain_control',
	'contrast',
	'saturation',
	'sharpness',
	'composite_image',
	'focal_plane_resolution_unit',
	'sensing_method',
	'custom_rendered',
	'calibration_illuminant_1',
	'calibration_illuminant_2',
	'rating',
	'gps_altitude_ref'
]);

const real_metadata_keys = new Set<string>([
	'exposure_time_seconds',
	'f_number',
	'aperture_value',
	'max_aperture_value',
	'focal_length',
	'gps_latitude',
	'gps_longitude',
	'gps_altitude',
	'gps_img_direction',
	'gps_speed',
	'gps_dest_bearing',
	'gps_h_positioning_error'
]);

function json_safe_stringify(value: unknown): string {
	return JSON.stringify(value, (_key, v) => {
		if (typeof v === 'bigint') return v.toString();
		if (v instanceof Date) return v.toISOString();
		return v;
	});
}

function to_snake_segment(segment: string): string {
	return segment
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase();
}

function flatten_deep(obj: unknown, prefix = ''): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (obj === null || obj === undefined) return out;
	if (typeof obj !== 'object' || obj instanceof Date) {
		if (prefix) out[prefix] = obj;
		return out;
	}
	if (Array.isArray(obj)) {
		if (prefix) out[prefix] = obj;
		return out;
	}
	for (const [k, v] of Object.entries(obj)) {
		const seg = to_snake_segment(k);
		const key = prefix ? `${prefix}_${seg}` : seg;
		if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
			Object.assign(out, flatten_deep(v, key));
		} else {
			out[key] = v;
		}
	}
	return out;
}

/** Normalize compound keys (e.g. date_time_original → datetime_original). */
function normalize_metadata_keys(flat: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(flat)) {
		let nk = k.replace(/^date_time_/, 'datetime_').replace(/^sub_sec_/, 'subsec_');
		nk = nk.replace(/^gps_gps_/, 'gps_');
		if (out[nk] === undefined) out[nk] = v;
	}
	return out;
}

function apply_gps_aliases(flat: Record<string, unknown>) {
	if (flat.gps_latitude == null && flat.latitude != null) flat.gps_latitude = flat.latitude;
	if (flat.gps_longitude == null && flat.longitude != null) flat.gps_longitude = flat.longitude;
}

/** exifr often puts pixel size in ExifImageWidth/Height → exif_image_*; our columns use image_* / pixel_*_dimension. */
function apply_image_dimension_aliases(flat: Record<string, unknown>) {
	const exif_w = flat.exif_image_width;
	const exif_h = flat.exif_image_height;
	if (flat.image_width == null && exif_w != null) flat.image_width = exif_w;
	if (flat.image_height == null && exif_h != null) flat.image_height = exif_h;
	if (flat.pixel_x_dimension == null && exif_w != null) flat.pixel_x_dimension = exif_w;
	if (flat.pixel_y_dimension == null && exif_h != null) flat.pixel_y_dimension = exif_h;
}

function coerce_value(column: string, value: unknown): string | number | null {
	if (value === null || value === undefined) return null;
	if (integer_metadata_keys.has(column)) {
		if (typeof value === 'boolean') return value ? 1 : 0;
		if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
		if (typeof value === 'string') {
			const n = Number.parseInt(value, 10);
			return Number.isFinite(n) ? n : null;
		}
		return null;
	}
	if (real_metadata_keys.has(column)) {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string') {
			const n = Number.parseFloat(value);
			return Number.isFinite(n) ? n : null;
		}
		return null;
	}
	if (typeof value === 'boolean') return value ? '1' : '0';
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (typeof value === 'string') return value;
	if (typeof value === 'bigint') return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value) || typeof value === 'object') return json_safe_stringify(value);
	return String(value);
}

const table_columns = Object.keys(getTableColumns(raw_image_upload));

export async function build_metadata_fields(buffer: ArrayBuffer): Promise<Partial<RawImageUploadInsert>> {
	let tags: Record<string, unknown> | undefined;
	try {
		tags = (await exifr.parse(buffer, {
			mergeOutput: true,
			iptc: true,
			xmp: true,
			icc: true,
			gps: true,
			reviveValues: true
		})) as Record<string, unknown> | undefined;
	} catch {
		tags = {};
	}

	const full = tags ?? {};
	const flat = normalize_metadata_keys(flatten_deep(full));
	apply_gps_aliases(flat);
	apply_image_dimension_aliases(flat);

	const row: Partial<RawImageUploadInsert> = {
		exifr_full_json: json_safe_stringify(full)
	};

	for (const column of table_columns) {
		if (file_field_keys.has(column) || column === 'exifr_full_json') continue;
		if (!(column in flat)) continue;
		const coerced = coerce_value(column, flat[column]);
		if (coerced !== null) {
			(row as Record<string, string | number>)[column] = coerced;
		}
	}

	if (row.iso_speed == null && typeof flat.iso === 'number' && Number.isFinite(flat.iso)) {
		row.iso_speed = Math.round(flat.iso);
	}

	if (typeof flat.exposure_time === 'number' && Number.isFinite(flat.exposure_time)) {
		if (row.exposure_time_seconds == null) row.exposure_time_seconds = flat.exposure_time;
		if (row.exposure_time == null) row.exposure_time = String(flat.exposure_time);
	}

	return row;
}
