/** Grid listing: `upload-previews/<uuid>_thumb.jpg`. */
const upload_preview_thumb_pattern =
	/^upload-previews\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_thumb\.jpe?g$/i;

export function upload_id_from_gallery_preview_path(relative_posix_path: string): string | null {
	const thumb_match = relative_posix_path.match(upload_preview_thumb_pattern);
	return thumb_match?.[1] ?? null;
}

export type gallery_upload_meta_input = {
	make: string | null;
	model: string | null;
	lens_make: string | null;
	lens_model: string | null;
	image_width: number | null;
	image_height: number | null;
	pixel_x_dimension: number | null;
	pixel_y_dimension: number | null;
	x_resolution: string | null;
	y_resolution: string | null;
	resolution_unit: number | null;
	datetime_original: string | null;
	byte_size: number | null;
	iso_speed: number | null;
	exposure_time_seconds: number | null;
	exposure_time: string | null;
	f_number: number | null;
};

export type gallery_meta_row = { key: gallery_meta_row_key; text: string };

export type gallery_meta_row_key =
	| 'camera'
	| 'lens'
	| 'dimensions'
	| 'datetime'
	| 'resolution'
	| 'file_size'
	| 'exposure';

function format_bytes_human(byte_size: number): string {
	if (byte_size < 1024) return `${byte_size} B`;
	if (byte_size < 1024 ** 2) return `${(byte_size / 1024).toFixed(1)} KB`;
	if (byte_size < 1024 ** 3) return `${(byte_size / 1024 ** 2).toFixed(1)} MB`;
	return `${(byte_size / 1024 ** 3).toFixed(2)} GB`;
}

/** Sub-second → `1/500`; ≥1 s → `2 s`. */
function shutter_label_from_seconds(seconds: number): string | null {
	if (!Number.isFinite(seconds) || seconds <= 0) return null;
	if (seconds >= 1) {
		const rounded = Number.isInteger(seconds)
			? String(seconds)
			: seconds.toFixed(1).replace(/\.0$/, '');
		return `${rounded} s`;
	}
	const denominator = Math.max(1, Math.round(1 / seconds));
	return `1/${denominator}`;
}

function format_shutter_fragment(
	exposure_time: string | null,
	exposure_time_seconds: number | null
): string | null {
	const trim = exposure_time?.trim() ?? '';
	if (trim !== '') {
		const without_suffix = trim.replace(/\s*(?:s|sec(?:ond)?s?)\.?$/i, '').trim();
		const fraction_match = without_suffix.match(/^(\d+)\s*\/\s*(\d+)/);
		if (fraction_match) return `${fraction_match[1]}/${fraction_match[2]}`;

		const as_number = Number.parseFloat(without_suffix.replace(/,/g, '.'));
		if (!Number.isNaN(as_number) && as_number > 0) {
			return shutter_label_from_seconds(as_number);
		}
		return trim;
	}

	if (exposure_time_seconds != null && Number.isFinite(exposure_time_seconds)) {
		return shutter_label_from_seconds(exposure_time_seconds);
	}
	return null;
}

function format_aperture_fragment(f_number: number | null): string | null {
	if (f_number == null || !Number.isFinite(f_number)) return null;
	const text = f_number >= 10 ? f_number.toFixed(1) : String(f_number);
	return `f/${text}`;
}

function format_resolution_line(
	x_resolution: string | null,
	y_resolution: string | null,
	resolution_unit: number | null
): string | null {
	if (
		(x_resolution == null || x_resolution === '') &&
		(y_resolution == null || y_resolution === '')
	) {
		return null;
	}
	const x = x_resolution && x_resolution !== '' ? x_resolution : '?';
	const y = y_resolution && y_resolution !== '' ? y_resolution : '?';
	const unit_label =
		resolution_unit === 2
			? 'dpi'
			: resolution_unit === 3
				? 'px/cm'
				: resolution_unit === 1
					? ''
					: '';
	const suffix = unit_label ? ` ${unit_label}` : '';
	return `${x} × ${y}${suffix}`.trim();
}

function format_shot_at_line(iso_datetime: string | null): string | null {
	if (iso_datetime == null || iso_datetime === '') return null;
	const date = new Date(iso_datetime);
	if (Number.isNaN(date.getTime())) return iso_datetime;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(date);
}

/** Build caption rows for an uploaded image (DB row). Omits empty fields. */
export function build_gallery_meta_rows(row: gallery_upload_meta_input): gallery_meta_row[] {
	const rows: gallery_meta_row[] = [];

	const camera = [row.make, row.model]
		.filter((s) => s != null && String(s).trim() !== '')
		.join(' ');
	if (camera !== '') rows.push({ key: 'camera', text: camera });

	const lens = [row.lens_make, row.lens_model]
		.filter((s) => s != null && String(s).trim() !== '')
		.join(' ');
	if (lens !== '') rows.push({ key: 'lens', text: lens });

	const w = row.image_width ?? row.pixel_x_dimension;
	const h = row.image_height ?? row.pixel_y_dimension;
	if (w != null && h != null && Number.isFinite(w) && Number.isFinite(h)) {
		rows.push({ key: 'dimensions', text: `${Math.round(w)} × ${Math.round(h)} px` });
	}

	const shot = format_shot_at_line(row.datetime_original);
	if (shot != null) rows.push({ key: 'datetime', text: shot });

	const resolution = format_resolution_line(
		row.x_resolution,
		row.y_resolution,
		row.resolution_unit
	);
	if (resolution != null) rows.push({ key: 'resolution', text: resolution });

	if (row.byte_size != null && Number.isFinite(row.byte_size) && row.byte_size > 0) {
		rows.push({ key: 'file_size', text: format_bytes_human(row.byte_size) });
	}

	const shutter = format_shutter_fragment(row.exposure_time, row.exposure_time_seconds);
	const aperture = format_aperture_fragment(row.f_number);
	const iso =
		row.iso_speed != null && Number.isFinite(row.iso_speed)
			? `ISO ${Math.round(row.iso_speed)}`
			: null;
	const exposure_parts = [shutter, aperture, iso].filter((p): p is string => p != null && p !== '');
	if (exposure_parts.length > 0) {
		rows.push({ key: 'exposure', text: exposure_parts.join(' · ') });
	}

	return rows;
}
