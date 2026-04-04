import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
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

export const GET: RequestHandler = async ({ params }) => {
	const path_param = params.path;
	if (!path_param) error(404, 'Not found');

	let decoded_segments: string[];
	try {
		decoded_segments = path_param.split('/').map((segment) => decodeURIComponent(segment));
	} catch {
		error(400, 'Bad path');
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

	const node_stream = createReadStream(absolute_file);
	const web_stream = Readable.toWeb(node_stream);

	return new Response(web_stream as ReadableStream<Uint8Array>, {
		headers: {
			'Content-Type': content_type_for_file(absolute_file),
			'Cache-Control': 'public, max-age=300'
		}
	});
};
