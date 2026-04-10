import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { is_allowed_raw_upload_extension } from '$lib/gallery/raw_upload_extensions';
import { get_raw_import_root } from '$lib/server/raw_upload/paths';

async function walk_raw_candidate_files(dir: string, out: string[]): Promise<void> {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const ent of entries) {
		if (ent.name.startsWith('.')) continue;
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			await walk_raw_candidate_files(full, out);
		} else if (ent.isFile() && is_allowed_raw_upload_extension(ent.name)) {
			out.push(full);
		}
	}
}

/** Absolute paths under {@link get_raw_import_root}, sorted, allowed extensions only. */
export async function list_absolute_raw_candidates_under_import_root(): Promise<string[]> {
	const root = path.resolve(get_raw_import_root());
	const acc: string[] = [];
	try {
		await walk_raw_candidate_files(root, acc);
	} catch (e: unknown) {
		const code =
			e !== null && typeof e === 'object' && 'code' in e
				? String((e as { code: unknown }).code)
				: '';
		if (code === 'ENOENT') return [];
		throw e;
	}
	return acc.sort((a, b) => a.localeCompare(b));
}

export function raw_upload_file_to_relative_posix(absolute_path: string, root: string): string {
	const rel = path.relative(root, absolute_path);
	return rel.split(path.sep).join('/');
}

/**
 * Resolves a relative path (forward slashes) under a resolved root directory.
 * Rejects `..` and paths that escape the root.
 */
export function resolve_relative_posix_under_root(
	relative_posix: string,
	root_resolved: string
): string | null {
	if (relative_posix.includes('\0')) return null;
	const segments = relative_posix.split('/').filter((s) => s !== '' && s !== '.');
	if (segments.some((s) => s === '..')) return null;
	const root = path.resolve(root_resolved);
	const abs = path.resolve(root, ...segments);
	const prefix = root.endsWith(path.sep) ? root : root + path.sep;
	if (abs !== root && !abs.startsWith(prefix)) return null;
	return abs;
}

/**
 * Resolves a relative path (forward slashes) under the configured RAW **import** inbox.
 * Rejects `..` and paths that escape the root.
 */
export function resolve_relative_posix_under_import_root(relative_posix: string): string | null {
	return resolve_relative_posix_under_root(relative_posix, path.resolve(get_raw_import_root()));
}
