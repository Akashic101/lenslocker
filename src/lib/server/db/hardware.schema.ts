import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * User-managed gear: cameras, lenses, and related equipment.
 * (No `user_id` yet — same single-tenant style as `raw_image_upload`.)
 */
export const hardware_item = sqliteTable('hardware_item', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),

	/** `camera` | `lens` | `accessory` | `other` */
	category: text('category').notNull(),

	make: text('make'),
	model: text('model').notNull(),
	serial_number: text('serial_number'),
	/** e.g. lens mount (E-mount, RF, …) */
	mount: text('mount'),
	notes: text('notes'),

	acquired_at_ms: integer('acquired_at_ms', { mode: 'number' }),
	created_at_ms: integer('created_at_ms', { mode: 'number' }).notNull(),
	updated_at_ms: integer('updated_at_ms', { mode: 'number' }).notNull()
});

export type HardwareItemRow = typeof hardware_item.$inferSelect;
export type HardwareItemInsert = typeof hardware_item.$inferInsert;
