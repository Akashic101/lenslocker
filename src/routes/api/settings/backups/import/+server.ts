import { json } from '@sveltejs/kit';
import { import_settings_backup_from_zip_buffer } from '$lib/server/services/settings/settings_backup_service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const content_type = request.headers.get('content-type') ?? '';
	if (!content_type.includes('multipart/form-data')) {
		return json({ message: 'Expected multipart form data with a file field.' }, { status: 400 });
	}
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return json({ message: 'Missing file field.' }, { status: 400 });
	}
	if (file.size === 0) {
		return json({ message: 'Empty file.' }, { status: 400 });
	}
	try {
		const buf = Buffer.from(await file.arrayBuffer());
		const result = await import_settings_backup_from_zip_buffer(buf);
		return json(result);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return json({ message }, { status: 400 });
	}
};
