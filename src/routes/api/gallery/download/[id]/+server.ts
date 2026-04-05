import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { resolve_upload_preview_full_relative_path } from '$lib/server/raw_upload/write_preview_jpeg';
import { get_raw_upload_root } from '$lib/server/raw_upload/paths';
import { select_raw_upload_row_by_id } from '$lib/server/services/gallery/gallery_service';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import { get_transformed_root_absolute_path } from '$lib/server/transformed';
import type { RequestHandler } from './$types';

const uuid_re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const content_type_by_extension: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.svg': 'image/svg+xml',
	'.bmp': 'image/bmp',
	'.tif': 'image/tiff',
	'.tiff': 'image/tiff',
	'.dng': 'image/dng'
};

function content_type_for_file(file_path: string): string {
	const ext = path.extname(file_path).toLowerCase();
	return content_type_by_extension[ext] ?? 'application/octet-stream';
}

/** ASCII-only `filename="..."` for Content-Disposition. */
function safe_content_disposition_filename(name: string): string {
	const trimmed = name.trim() || 'download';
	return trimmed
		.replace(/[\r\n"]/g, '_')
		.replace(/[^\x20-\x7E]/g, '_')
		.slice(0, 200);
}

function preview_download_basename(row: { original_filename: string }, rel_full: string): string {
	const preview_ext = path.extname(rel_full).toLowerCase() || '.jpg';
	const stem = path.basename(row.original_filename, path.extname(row.original_filename));
	const safe_stem = safe_content_disposition_filename(stem);
	return `${safe_stem || 'photo'}_preview${preview_ext}`;
}

export const GET: RequestHandler = async ({ params, url }) => {
	const id = params.id;
	if (id == null || !uuid_re.test(id)) error(400, 'Invalid id');

	const kind_raw = url.searchParams.get('kind')?.trim().toLowerCase() ?? '';
	if (kind_raw !== 'preview' && kind_raw !== 'raw') {
		error(400, 'kind must be preview or raw');
	}

	const row = await select_raw_upload_row_by_id(id);
	if (!row) error(404, 'Not found');

	if (kind_raw === 'raw') {
		const root = path.resolve(get_raw_upload_root());
		/** Matches `process_single_raw_upload`: posix path under cwd, not under `get_raw_upload_root()`. */
		const raw_path_db_prefix = 'data/uploads/raw/';
		let rel = row.relative_storage_path.replace(/\\/g, '/');
		if (rel === '' || rel.includes('..')) error(400, 'Invalid storage path');
		if (rel.startsWith(raw_path_db_prefix)) {
			rel = rel.slice(raw_path_db_prefix.length);
		}
		const segments = rel.split('/').filter((s) => s.length > 0);
		if (segments.length === 0) error(400, 'Invalid storage path');
		const absolute_file = path.resolve(root, ...segments);
		if (absolute_file !== root && !absolute_file.startsWith(root + path.sep)) {
			error(403, 'Forbidden');
		}

		let file_stats;
		try {
			file_stats = await stat(absolute_file);
		} catch (e) {
			const err = e as NodeJS.ErrnoException;
			if (err.code === 'ENOENT') error(404, 'Not found');
			throw e;
		}
		if (!file_stats.isFile()) error(404, 'Not found');

		const download_name = safe_content_disposition_filename(row.original_filename);
		const node_stream = createReadStream(absolute_file);
		const web_stream = Readable.toWeb(node_stream);

		return new Response(web_stream as ReadableStream<Uint8Array>, {
			headers: {
				'Content-Type': content_type_for_file(absolute_file),
				'Content-Disposition': `attachment; filename="${download_name}"`,
				'Cache-Control': 'private, no-store'
			}
		});
	}

	const pipeline = await get_upload_preview_pipeline_settings();
	const rel_full = await resolve_upload_preview_full_relative_path(
		id,
		pipeline.upload_preview_format
	);
	if (rel_full == null) error(404, 'Preview not found');

	const transformed_root = path.resolve(get_transformed_root_absolute_path());
	const absolute_file = path.resolve(transformed_root, ...rel_full.split(path.posix.sep));
	if (
		absolute_file !== transformed_root &&
		!absolute_file.startsWith(transformed_root + path.sep)
	) {
		error(403, 'Forbidden');
	}

	let file_stats;
	try {
		file_stats = await stat(absolute_file);
	} catch (e) {
		const err = e as NodeJS.ErrnoException;
		if (err.code === 'ENOENT') error(404, 'Not found');
		throw e;
	}
	if (!file_stats.isFile()) error(404, 'Not found');

	const download_name = preview_download_basename(row, rel_full);
	const node_stream = createReadStream(absolute_file);
	const web_stream = Readable.toWeb(node_stream);

	return new Response(web_stream as ReadableStream<Uint8Array>, {
		headers: {
			'Content-Type': content_type_for_file(absolute_file),
			'Content-Disposition': `attachment; filename="${download_name}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
