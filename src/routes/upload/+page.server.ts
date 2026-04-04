import { fail, redirect } from '@sveltejs/kit';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '$lib/server/db';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import { is_allowed_raw_upload_extension } from '$lib/server/raw_upload/constants';
import { build_metadata_fields } from '$lib/server/raw_upload/metadata_from_exifr';
import { get_raw_upload_root } from '$lib/server/raw_upload/paths';
import { write_preview_jpeg_for_upload } from '$lib/server/raw_upload/write_preview_jpeg';
import type { Actions, PageServerLoad } from './$types';

const max_upload_bytes = 512 * 1024 * 1024;

export const load: PageServerLoad = async ({ url }) => ({
	just_uploaded: url.searchParams.get('uploaded') === '1'
});

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const entry = form.get('raw_file');

		if (!entry || !(entry instanceof File)) {
			return fail(400, { message: 'Choose a RAW or image file to upload.' });
		}

		if (entry.size === 0) {
			return fail(400, { message: 'The file is empty.' });
		}

		if (entry.size > max_upload_bytes) {
			return fail(400, { message: 'File is too large (max 512 MB).' });
		}

		if (!is_allowed_raw_upload_extension(entry.name)) {
			return fail(400, {
				message:
					'Unsupported extension. Use a camera RAW type or common image format (JPEG, TIFF, DNG, …).'
			});
		}

		const buffer = await entry.arrayBuffer();
		const sha256_hex = createHash('sha256').update(new Uint8Array(buffer)).digest('hex');

		const id = randomUUID();
		const ext = path.extname(entry.name) || '.bin';
		const stored_filename = `${id}${ext}`;
		const root = get_raw_upload_root();
		await mkdir(root, { recursive: true });
		const absolute_path = path.join(root, stored_filename);
		await writeFile(absolute_path, new Uint8Array(buffer));

		const relative_storage_path = path.join('data', 'uploads', 'raw', stored_filename).split(path.sep).join('/');
		const uploaded_at_ms = Date.now();
		const mime_type = entry.type || null;

		const metadata = await build_metadata_fields(buffer);

		const row = {
			id,
			original_filename: entry.name,
			stored_filename,
			relative_storage_path,
			byte_size: entry.size,
			mime_type,
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
			return fail(500, { message: 'Could not save metadata. Is the database migrated? Run: bun run db:push' });
		}

		const preview = await write_preview_jpeg_for_upload(id, new Uint8Array(buffer));
		if (!preview.ok) {
			console.warn('JPEG preview not created for upload', id, preview.message);
		}

		throw redirect(303, '/upload?uploaded=1');
	}
};
