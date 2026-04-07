import { index, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

/** Key/value JSON blobs for app configuration (e.g. upload transcoding). */
export const app_setting = sqliteTable(
	'app_setting',
	{
		user_id: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		value_json: text('value_json').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.user_id, t.key] }),
		index('app_setting_user_id_idx').on(t.user_id)
	]
);

export type AppSettingRow = typeof app_setting.$inferSelect;
