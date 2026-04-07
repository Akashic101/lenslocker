import { index, integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { raw_image_upload } from './raw_image_upload.schema';
import { user } from './auth.schema';

/**
 * Virtual albums: DB-only groupings of uploads. Files on disk are not moved.
 */
export const album = sqliteTable(
	'album',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		user_id: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		created_at_ms: integer('created_at_ms', { mode: 'number' }).notNull()
	},
	(t) => [index('album_user_id_idx').on(t.user_id)]
);

export const album_raw_upload = sqliteTable(
	'album_raw_upload',
	{
		album_id: text('album_id')
			.notNull()
			.references(() => album.id, { onDelete: 'cascade' }),
		raw_upload_id: text('raw_upload_id')
			.notNull()
			.references(() => raw_image_upload.id, { onDelete: 'cascade' }),
		added_at_ms: integer('added_at_ms', { mode: 'number' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.album_id, t.raw_upload_id] })]
);

export type AlbumRow = typeof album.$inferSelect;
export type AlbumInsert = typeof album.$inferInsert;
export type AlbumRawUploadInsert = typeof album_raw_upload.$inferInsert;
