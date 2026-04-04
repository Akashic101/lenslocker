import { db } from '$lib/server/db';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';

export type photo_gear_suggestions = {
	camera_makes: string[];
	camera_models: string[];
	/** Pairs from EXIF (for filtering model list by selected make). */
	camera_pairs: { make: string | null; model: string }[];
	lens_makes: string[];
	lens_models: string[];
	lens_pairs: { make: string | null; model: string }[];
};

function uniq_sorted(values: (string | null | undefined)[]): string[] {
	const out = new Set<string>();
	for (const v of values) {
		if (v == null) continue;
		const t = v.trim();
		if (t !== '') out.add(t);
	}
	return [...out].sort((a, b) => a.localeCompare(b));
}

function dedupe_pairs(
	pairs: { make: string | null; model: string | null }[]
): { make: string | null; model: string }[] {
	const seen = new Set<string>();
	const out: { make: string | null; model: string }[] = [];
	for (const p of pairs) {
		if (p.model == null || p.model.trim() === '') continue;
		const model = p.model.trim();
		const make = p.make?.trim() ?? null;
		const key = `${make ?? ''}\0${model}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({ make, model });
	}
	out.sort((a, b) => {
		const cm = (a.make ?? '').localeCompare(b.make ?? '');
		return cm !== 0 ? cm : a.model.localeCompare(b.model);
	});
	return out;
}

/** Distinct make/model / lens_make/lens_model from uploaded images (EXIF). */
export async function load_photo_gear_suggestions(): Promise<photo_gear_suggestions> {
	const rows = await db
		.select({
			make: raw_image_upload.make,
			model: raw_image_upload.model,
			lens_make: raw_image_upload.lens_make,
			lens_model: raw_image_upload.lens_model
		})
		.from(raw_image_upload);

	return {
		camera_makes: uniq_sorted(rows.map((r) => r.make)),
		camera_models: uniq_sorted(rows.map((r) => r.model)),
		camera_pairs: dedupe_pairs(rows.map((r) => ({ make: r.make, model: r.model }))),
		lens_makes: uniq_sorted(rows.map((r) => r.lens_make)),
		lens_models: uniq_sorted(rows.map((r) => r.lens_model)),
		lens_pairs: dedupe_pairs(rows.map((r) => ({ make: r.lens_make, model: r.lens_model })))
	};
}
