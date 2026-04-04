import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';

/** Raster + common camera RAW extensions (browsers may not render all RAW types in &lt;img&gt;). */
const media_extensions = new Set([
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp',
	'.avif',
	'.svg',
	'.bmp',
	'.tif',
	'.tiff',
	'.dng',
	'.cr2',
	'.cr3',
	'.nef',
	'.nrw',
	'.arw',
	'.raw',
	'.raf',
	'.orf',
	'.rw2',
	'.pef',
	'.srw',
	'.sr2',
	'.kdc',
	'.srf',
	'.3fr',
	'.fff',
	'.iiq',
	'.erf',
	'.mef',
	'.mos',
	'.x3f'
]);

/**
 * Absolute directory root for transformed / RAW media.
 * Set `TRANSFORMED_MEDIA_ROOT` (e.g. in Docker) to any absolute path; otherwise defaults to `static/transformed` under cwd.
 */
export function get_transformed_root_absolute_path(): string {
	const override = env.TRANSFORMED_MEDIA_ROOT?.trim();
	if (override) {
		return path.resolve(override);
	}
	return path.resolve(path.join(process.cwd(), 'static', 'transformed'));
}

/** Human-readable hint for UI (no path disclosure). */
export function get_transformed_source_description(): string {
	const override = env.TRANSFORMED_MEDIA_ROOT?.trim();
	return override ? 'TRANSFORMED_MEDIA_ROOT' : 'static/transformed (default)';
}

type media_file_entry = { relative_path: string; mtime_ms: number };

async function walk_media_files(
	dir: string,
	root: string,
	relative_segments: string[],
	out: media_file_entry[]
): Promise<void> {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;

		const full_path = path.join(dir, entry.name);
		const resolved = path.resolve(full_path);
		if (!resolved.startsWith(root + path.sep) && resolved !== root) continue;

		if (entry.isDirectory()) {
			await walk_media_files(full_path, root, [...relative_segments, entry.name], out);
		} else if (media_extensions.has(path.extname(entry.name).toLowerCase())) {
			const st = await fs.stat(full_path);
			const relative_path = [...relative_segments, entry.name].join('/');
			out.push({ relative_path, mtime_ms: st.mtimeMs });
		}
	}
}

/** Newest files first; paths use POSIX-style slashes relative to the transformed root. */
export async function list_transformed_media_paths(): Promise<string[]> {
	const root = path.resolve(get_transformed_root_absolute_path());
	const out: media_file_entry[] = [];
	await walk_media_files(root, root, [], out);
	out.sort((a, b) => {
		if (b.mtime_ms !== a.mtime_ms) return b.mtime_ms - a.mtime_ms;
		return a.relative_path.localeCompare(b.relative_path);
	});
	return out.map((e) => e.relative_path);
}
