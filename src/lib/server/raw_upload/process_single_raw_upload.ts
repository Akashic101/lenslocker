import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '$lib/server/db';
import { get_upload_preview_pipeline_settings } from '$lib/server/upload_pipeline_settings';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import { is_allowed_raw_upload_extension } from '$lib/raw_upload_extensions';
import { build_metadata_fields } from '$lib/server/raw_upload/metadata_from_exifr';
import { get_raw_upload_root } from '$lib/server/raw_upload/paths';
import { write_preview_jpeg_for_upload } from '$lib/server/raw_upload/write_preview_jpeg';

export type process_raw_upload_input = {
	original_filename: string;
	byte_size: number;
	mime_type: string | null;
	buffer: ArrayBuffer;
};

export type process_raw_upload_ok = {
	ok: true;
	id: string;
	original_filename: string;
	preview_ok: boolean;
	preview_message?: string;
};

export type process_raw_upload_err = {
	ok: false;
	message: string;
};

export type process_raw_upload_result = process_raw_upload_ok | process_raw_upload_err;

/**
 * Store one RAW/image file, persist EXIF metadata to SQLite, and generate JPEG previews.
 * Shared by the legacy form action and the JSON API for batch uploads.
 */
function format_max_upload_label(max_bytes: number): string {
	const mb = max_bytes / (1024 * 1024);
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	if (Number.isInteger(mb)) return `${mb} MB`;
	return `${mb.toFixed(1)} MB`;
}

export async function process_single_raw_upload(
	input: process_raw_upload_input
): Promise<process_raw_upload_result> {
	const pipeline = await get_upload_preview_pipeline_settings();

	if (input.byte_size === 0) {
		return { ok: false, message: 'The file is empty.' };
	}

	if (input.byte_size > pipeline.max_upload_bytes) {
		return {
			ok: false,
			message: `File is too large (max ${format_max_upload_label(pipeline.max_upload_bytes)}).`
		};
	}

	if (!is_allowed_raw_upload_extension(input.original_filename)) {
		return {
			ok: false,
			message:
				'Unsupported extension. Use a camera RAW type or common image format (JPEG, TIFF, DNG, …).'
		};
	}

	const buffer = input.buffer;
	const sha256_hex = createHash('sha256').update(new Uint8Array(buffer)).digest('hex');

	const id = randomUUID();
	const ext = path.extname(input.original_filename) || '.bin';
	const stored_filename = `${id}${ext}`;
	const root = get_raw_upload_root();
	await mkdir(root, { recursive: true });
	const absolute_path = path.join(root, stored_filename);
	await writeFile(absolute_path, new Uint8Array(buffer));

	const relative_storage_path = path
		.join('data', 'uploads', 'raw', stored_filename)
		.split(path.sep)
		.join('/');
	const uploaded_at_ms = Date.now();

	const metadata = await build_metadata_fields(buffer);

	const row = {
		id,
		original_filename: input.original_filename,
		stored_filename,
		relative_storage_path,
		byte_size: input.byte_size,
		mime_type: input.mime_type,
		sha256_hex,
		uploaded_at_ms,
		...metadata
	};
	const cleaned = Object.fromEntries(
		Object.entries(row).filter(([, v]) => v !== undefined)
	) as typeof row;

	try {
		await db.insert(raw_image_upload).values(cleaned);
	} catch (e) {
		console.error(e);
		return {
			ok: false,
			message: 'Could not save metadata. Is the database migrated? Run: bun run db:push'
		};
	}

	const preview = await write_preview_jpeg_for_upload(
		id,
		new Uint8Array(buffer),
		input.original_filename,
		{
			source_absolute_path: absolute_path,
			exif_orientation: metadata.orientation ?? null,
			pipeline
		}
	);

	if (!preview.ok) {
		console.error(
			'[upload] preview not created:',
			'upload_id=',
			id,
			'file=',
			input.original_filename,
			'size=',
			input.byte_size,
			'reason=',
			preview.message
		);
	}

	return {
		ok: true,
		id,
		original_filename: input.original_filename,
		preview_ok: preview.ok,
		preview_message: preview.ok ? undefined : preview.message
	};
}
