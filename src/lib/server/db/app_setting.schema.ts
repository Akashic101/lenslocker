import { text, sqliteTable } from 'drizzle-orm/sqlite-core';

/** Key/value JSON blobs for app configuration (e.g. upload transcoding). */
export const app_setting = sqliteTable('app_setting', {
	key: text('key').primaryKey(),
	value_json: text('value_json').notNull()
});

export type AppSettingRow = typeof app_setting.$inferSelect;
