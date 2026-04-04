import { sql } from 'drizzle-orm';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';

/**
 * SQLite expression: calendar date as `YYYY-MM-DD` for range filters, or NULL if unknown.
 * Handles EXIF `YYYY:MM:DD …` and ISO-like `YYYY-MM-DD…` prefixes.
 */
export function sql_shot_calendar_date() {
	const col = raw_image_upload.datetime_original;
	return sql<string>`(
		CASE
			WHEN ${col} IS NULL OR trim(${col}) = '' THEN NULL
			WHEN trim(${col}) GLOB '[0-9][0-9][0-9][0-9]:[0-9][0-9]:[0-9][0-9]*' THEN
				substr(trim(${col}), 1, 4) || '-' || substr(trim(${col}), 6, 2) || '-' || substr(trim(${col}), 9, 2)
			WHEN length(trim(${col})) >= 10 AND substr(trim(${col}), 5, 1) = '-' THEN substr(trim(${col}), 1, 10)
			ELSE NULL
		END
	)`;
}
