import { fail } from '@sveltejs/kit';
import {
	delete_hardware_item_by_id,
	get_hardware_item_id_if_exists,
	hardware_allowed_category_set,
	insert_hardware_item_row,
	list_hardware_items_for_page,
	update_hardware_item_row
} from '$lib/server/services/hardware/hardware_service';
import { load_photo_gear_suggestions } from '$lib/server/photo_gear_suggestions';
import type { Actions, PageServerLoad } from './$types';

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
		list_hardware_items_for_page(),
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

		if (!hardware_allowed_category_set.has(category)) {
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
			await insert_hardware_item_row({
				...row,
				created_at_ms: now
			});
		} else {
			const existing_id = await get_hardware_item_id_if_exists(id);
			if (existing_id == null) {
				return fail(404, { message: 'Item not found.' });
			}
			await update_hardware_item_row(id, row);
		}

		return { success: true as const };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (id === '') {
			return fail(400, { message: 'Missing id.' });
		}
		await delete_hardware_item_by_id(id);
		return { success: true as const };
	}
};
