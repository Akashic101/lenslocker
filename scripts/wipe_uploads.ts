/**
 * Deletes all uploaded RAW files, upload-previews JPEGs (thumb + full), and `raw_image_upload` rows.
 * Requires `--yes` to run (safety).
 *
 * Uses env like the app: DATABASE_URL, optional RAW_UPLOAD_ROOT, TRANSFORMED_MEDIA_ROOT.
 * Bun loads `.env` from the project root automatically.
 */
import { Database } from 'bun:sqlite';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

if (!process.argv.includes('--yes')) {
	console.error('Refusing to wipe: pass --yes to confirm (this deletes files and DB rows).');
	console.error('Example: bun run wipe:uploads -- --yes');
	process.exit(1);
}

const database_url = process.env.DATABASE_URL;
if (database_url == null || database_url.trim() === '') {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

function raw_upload_root_absolute(): string {
	const override = process.env.RAW_UPLOAD_ROOT?.trim();
	if (override) return path.resolve(override);
	return path.resolve(process.cwd(), 'data', 'uploads', 'raw');
}

function transformed_root_absolute(): string {
	const override = process.env.TRANSFORMED_MEDIA_ROOT?.trim();
	if (override) return path.resolve(override);
	return path.resolve(process.cwd(), 'static', 'transformed');
}

const raw_root = raw_upload_root_absolute();
const upload_previews_dir = path.join(transformed_root_absolute(), 'upload-previews');

console.log('Wiping raw uploads under:', raw_root);
console.log('Removing:', upload_previews_dir);
console.log('SQLite:', database_url);

await rm(raw_root, { recursive: true, force: true });
await mkdir(raw_root, { recursive: true });

await rm(upload_previews_dir, { recursive: true, force: true });

const sqlite = new Database(database_url, { strict: true });
const delete_result = sqlite.run('DELETE FROM raw_image_upload');
sqlite.run('VACUUM');
sqlite.close();

console.log('Done. raw_image_upload rows deleted:', delete_result.changes);
