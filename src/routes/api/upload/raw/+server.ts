import { json } from '@sveltejs/kit';
import { process_single_raw_upload } from '$lib/server/services/gallery/process_single_raw_upload';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const entry = form.get('raw_file');

	if (!entry || !(entry instanceof File)) {
		return json(
			{ ok: false as const, message: 'Choose a RAW or image file to upload.' },
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
