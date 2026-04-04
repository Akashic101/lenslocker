import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { hardware_item } from '$lib/server/db/hardware.schema';
import { load_photo_gear_suggestions } from '$lib/server/photo_gear_suggestions';
import type { Actions, PageServerLoad } from './$types';

const allowed_categories = new Set(['camera', 'lens', 'accessory', 'other']);

function optional_trimmed(form: FormData, key: string): string | null {
	const v = String(form.get(key) ?? '').trim();
	return v === '' ? null : v;
}

function optional_date_ms(form: FormData, key: string): number | null {
	const v = String(form.get(key) ?? '').trim();
	if (v === '') return null;
	const parsed = Date.parse(v);
	return Number.isFinite(parsed) ? parsed : null;
}

export const load: PageServerLoad = async () => {
	const [items, from_photos] = await Promise.all([
		db.select().from(hardware_item).orderBy(desc(hardware_item.updated_at_ms)),
		load_photo_gear_suggestions()
	]);
	return { items, from_photos };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const category = String(form.get('category') ?? '').trim();
		const model = String(form.get('model') ?? '').trim();

		if (!allowed_categories.has(category)) {
			return fail(400, { message: 'Choose a valid category.' });
		}
		if (model === '') {
			return fail(400, { message: 'Model is required.' });
		}

		const now = Date.now();
		const row = {
			category,
			model,
			make: optional_trimmed(form, 'make'),
			serial_number: optional_trimmed(form, 'serial_number'),
			mount: optional_trimmed(form, 'mount'),
			notes: optional_trimmed(form, 'notes'),
			acquired_at_ms: optional_date_ms(form, 'acquired_at'),
			updated_at_ms: now
		};

		if (id === '') {
			await db.insert(hardware_item).values({
				...row,
				created_at_ms: now
			});
		} else {
			const [existing] = await db
				.select({ id: hardware_item.id })
				.from(hardware_item)
				.where(eq(hardware_item.id, id))
				.limit(1);
			if (!existing) {
				return fail(404, { message: 'Item not found.' });
			}
			await db.update(hardware_item).set(row).where(eq(hardware_item.id, id));
		}

		return { success: true as const };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (id === '') {
			return fail(400, { message: 'Missing id.' });
		}
		await db.delete(hardware_item).where(eq(hardware_item.id, id));
		return { success: true as const };
	}
};
