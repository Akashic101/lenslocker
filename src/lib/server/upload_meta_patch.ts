import type { RawImageUploadRow } from '$lib/server/db/raw_image_upload.schema';
import {
	upload_meta_editable_field_list,
	type upload_meta_editable_field_key
} from '$lib/upload_meta_editable_fields';

export const upload_meta_patchable_columns = upload_meta_editable_field_list.map((f) => f.key);

export type upload_meta_patchable_key = upload_meta_editable_field_key;

const patchable_set = new Set<string>(upload_meta_patchable_columns);

const int_columns = new Set<upload_meta_patchable_key>([
	'iso_speed',
	'rating',
	'image_width',
	'image_height',
	'pixel_x_dimension',
	'pixel_y_dimension',
	'focal_length_in_35mm_film'
]);

const real_columns = new Set<upload_meta_patchable_key>([
	'exposure_time_seconds',
	'f_number',
	'focal_length'
]);

function coerce_text(v: unknown): string | null {
	if (v === null || v === undefined) return null;
	const s = typeof v === 'string' ? v.trim() : String(v).trim();
	return s === '' ? null : s;
}

function coerce_int(v: unknown): number | null {
	if (v === null || v === undefined || v === '') return null;
	const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
	return Number.isFinite(n) ? Math.trunc(n) : null;
}

function coerce_real(v: unknown): number | null {
	if (v === null || v === undefined || v === '') return null;
	const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replaceAll(',', '.'));
	return Number.isFinite(n) ? n : null;
}

export type upload_meta_patch_result =
	| { ok: true; patch: Partial<RawImageUploadRow> }
	| { ok: false; error: string };

/**
 * Build a Drizzle-ready patch from JSON body. Unknown keys ignored.
 */
export function parse_upload_meta_patch(body: unknown): upload_meta_patch_result {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, error: 'Expected a JSON object.' };
	}
	const patch: Partial<RawImageUploadRow> = {};
	for (const [raw_key, raw_val] of Object.entries(body as Record<string, unknown>)) {
		if (!patchable_set.has(raw_key)) continue;
		const key = raw_key as upload_meta_patchable_key;
		if (int_columns.has(key)) {
			(patch as Record<string, unknown>)[key] = coerce_int(raw_val);
		} else if (real_columns.has(key)) {
			(patch as Record<string, unknown>)[key] = coerce_real(raw_val);
		} else {
			(patch as Record<string, unknown>)[key] = coerce_text(raw_val);
		}
	}
	if (Object.keys(patch).length === 0) {
		return { ok: false, error: 'No recognized fields to update.' };
	}
	const name = patch.original_filename;
	if (name !== undefined && (name === null || name === '')) {
		return { ok: false, error: 'original_filename cannot be empty.' };
	}
	return { ok: true, patch };
}
