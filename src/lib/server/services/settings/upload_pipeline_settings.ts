import { and, eq } from 'drizzle-orm';
import {
	upload_preview_pipeline_defaults,
	type upload_preview_pipeline_settings
} from '$lib/config/upload_pipeline_defaults';
import { is_upload_preview_format } from '$lib/config/upload_preview_format';
import { db } from '$lib/server/db';
import { app_setting } from '$lib/server/db/app_setting.schema';

const upload_pipeline_setting_key = 'upload_pipeline';

export type { upload_preview_pipeline_settings };

function clamp_upload_preview_pipeline_settings(input: unknown): upload_preview_pipeline_settings {
	const d = upload_preview_pipeline_defaults;
	if (input == null || typeof input !== 'object') {
		return { ...d };
	}
	const o = input as Record<string, unknown>;
	const num = (v: unknown, fallback: number, min: number, max: number): number => {
		const n = typeof v === 'number' ? v : Number(v);
		if (!Number.isFinite(n)) return fallback;
		return Math.min(max, Math.max(min, Math.round(n)));
	};
	const upload_preview_format = is_upload_preview_format(o.upload_preview_format)
		? o.upload_preview_format
		: d.upload_preview_format;

	return {
		thumb_max_edge_px: num(o.thumb_max_edge_px, d.thumb_max_edge_px, 64, 4096),
		max_full_edge_px: num(o.max_full_edge_px, d.max_full_edge_px, 256, 16384),
		jpeg_q_thumb: num(o.jpeg_q_thumb, d.jpeg_q_thumb, 1, 100),
		jpeg_q_full: num(o.jpeg_q_full, d.jpeg_q_full, 1, 100),
		max_upload_bytes: num(o.max_upload_bytes, d.max_upload_bytes, 1024 * 1024, 2048 * 1024 * 1024),
		upload_preview_format
	};
}

export async function get_upload_preview_pipeline_settings(
	user_id: string
): Promise<upload_preview_pipeline_settings> {
	const rows = await db
		.select()
		.from(app_setting)
		.where(and(eq(app_setting.user_id, user_id), eq(app_setting.key, upload_pipeline_setting_key)))
		.limit(1);
	if (rows.length === 0) {
		return { ...upload_preview_pipeline_defaults };
	}
	try {
		return clamp_upload_preview_pipeline_settings(JSON.parse(rows[0].value_json));
	} catch {
		return { ...upload_preview_pipeline_defaults };
	}
}

export async function replace_upload_preview_pipeline_settings(
	user_id: string,
	next: unknown
): Promise<upload_preview_pipeline_settings> {
	const merged = clamp_upload_preview_pipeline_settings(next);
	const value_json = JSON.stringify(merged);
	await db
		.insert(app_setting)
		.values({ user_id, key: upload_pipeline_setting_key, value_json })
		.onConflictDoUpdate({
			target: [app_setting.user_id, app_setting.key],
			set: { value_json }
		});
	return merged;
}
