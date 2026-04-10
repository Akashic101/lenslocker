import { json } from '@sveltejs/kit';
import path from 'node:path';
import {
	list_absolute_raw_candidates_under_import_root,
	raw_upload_file_to_relative_posix,
	resolve_relative_posix_under_import_root
} from '$lib/server/raw_upload/disk_import_paths';
import { get_raw_import_root } from '$lib/server/raw_upload/paths';
import {
	process_raw_file_from_disk,
	type process_raw_upload_result
} from '$lib/server/services/gallery/process_single_raw_upload';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const root = path.resolve(get_raw_import_root());
	const abs_list = await list_absolute_raw_candidates_under_import_root();
	const paths = abs_list.map((a) => raw_upload_file_to_relative_posix(a, root));
	return json({ ok: true as const, paths });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as { relative_path?: unknown } | null;
	const relative_path = typeof body?.relative_path === 'string' ? body.relative_path.trim() : '';
	if (relative_path === '') {
		return json({ ok: false as const, message: 'relative_path is required.' }, { status: 400 });
	}

	const abs = resolve_relative_posix_under_import_root(relative_path);
	if (abs == null) {
		return json({ ok: false as const, message: 'Invalid path.' }, { status: 400 });
	}

	const result: process_raw_upload_result = await process_raw_file_from_disk(abs);
	if (!result.ok) {
		const too_large = result.message.includes('too large');
		return json(result, { status: too_large ? 413 : 400 });
	}
	return json(result);
};
