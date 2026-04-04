import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

function database_url_is_file_path(url: string): boolean {
	return url !== ':memory:' && !url.startsWith('file::memory:');
}

function resolve_database_path(url: string): string {
	if (path.isAbsolute(url)) return url;
	return path.resolve(process.cwd(), url);
}

let sqlite_client = new Database(env.DATABASE_URL);
export let db = drizzle(sqlite_client, { schema });

/** Serialized SQLite file (magic `SQLite format 3`) for backup zips. Not for in-memory DBs. */
export function capture_sqlite_database_for_backup_zip(): Buffer {
	if (!database_url_is_file_path(env.DATABASE_URL!)) {
		throw new Error('Cannot snapshot an in-memory SQLite database into a backup zip');
	}
	return sqlite_client.serialize();
}

function remove_sqlite_sidecar_files(db_path: string): void {
	for (const suffix of ['-wal', '-shm', '-journal']) {
		try {
			fs.unlinkSync(db_path + suffix);
		} catch {
			/* absent */
		}
	}
}

/**
 * Replaces the on-disk database file and reconnects. The `db` import stays a live binding to the new
 * Drizzle instance.
 */
export function replace_sqlite_database_from_backup_buffer(file_buffer: Buffer): void {
	if (!database_url_is_file_path(env.DATABASE_URL!)) {
		throw new Error('Cannot restore into an in-memory SQLite database');
	}
	const header = file_buffer.subarray(0, 16).toString('utf8');
	if (!header.startsWith('SQLite format 3')) {
		throw new Error('database.sqlite in the zip is not a valid SQLite file');
	}
	const db_path = resolve_database_path(env.DATABASE_URL!);
	sqlite_client.close();
	try {
		remove_sqlite_sidecar_files(db_path);
		fs.writeFileSync(db_path, file_buffer);
	} catch (e) {
		sqlite_client = new Database(env.DATABASE_URL);
		db = drizzle(sqlite_client, { schema });
		throw e;
	}
	sqlite_client = new Database(env.DATABASE_URL);
	db = drizzle(sqlite_client, { schema });
}
