import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import {
	require_current_user_id,
	require_owned_raw_upload_row
} from '$lib/server/authz/current_user';
import { get_transformed_root_absolute_path } from '$lib/server/transformed';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import { resolve_upload_preview_full_relative_path } from '$lib/server/raw_upload/write_preview_jpeg';
import type { RequestHandler } from './$types';

const content_type_by_extension: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif'
};

function content_type_for_file(file_path: string): string {
	const ext = path.extname(file_path).toLowerCase();
	return content_type_by_extension[ext] ?? 'application/octet-stream';
}

function build_etag(size: number, mtime_ms: number): string {
	return `W/"${size}-${Math.trunc(mtime_ms)}"`;
}

export const GET: RequestHandler = async (event) => {
	const upload_id = event.params.upload_id;
	if (!upload_id) error(404, 'Not found');

	const user_id = require_current_user_id(event);
	await require_owned_raw_upload_row({ raw_upload_id: upload_id, user_id });

	const pipeline_settings = await get_upload_preview_pipeline_settings(user_id);
	const rel = await resolve_upload_preview_full_relative_path(
		upload_id,
		pipeline_settings.upload_preview_format
	);
	if (rel == null) error(404, 'Not found');

	const root = path.resolve(get_transformed_root_absolute_path());
	const absolute_file = path.resolve(root, ...rel.split(path.posix.sep));
	if (absolute_file !== root && !absolute_file.startsWith(root + path.sep)) {
		error(403, 'Forbidden');
	}

	const file_stats = await stat(absolute_file).catch((e: unknown) => {
		const err = e as NodeJS.ErrnoException;
		if (err.code === 'ENOENT') error(404, 'Not found');
		throw e;
	});
	if (!file_stats.isFile()) error(404, 'Not found');

	const etag = build_etag(file_stats.size, file_stats.mtimeMs);
	if (event.request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers: { ETag: etag } });
	}

	const node_stream = createReadStream(absolute_file);
	const web_stream = Readable.toWeb(node_stream);

	return new Response(web_stream as ReadableStream<Uint8Array>, {
		headers: {
			'Content-Type': content_type_for_file(absolute_file),
			'Cache-Control': 'private, max-age=86400',
			ETag: etag,
			'Last-Modified': new Date(file_stats.mtimeMs).toUTCString()
		}
	});
};
