import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	hardware_item,
	type HardwareItemInsert,
	type HardwareItemRow
} from '$lib/server/db/hardware.schema';

export const hardware_allowed_category_set = new Set<string>([
	'camera',
	'lens',
	'accessory',
	'other'
]);

export async function list_hardware_items_for_page(user_id: string): Promise<HardwareItemRow[]> {
	return db
		.select()
		.from(hardware_item)
		.where(eq(hardware_item.user_id, user_id))
		.orderBy(desc(hardware_item.updated_at_ms));
}

export async function get_hardware_item_id_if_exists(
	user_id: string,
	id: string
): Promise<string | null> {
	const [row] = await db
		.select({ id: hardware_item.id })
		.from(hardware_item)
		.where(and(eq(hardware_item.id, id), eq(hardware_item.user_id, user_id)))
		.limit(1);
	return row?.id ?? null;
}

export async function insert_hardware_item_row(values: HardwareItemInsert): Promise<void> {
	await db.insert(hardware_item).values(values);
}

/** Fields allowed on update (identity and `created_at_ms` are immutable). */
type hardware_item_update_payload = Omit<HardwareItemInsert, 'id' | 'created_at_ms'>;

export async function update_hardware_item_row(
	user_id: string,
	id: string,
	patch: hardware_item_update_payload
): Promise<void> {
	await db
		.update(hardware_item)
		.set(patch)
		.where(and(eq(hardware_item.id, id), eq(hardware_item.user_id, user_id)));
}

export async function delete_hardware_item_by_id(user_id: string, id: string): Promise<void> {
	await db
		.delete(hardware_item)
		.where(and(eq(hardware_item.id, id), eq(hardware_item.user_id, user_id)));
}
