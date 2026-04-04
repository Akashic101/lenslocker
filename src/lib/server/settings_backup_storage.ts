import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { env } from '$env/dynamic/private';

/** Absolute directory for LensLocker settings backup zips. */
export function get_settings_backup_root(): string {
	const override = env.LENSLOCKER_BACKUP_ROOT?.trim();
	if (override) return path.resolve(override);
	return path.resolve(process.cwd(), 'data', 'backups');
}

export async function ensure_settings_backup_root(): Promise<string> {
	const dir = get_settings_backup_root();
	await mkdir(dir, { recursive: true });
	return dir;
}
