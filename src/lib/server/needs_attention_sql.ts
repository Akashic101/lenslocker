import { and, isNull, or, sql, type SQL } from 'drizzle-orm';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import {
	filter_valid_needs_attention_field_keys,
	needs_attention_int_column_keys,
	needs_attention_real_column_keys,
	needs_attention_text_column_keys
} from '$lib/gallery/needs_attention_catalog';

function column_ref(key: string) {
	const col = raw_image_upload[key as keyof typeof raw_image_upload];
	if (col == null) {
		throw new Error(`needs_attention_sql: unknown column ${key}`);
	}
	return col;
}

function sql_fragment_for_key(field_key: string, shot_calendar_date_sql: SQL): SQL | null {
	switch (field_key) {
		case 'gps_either_missing':
			return or(isNull(raw_image_upload.gps_latitude), isNull(raw_image_upload.gps_longitude))!;
		case 'camera_body_incomplete':
			return and(
				sql`trim(coalesce(${raw_image_upload.make}, '')) = ''`,
				sql`trim(coalesce(${raw_image_upload.model}, '')) = ''`
			)!;
		case 'lens_incomplete':
			return and(
				sql`trim(coalesce(${raw_image_upload.lens_make}, '')) = ''`,
				sql`trim(coalesce(${raw_image_upload.lens_model}, '')) = ''`
			)!;
		case 'shot_date_calendar_missing':
			return sql`${shot_calendar_date_sql} IS NULL`;
		case 'exposure_both_missing':
			return and(
				isNull(raw_image_upload.exposure_time_seconds),
				sql`trim(coalesce(${raw_image_upload.exposure_time}, '')) = ''`
			)!;
		default:
			break;
	}

	if (needs_attention_text_column_keys.has(field_key)) {
		const col = column_ref(field_key);
		return sql`trim(coalesce(${col}, '')) = ''`;
	}
	if (
		needs_attention_int_column_keys.has(field_key) ||
		needs_attention_real_column_keys.has(field_key)
	) {
		const col = column_ref(field_key);
		return sql`${col} IS NULL`;
	}
	return null;
}

/**
 * OR of “missing” conditions for each selected key. Empty selection → always false.
 */
export function build_needs_attention_where_sql(
	field_keys: readonly string[],
	shot_calendar_date_sql: SQL
): SQL {
	const keys = filter_valid_needs_attention_field_keys([...field_keys]);
	const parts: SQL[] = [];
	for (const key of keys) {
		const fragment = sql_fragment_for_key(key, shot_calendar_date_sql);
		if (fragment != null) parts.push(fragment);
	}
	if (parts.length === 0) return sql`1 = 0`;
	if (parts.length === 1) return parts[0]!;
	return or(...parts)!;
}
