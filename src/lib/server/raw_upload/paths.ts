import path from 'node:path';
import { env } from '$env/dynamic/private';

/** Directory where uploaded RAW files are stored (absolute). Override with RAW_UPLOAD_ROOT in Docker. */
export function get_raw_upload_root(): string {
	const override = env.RAW_UPLOAD_ROOT?.trim();
	if (override) return path.resolve(override);
	return path.resolve(process.cwd(), 'data', 'uploads', 'raw');
}

type raw_upload_exif_date_fields = {
	datetime_original?: string | null;
	datetime_digitized?: string | null;
	datetime_created?: string | null;
};

function parse_exif_string_to_year_month(s: string): { year: string; month: string } | null {
	const trimmed = s.trim();
	if (trimmed === '') return null;
	const exif_style = trimmed.match(/^(\d{4}):(\d{2}):(\d{2})/);
	if (exif_style) {
		const year_n = Number(exif_style[1]);
		const month_n = Number(exif_style[2]);
		if (year_n >= 1970 && year_n <= 2100 && month_n >= 1 && month_n <= 12) {
			return { year: exif_style[1], month: exif_style[2] };
		}
		return null;
	}
	const iso_day = trimmed.match(/^(\d{4})-(\d{2})-\d{2}/);
	if (iso_day) {
		const year_n = Number(iso_day[1]);
		const month_n = Number(iso_day[2]);
		if (year_n >= 1970 && year_n <= 2100 && month_n >= 1 && month_n <= 12) {
			return { year: iso_day[1], month: iso_day[2] };
		}
	}
	return null;
}

/**
 * Subfolder names under the raw upload root: `YYYY` then `01`–`12`.
 * Prefers capture time from EXIF; otherwise uses the upload instant in local time.
 */
export function raw_upload_year_month_from_metadata(
	fields: raw_upload_exif_date_fields,
	uploaded_at_ms: number
): { year: string; month: string } {
	for (const s of [fields.datetime_original, fields.datetime_digitized, fields.datetime_created]) {
		if (typeof s !== 'string') continue;
		const parsed = parse_exif_string_to_year_month(s);
		if (parsed != null) return parsed;
	}
	const d = new Date(uploaded_at_ms);
	return {
		year: String(d.getFullYear()),
		month: String(d.getMonth() + 1).padStart(2, '0')
	};
}
