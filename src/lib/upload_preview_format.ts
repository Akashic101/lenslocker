export const upload_preview_formats = ['jpeg', 'webp', 'avif', 'png'] as const;

export type upload_preview_format = (typeof upload_preview_formats)[number];

export function is_upload_preview_format(value: unknown): value is upload_preview_format {
	return typeof value === 'string' && (upload_preview_formats as readonly string[]).includes(value);
}

/** Filename suffix including dot (grid/modal previews on disk). */
export function upload_preview_format_file_ext(format: upload_preview_format): string {
	switch (format) {
		case 'jpeg':
			return '.jpg';
		case 'webp':
			return '.webp';
		case 'avif':
			return '.avif';
		case 'png':
			return '.png';
		default: {
			const _exhaustive: never = format;
			return _exhaustive;
		}
	}
}
