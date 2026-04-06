import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { album } from './album.schema';
import { user } from './auth.schema';
import { raw_image_upload } from './raw_image_upload.schema';

/**
 * Public read-only links: album or single upload. Token is unguessable; optional expiration.
 */
export const share_link = sqliteTable(
	'share_link',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		token: text('token').notNull(),
		kind: text('kind', { enum: ['album', 'raw_upload'] }).notNull(),
		album_id: text('album_id').references(() => album.id, { onDelete: 'cascade' }),
		raw_upload_id: text('raw_upload_id').references(() => raw_image_upload.id, {
			onDelete: 'cascade'
		}),
		expires_at_ms: integer('expires_at_ms', { mode: 'number' }),
		created_at_ms: integer('created_at_ms', { mode: 'number' }).notNull(),
		created_by_user_id: text('created_by_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(t) => [uniqueIndex('share_link_token_unique').on(t.token)]
);

export type ShareLinkRow = typeof share_link.$inferSelect;
export type ShareLinkInsert = typeof share_link.$inferInsert;
