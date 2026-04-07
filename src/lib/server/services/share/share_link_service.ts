import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { gallery_grid_item } from '$lib/gallery/gallery_grid_types';
import {
	build_gallery_meta_rows,
	upload_id_from_transformed_preview_path
} from '$lib/server/gallery_upload_meta';
import { db } from '$lib/server/db';
import { album } from '$lib/server/db/album.schema';
import { share_link, type ShareLinkRow } from '$lib/server/db/share_link.schema';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import {
	resolve_upload_preview_full_relative_path,
	resolve_upload_preview_thumb_relative_path
} from '$lib/server/raw_upload/write_preview_jpeg';
import { list_raw_upload_ids_in_album } from '$lib/server/services/album/album_service';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import { load_raw_upload_meta_rows_for_ids } from '$lib/server/services/dashboard/dashboard_service';

type share_link_kind = 'album' | 'raw_upload';

function new_share_token(): string {
	return randomBytes(24).toString('base64url');
}

export async function create_share_link(input: {
	kind: share_link_kind;
	album_id: string | null;
	raw_upload_id: string | null;
	expires_at_ms: number | null;
	created_by_user_id: string;
}): Promise<ShareLinkRow> {
	const { kind, album_id, raw_upload_id, expires_at_ms, created_by_user_id } = input;
	if (kind === 'album') {
		if (album_id == null || album_id === '' || raw_upload_id != null) {
			throw new Error('album share requires album_id');
		}
		const rows = await db
			.select({ id: album.id })
			.from(album)
			.where(eq(album.id, album_id))
			.limit(1);
		if (rows.length === 0) throw new Error('Album not found');
	} else {
		if (raw_upload_id == null || raw_upload_id === '' || album_id != null) {
			throw new Error('photo share requires raw_upload_id');
		}
		const rows = await db
			.select({ id: raw_image_upload.id })
			.from(raw_image_upload)
			.where(eq(raw_image_upload.id, raw_upload_id))
			.limit(1);
		if (rows.length === 0) throw new Error('Upload not found');
	}

	const token = new_share_token();
	const created_at_ms = Date.now();
	const id = crypto.randomUUID();

	await db.insert(share_link).values({
		id,
		token,
		kind,
		album_id: kind === 'album' ? album_id : null,
		raw_upload_id: kind === 'raw_upload' ? raw_upload_id : null,
		expires_at_ms,
		created_at_ms,
		created_by_user_id
	});

	const inserted = await db.select().from(share_link).where(eq(share_link.id, id)).limit(1);
	return inserted[0]!;
}

function share_link_is_expired(row: ShareLinkRow): boolean {
	if (row.expires_at_ms == null) return false;
	return Date.now() > row.expires_at_ms;
}

export async function get_valid_share_by_token(token: string): Promise<ShareLinkRow | null> {
	const rows = await db.select().from(share_link).where(eq(share_link.token, token)).limit(1);
	const row = rows[0];
	if (row == null) return null;
	if (share_link_is_expired(row)) return null;
	return row;
}

type share_page_token_status =
	| { kind: 'valid'; row: ShareLinkRow }
	| { kind: 'expired' }
	| { kind: 'not_found' };

/** Resolve token for the public share page (distinguish expired vs removed). */
export async function get_share_page_token_status(token: string): Promise<share_page_token_status> {
	const rows = await db.select().from(share_link).where(eq(share_link.token, token)).limit(1);
	const row = rows[0];
	if (row == null) return { kind: 'not_found' };
	if (share_link_is_expired(row)) return { kind: 'expired' };
	return { kind: 'valid', row };
}

export async function delete_share_link_for_user(
	link_id: string,
	user_id: string
): Promise<boolean> {
	const result = await db
		.delete(share_link)
		.where(and(eq(share_link.id, link_id), eq(share_link.created_by_user_id, user_id)))
		.run();
	return result.changes > 0;
}

type share_link_list_item = {
	id: string;
	token: string;
	expires_at_ms: number | null;
	created_at_ms: number;
	expired: boolean;
};

export async function list_share_links_for_resource(input: {
	user_id: string;
	kind: share_link_kind;
	album_id: string | null;
	raw_upload_id: string | null;
}): Promise<share_link_list_item[]> {
	const { user_id, kind, album_id, raw_upload_id } = input;
	const base = and(eq(share_link.created_by_user_id, user_id));
	if (kind === 'album') {
		if (album_id == null || album_id === '') return [];
		const rows = await db
			.select()
			.from(share_link)
			.where(and(base, eq(share_link.kind, 'album'), eq(share_link.album_id, album_id)))
			.orderBy(desc(share_link.created_at_ms));
		return rows.map((r) => ({
			id: r.id,
			token: r.token,
			expires_at_ms: r.expires_at_ms ?? null,
			created_at_ms: r.created_at_ms,
			expired: share_link_is_expired(r)
		}));
	}
	if (raw_upload_id == null || raw_upload_id === '') return [];
	const rows = await db
		.select()
		.from(share_link)
		.where(
			and(base, eq(share_link.kind, 'raw_upload'), eq(share_link.raw_upload_id, raw_upload_id))
		)
		.orderBy(desc(share_link.created_at_ms));
	return rows.map((r) => ({
		id: r.id,
		token: r.token,
		expires_at_ms: r.expires_at_ms ?? null,
		created_at_ms: r.created_at_ms,
		expired: share_link_is_expired(r)
	}));
}

/** Allowed upload ids for this share (for media / meta checks). */
export async function share_allowed_upload_ids(row: ShareLinkRow): Promise<Set<string>> {
	if (row.kind === 'raw_upload' && row.raw_upload_id) {
		return new Set([row.raw_upload_id]);
	}
	if (row.kind === 'album' && row.album_id) {
		const ids = await list_raw_upload_ids_in_album(row.album_id);
		return new Set(ids);
	}
	return new Set();
}

export async function share_path_is_allowed_for_token(
	row: ShareLinkRow,
	relative_posix_path: string
): Promise<boolean> {
	const upload_id = upload_id_from_transformed_preview_path(relative_posix_path);
	if (upload_id == null) return false;
	const allowed = await share_allowed_upload_ids(row);
	return allowed.has(upload_id);
}

function share_media_url_path(token: string, relative_posix_path: string): string {
	const encoded = relative_posix_path.split('/').map(encodeURIComponent).join('/');
	return `/api/share/${encodeURIComponent(token)}/media/${encoded}`;
}

export async function load_share_gallery_items(
	token: string,
	row: ShareLinkRow
): Promise<{
	title: string;
	images: gallery_grid_item[];
}> {
	const { upload_preview_format } = await get_upload_preview_pipeline_settings();

	if (row.kind === 'album' && row.album_id) {
		const a = await db.select().from(album).where(eq(album.id, row.album_id)).limit(1);
		const name = a[0]?.name ?? 'Album';
		const upload_ids = await list_raw_upload_ids_in_album(row.album_id);
		const thumb_paths = await Promise.all(
			upload_ids.map((id) => resolve_upload_preview_thumb_relative_path(id, upload_preview_format))
		);
		const relative_paths = thumb_paths.filter((p): p is string => p != null);
		relative_paths.sort((x, y) => x.localeCompare(y));
		const images = await build_share_grid_items(token, relative_paths, upload_preview_format);
		return { title: name, images };
	}

	if (row.kind === 'raw_upload' && row.raw_upload_id) {
		const meta_rows = await db
			.select({ original_filename: raw_image_upload.original_filename })
			.from(raw_image_upload)
			.where(eq(raw_image_upload.id, row.raw_upload_id))
			.limit(1);
		const title = meta_rows[0]?.original_filename ?? 'Photo';
		const thumb = await resolve_upload_preview_thumb_relative_path(
			row.raw_upload_id,
			upload_preview_format
		);
		if (thumb == null) {
			return { title, images: [] };
		}
		const images = await build_share_grid_items(token, [thumb], upload_preview_format);
		return { title, images };
	}

	return { title: 'Shared', images: [] };
}

async function build_share_grid_items(
	token: string,
	relative_thumb_paths: string[],
	upload_preview_format: import('$lib/config/upload_preview_format').upload_preview_format
): Promise<gallery_grid_item[]> {
	const preview_upload_ids = relative_thumb_paths
		.map((p) => upload_id_from_transformed_preview_path(p))
		.filter((id): id is string => id != null);

	const meta_by_upload_id = new Map<string, ReturnType<typeof build_gallery_meta_rows>>();
	if (preview_upload_ids.length > 0) {
		const rows = await load_raw_upload_meta_rows_for_ids(preview_upload_ids);
		for (const row of rows) {
			const caption_rows = build_gallery_meta_rows(row);
			if (caption_rows.length > 0) meta_by_upload_id.set(row.id, caption_rows);
		}
	}

	const full_preview_relative_by_upload_id = new Map<string, string>();
	for (const uid of new Set(preview_upload_ids)) {
		const rel = await resolve_upload_preview_full_relative_path(uid, upload_preview_format);
		if (rel != null) full_preview_relative_by_upload_id.set(uid, rel);
	}

	return relative_thumb_paths.map((relative_path) => {
		const upload_id = upload_id_from_transformed_preview_path(relative_path);
		const caption_rows = upload_id ? meta_by_upload_id.get(upload_id) : undefined;
		const full_relative = upload_id
			? (full_preview_relative_by_upload_id.get(upload_id) ?? null)
			: null;
		return {
			relative_path,
			src: share_media_url_path(token, relative_path),
			full_src: full_relative ? share_media_url_path(token, full_relative) : null,
			upload_id,
			starred: false,
			alt: relative_path,
			meta: caption_rows && caption_rows.length > 0 ? { rows: caption_rows } : null
		};
	});
}
