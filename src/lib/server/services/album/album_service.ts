import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { album, album_raw_upload } from '$lib/server/db/album.schema';

const uuid_re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function is_album_id_format(value: string): boolean {
	return uuid_re.test(value.trim());
}

export type album_summary_row = {
	id: string;
	name: string;
	created_at_ms: number;
	image_count: number;
};

export async function list_album_summaries(user_id: string): Promise<album_summary_row[]> {
	const rows = await db
		.select({
			id: album.id,
			name: album.name,
			created_at_ms: album.created_at_ms,
			image_count: sql<number>`count(${album_raw_upload.raw_upload_id})`.mapWith(Number)
		})
		.from(album)
		.leftJoin(album_raw_upload, eq(album_raw_upload.album_id, album.id))
		.where(eq(album.user_id, user_id))
		.groupBy(album.id)
		.orderBy(album.name);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		created_at_ms: r.created_at_ms,
		image_count: Number.isFinite(r.image_count) ? r.image_count : 0
	}));
}

export async function get_album_by_id(album_id: string, user_id: string) {
	const [row] = await db
		.select()
		.from(album)
		.where(and(eq(album.id, album_id), eq(album.user_id, user_id)))
		.limit(1);
	return row ?? null;
}

export async function create_album(user_id: string, name_trimmed: string): Promise<string> {
	const now = Date.now();
	const id = crypto.randomUUID();
	await db.insert(album).values({
		id,
		user_id,
		name: name_trimmed,
		created_at_ms: now
	});
	return id;
}

export async function list_raw_upload_ids_in_album(
	user_id: string,
	album_id: string
): Promise<string[]> {
	const rows = await db
		.select({ raw_upload_id: album_raw_upload.raw_upload_id })
		.from(album_raw_upload)
		.innerJoin(album, eq(album.id, album_raw_upload.album_id))
		.where(and(eq(album_raw_upload.album_id, album_id), eq(album.user_id, user_id)));
	return rows.map((r) => r.raw_upload_id);
}

export async function add_raw_uploads_to_album(
	user_id: string,
	album_id: string,
	raw_upload_ids: string[]
): Promise<void> {
	if (raw_upload_ids.length === 0) return;
	const now = Date.now();
	const unique = [
		...new Set(raw_upload_ids.map((id) => id.trim()).filter((id) => uuid_re.test(id)))
	];
	if (unique.length === 0) return;

	db.transaction((tx) => {
		const album_rows = tx
			.select({ id: album.id })
			.from(album)
			.where(and(eq(album.id, album_id), eq(album.user_id, user_id)))
			.limit(1)
			.all();
		if (album_rows.length === 0) return;
		for (const raw_upload_id of unique) {
			tx.insert(album_raw_upload)
				.values({ album_id, raw_upload_id, added_at_ms: now })
				.onConflictDoNothing()
				.run();
		}
	});
}
