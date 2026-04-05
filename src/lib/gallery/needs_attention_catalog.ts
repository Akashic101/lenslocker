/**
 * Catalog for Dashboard → Needs attention: any combination of field keys is valid;
 * there is no priority order. Keys are OR’d for SQL and for “photo needs attention”.
 */
import { dashboard_needs_attention_default_keys } from '$lib/config/dashboard_attention_defaults';
import { upload_meta_editable_field_list } from './upload_meta_editable_fields';

export type needs_attention_field_catalog_entry = {
	key: string;
	label: string;
	group: string;
};

/** Compound rules (shortcuts) plus every scalar metadata column from `raw_image_upload`. */
export const needs_attention_special_field_keys = [
	'gps_either_missing',
	'camera_body_incomplete',
	'lens_incomplete',
	'shot_date_calendar_missing',
	'exposure_both_missing'
] as const;

export type needs_attention_special_field_key = (typeof needs_attention_special_field_keys)[number];

const editable_label_by_key = new Map<string, string>(
	upload_meta_editable_field_list.map((field) => [field.key, field.label])
);

function humanize_column_key(key: string): string {
	return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function label_for_key(key: string): string {
	return editable_label_by_key.get(key) ?? humanize_column_key(key);
}

type column_pack = {
	group: string;
	kind: 'text' | 'int' | 'real';
	keys: readonly string[];
};

/** Mirrors `raw_image_upload` minus storage / system columns. */
const column_packs: column_pack[] = [
	{
		group: 'File',
		kind: 'text',
		keys: ['mime_type']
	},
	{
		group: 'Image geometry',
		kind: 'int',
		keys: [
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
			'tile_length'
		]
	},
	{
		group: 'Image geometry',
		kind: 'text',
		keys: [
			'bits_per_sample',
			'color_space',
			'components_configuration',
			'compressed_bits_per_pixel',
			'photometric_interpretation',
			'x_resolution',
			'y_resolution'
		]
	},
	{
		group: 'Camera & lens',
		kind: 'text',
		keys: [
			'make',
			'model',
			'lens_make',
			'lens_model',
			'lens_serial_number',
			'body_serial_number',
			'internal_serial_number',
			'software',
			'firmware_version',
			'unique_camera_model',
			'localized_camera_model',
			'camera_owner_name',
			'label_name'
		]
	},
	{
		group: 'Date & time',
		kind: 'text',
		keys: [
			'datetime_original',
			'datetime_digitized',
			'datetime_created',
			'subsec_time',
			'subsec_time_original',
			'subsec_time_digitized',
			'offset_time',
			'offset_time_original',
			'offset_time_digitized'
		]
	},
	{
		group: 'Exposure & shooting',
		kind: 'real',
		keys: [
			'exposure_time_seconds',
			'f_number',
			'aperture_value',
			'max_aperture_value',
			'focal_length'
		]
	},
	{
		group: 'Exposure & shooting',
		kind: 'int',
		keys: [
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
			'focal_plane_resolution_unit',
			'sensing_method',
			'custom_rendered',
			'composite_image'
		]
	},
	{
		group: 'Exposure & shooting',
		kind: 'text',
		keys: [
			'exposure_time',
			'iso_speed_ratings',
			'shutter_speed_value',
			'brightness_value',
			'exposure_bias_value',
			'exposure_index',
			'subject_distance',
			'subject_area',
			'digital_zoom_ratio',
			'focal_plane_x_resolution',
			'focal_plane_y_resolution',
			'digital_gain',
			'scene_type',
			'source_exposure_times_of_composite_image'
		]
	},
	{
		group: 'GPS',
		kind: 'real',
		keys: [
			'gps_latitude',
			'gps_longitude',
			'gps_altitude',
			'gps_img_direction',
			'gps_speed',
			'gps_dest_bearing',
			'gps_h_positioning_error'
		]
	},
	{
		group: 'GPS',
		kind: 'int',
		keys: ['gps_altitude_ref']
	},
	{
		group: 'GPS',
		kind: 'text',
		keys: [
			'gps_latitude_ref',
			'gps_longitude_ref',
			'gps_timestamp',
			'gps_date_stamp',
			'gps_dest_bearing_ref',
			'gps_map_datum',
			'gps_processing_method',
			'gps_area_information'
		]
	},
	{
		group: 'Description & IPTC',
		kind: 'text',
		keys: [
			'image_description',
			'artist',
			'copyright',
			'user_comment',
			'xp_title',
			'xp_comment',
			'xp_keywords',
			'xp_subject',
			'headline',
			'title',
			'caption',
			'instructions',
			'credit_line',
			'source',
			'job_name',
			'category',
			'supplemental_categories',
			'keywords',
			'label',
			'state',
			'country',
			'city',
			'sublocation',
			'event',
			'person_shown',
			'web_statement',
			'rights',
			'creator',
			'creator_contact_info'
		]
	},
	{
		group: 'Description & IPTC',
		kind: 'int',
		keys: ['rating']
	},
	{
		group: 'RAW / DNG',
		kind: 'text',
		keys: [
			'dng_version',
			'dng_backward_version',
			'unique_camera_model_raw',
			'color_matrix_1',
			'color_matrix_2',
			'analog_balance',
			'as_shot_neutral',
			'camera_calibration_1',
			'camera_calibration_2',
			'reduction_matrix_1',
			'reduction_matrix_2',
			'baseline_exposure',
			'baseline_noise',
			'baseline_sharpness',
			'linear_response_limit',
			'shadow_scale',
			'raw_data_unique_id',
			'original_raw_file_name'
		]
	},
	{
		group: 'RAW / DNG',
		kind: 'int',
		keys: ['calibration_illuminant_1', 'calibration_illuminant_2']
	}
];

export const needs_attention_text_column_keys = new Set<string>();
export const needs_attention_int_column_keys = new Set<string>();
export const needs_attention_real_column_keys = new Set<string>();

for (const pack of column_packs) {
	const target =
		pack.kind === 'text'
			? needs_attention_text_column_keys
			: pack.kind === 'int'
				? needs_attention_int_column_keys
				: needs_attention_real_column_keys;
	for (const key of pack.keys) {
		target.add(key);
	}
}

const special_catalog_entries: needs_attention_field_catalog_entry[] = [
	{
		key: 'gps_either_missing',
		label: 'GPS latitude or longitude missing',
		group: 'Shortcuts'
	},
	{
		key: 'camera_body_incomplete',
		label: 'Camera make and model both empty',
		group: 'Shortcuts'
	},
	{
		key: 'lens_incomplete',
		label: 'Lens make and model both empty',
		group: 'Shortcuts'
	},
	{
		key: 'shot_date_calendar_missing',
		label: 'Shot date (original) not parseable to a calendar date',
		group: 'Shortcuts'
	},
	{
		key: 'exposure_both_missing',
		label: 'Exposure time missing (no seconds value and no text)',
		group: 'Shortcuts'
	}
];

function build_column_catalog_entries(): needs_attention_field_catalog_entry[] {
	const out: needs_attention_field_catalog_entry[] = [];
	for (const pack of column_packs) {
		for (const key of pack.keys) {
			out.push({ key, label: label_for_key(key), group: pack.group });
		}
	}
	return out;
}

/** UI + validation source of truth (sorted for stable Settings UI). */
export const needs_attention_catalog: needs_attention_field_catalog_entry[] = [
	...special_catalog_entries,
	...build_column_catalog_entries()
].sort((a, b) => {
	const group_cmp = a.group.localeCompare(b.group);
	if (group_cmp !== 0) return group_cmp;
	return a.label.localeCompare(b.label);
});

export const needs_attention_valid_key_set = new Set(
	needs_attention_catalog.map((entry) => entry.key)
);

export function filter_valid_needs_attention_field_keys(keys: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const key of keys) {
		if (typeof key !== 'string') continue;
		if (!needs_attention_valid_key_set.has(key)) continue;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(key);
	}
	return out;
}

export function legacy_dashboard_flags_to_field_keys(record: Record<string, unknown>): string[] {
	const bool = (v: unknown): boolean => v === true;
	const keys: string[] = [];
	if (bool(record.flag_gps)) keys.push('gps_either_missing');
	if (bool(record.flag_camera)) keys.push('camera_body_incomplete');
	if (bool(record.flag_lens)) keys.push('lens_incomplete');
	if (bool(record.flag_date)) keys.push('shot_date_calendar_missing');
	if (bool(record.flag_iso)) keys.push('iso_speed');
	if (bool(record.flag_f_number)) keys.push('f_number');
	if (bool(record.flag_focal_length)) keys.push('focal_length');
	if (bool(record.flag_exposure_time)) keys.push('exposure_both_missing');
	return keys;
}

function is_legacy_flag_object(parsed: unknown): parsed is Record<string, unknown> {
	if (parsed == null || typeof parsed !== 'object') return false;
	return 'flag_gps' in (parsed as object);
}

/**
 * Parse stored JSON from `app_setting`: new shape, legacy booleans, or defaults.
 */
export function parse_dashboard_needs_attention_stored_json(parsed: unknown): {
	required_field_keys: string[];
} {
	if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
		const o = parsed as Record<string, unknown>;
		if (Array.isArray(o.required_field_keys)) {
			const filtered = filter_valid_needs_attention_field_keys(o.required_field_keys as string[]);
			return { required_field_keys: filtered };
		}
		if (is_legacy_flag_object(parsed)) {
			return { required_field_keys: legacy_dashboard_flags_to_field_keys(parsed) };
		}
	}
	return { required_field_keys: [...dashboard_needs_attention_default_keys] };
}

/**
 * Normalize a settings PUT body: accepts `required_field_keys` or legacy `flag_*` object.
 */
export function normalize_dashboard_needs_attention_request_body(body: unknown): {
	required_field_keys: string[];
} {
	if (body == null || typeof body !== 'object' || Array.isArray(body)) {
		return { required_field_keys: [...dashboard_needs_attention_default_keys] };
	}
	const o = body as Record<string, unknown>;
	if (Array.isArray(o.required_field_keys)) {
		return {
			required_field_keys: filter_valid_needs_attention_field_keys(
				o.required_field_keys as string[]
			)
		};
	}
	if (is_legacy_flag_object(body)) {
		return { required_field_keys: legacy_dashboard_flags_to_field_keys(o) };
	}
	return { required_field_keys: [...dashboard_needs_attention_default_keys] };
}

export function needs_attention_label_for_key(key: string): string {
	const hit = needs_attention_catalog.find((e) => e.key === key);
	return hit?.label ?? humanize_column_key(key);
}

function trim_meta_str(value: unknown): string {
	if (value == null) return '';
	return String(value).trim();
}

function numeric_component_missing(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === 'number') return !Number.isFinite(value);
	if (typeof value === 'string' && value.trim() === '') return true;
	const n = Number(value);
	return !Number.isFinite(n);
}

/** Aligns with `sql_shot_calendar_date` / server shot-date rule. */
export function shot_calendar_date_from_exif(value: unknown): string | null {
	if (value == null) return null;
	const raw = String(value).trim();
	if (raw === '') return null;
	if (/^[0-9]{4}:[0-9]{2}:[0-9]{2}/.test(raw)) {
		return `${raw.slice(0, 4)}-${raw.slice(5, 7)}-${raw.slice(8, 10)}`;
	}
	if (raw.length >= 10 && raw[4] === '-') return raw.slice(0, 10);
	return null;
}

function column_value_missing_for_key(key: string, value: unknown): boolean {
	if (needs_attention_text_column_keys.has(key)) {
		return trim_meta_str(value) === '';
	}
	if (needs_attention_int_column_keys.has(key) || needs_attention_real_column_keys.has(key)) {
		return numeric_component_missing(value);
	}
	return false;
}

/**
 * Whether the detail/edit row for `display_key` should show the attention marker in Needs attention mode.
 */
export function needs_attention_issue_for_detail_key(
	row: Record<string, unknown>,
	display_key: string,
	required_keys: ReadonlySet<string>
): boolean {
	if (required_keys.has('gps_either_missing')) {
		if (display_key === 'gps_latitude' || display_key === 'gps_longitude') {
			const lat_missing = numeric_component_missing(row.gps_latitude);
			const lon_missing = numeric_component_missing(row.gps_longitude);
			if (lat_missing || lon_missing) return true;
		}
	}

	if (required_keys.has('camera_body_incomplete')) {
		if (display_key === 'make' || display_key === 'model') {
			if (trim_meta_str(row.make) === '' && trim_meta_str(row.model) === '') return true;
		}
	}

	if (required_keys.has('lens_incomplete')) {
		if (display_key === 'lens_make' || display_key === 'lens_model') {
			if (trim_meta_str(row.lens_make) === '' && trim_meta_str(row.lens_model) === '') return true;
		}
	}

	if (required_keys.has('shot_date_calendar_missing') && display_key === 'datetime_original') {
		if (shot_calendar_date_from_exif(row.datetime_original) == null) return true;
	}

	const exposure_seconds_missing = numeric_component_missing(row.exposure_time_seconds);
	const exposure_text_missing = trim_meta_str(row.exposure_time) === '';
	const exposure_both_missing = exposure_seconds_missing && exposure_text_missing;

	if (required_keys.has('exposure_both_missing')) {
		if (display_key === 'exposure_time_seconds' || display_key === 'exposure_time') {
			if (exposure_both_missing) return true;
		}
	}

	if (required_keys.has(display_key)) {
		return column_value_missing_for_key(display_key, row[display_key]);
	}

	return false;
}
