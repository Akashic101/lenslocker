import path from 'node:path';
import { env } from '$env/dynamic/private';

/** Directory where uploaded RAW files are stored (absolute). Override with RAW_UPLOAD_ROOT in Docker. */
export function get_raw_upload_root(): string {
	const override = env.RAW_UPLOAD_ROOT?.trim();
	if (override) return path.resolve(override);
	return path.resolve(process.cwd(), 'data', 'uploads', 'raw');
}
