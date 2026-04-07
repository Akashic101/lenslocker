import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { upload_id_from_transformed_preview_path } from '$lib/server/gallery_upload_meta';
import {
	require_current_user_id,
	require_owned_raw_upload_row
} from '$lib/server/authz/current_user';
import { get_transformed_root_absolute_path } from '$lib/server/transformed';
import type { RequestHandler } from './$types';

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

function is_upload_preview_thumb(relative_path: string): boolean {
	return /(^|\/)upload-previews\/[^/]+_thumb\.(?:jpe?g|webp|avif|png)$/i.test(
		relative_path.replace(/\\/g, '/')
	);
}

function build_etag(size: number, mtime_ms: number): string {
	// Weak ETag: good enough for cache revalidation without reading file contents.
	return `W/"${size}-${Math.trunc(mtime_ms)}"`;
}

export const GET: RequestHandler = async (event) => {
	const { params, request } = event;
	const path_param = params.path;
	if (!path_param) error(404, 'Not found');

	let decoded_segments: string[];
	try {
		decoded_segments = path_param.split('/').map((segment) => decodeURIComponent(segment));
	} catch {
		error(400, 'Bad path');
	}

	const relative_path = decoded_segments.join('/');

	const relative_posix_path = decoded_segments.join('/');

	// If the request targets an upload preview (thumb/full), enforce ownership.
	const upload_id = upload_id_from_transformed_preview_path(relative_posix_path);
	if (upload_id != null) {
		const user_id = require_current_user_id(event);
		await require_owned_raw_upload_row({ raw_upload_id: upload_id, user_id });
	}

	const root = path.resolve(get_transformed_root_absolute_path());
	const absolute_file = path.resolve(root, ...decoded_segments);

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

	const etag = build_etag(file_stats.size, file_stats.mtimeMs);
	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				ETag: etag
			}
		});
	}

	const node_stream = createReadStream(absolute_file);
	const web_stream = Readable.toWeb(node_stream);

	const cache_control = is_upload_preview_thumb(relative_path)
		? // Thumbnails are derived and safe to cache aggressively.
			'public, max-age=31536000, immutable'
		: // Default for other transformed media.
			'public, max-age=300';

	return new Response(web_stream as ReadableStream<Uint8Array>, {
		headers: {
			'Content-Type': content_type_for_file(absolute_file),
			'Cache-Control': cache_control,
			ETag: etag,
			'Last-Modified': new Date(file_stats.mtimeMs).toUTCString()
		}
	});
};
