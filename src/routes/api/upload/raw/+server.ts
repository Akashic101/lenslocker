import { json } from '@sveltejs/kit';
import {
	is_allowed_raw_upload_extension,
	raw_upload_extension_rejected_message
} from '$lib/gallery/raw_upload_extensions';
import { process_single_raw_upload } from '$lib/server/services/gallery/process_single_raw_upload';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const entry = form.get('raw_file');

	if (!entry || !(entry instanceof File)) {
		return json(
			{ ok: false as const, message: 'Choose a camera RAW, DNG, or TIFF file to upload.' },
			{ status: 400 }
		);
	}

	if (!is_allowed_raw_upload_extension(entry.name)) {
		return json(
			{ ok: false as const, message: raw_upload_extension_rejected_message },
			{ status: 400 }
		);
	}

	const buffer = await entry.arrayBuffer();
	const result = await process_single_raw_upload({
		original_filename: entry.name,
		byte_size: entry.size,
		mime_type: entry.type || null,
		buffer
	});

	if (!result.ok) {
		const too_large = result.message.includes('too large');
		return json(result, { status: too_large ? 413 : 400 });
	}

	return json(result);
};
