/** Lowercase extensions (with dot) allowed for RAW / similar upload (kept in sync with server rules). */
export const raw_upload_extensions = new Set([
	'.tif',
	'.tiff',
	'.dng',
	'.cr2',
	'.cr3',
	'.nef',
	'.nrw',
	'.arw',
	'.raw',
	'.raf',
	'.orf',
	'.rw2',
	'.pef',
	'.srw',
	'.sr2',
	'.kdc',
	'.srf',
	'.3fr',
	'.fff',
	'.iiq',
	'.erf',
	'.mef',
	'.mos',
	'.x3f'
]);

export function is_allowed_raw_upload_extension(filename: string): boolean {
	const dot = filename.lastIndexOf('.');
	if (dot < 0) return false;
	return raw_upload_extensions.has(filename.slice(dot).toLowerCase());
}

/** API / server error text when the filename extension is not allowed. */
export const raw_upload_extension_rejected_message =
	'Unsupported extension. Only camera RAW formats (e.g. CR2, NEF, ARW, RAF), DNG, and TIFF are accepted — not JPEG or PNG.';
