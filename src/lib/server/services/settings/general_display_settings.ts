import { eq } from 'drizzle-orm';
import {
	general_display_defaults,
	type app_time_format,
	type general_display_settings
} from '$lib/config/display_defaults';
import { db } from '$lib/server/db';
import { app_setting } from '$lib/server/db/app_setting.schema';

const general_display_setting_key = 'general_display';

function is_time_format(v: unknown): v is app_time_format {
	return v === '24h' || v === '12h';
}

function clamp_general_display_settings(input: unknown): general_display_settings {
	if (input == null || typeof input !== 'object') {
		return { ...general_display_defaults };
	}
	const o = input as Record<string, unknown>;
	const time_format = is_time_format(o.time_format)
		? o.time_format
		: general_display_defaults.time_format;
	return { time_format };
}

export async function get_general_display_settings(): Promise<general_display_settings> {
	const rows = await db
		.select()
		.from(app_setting)
		.where(eq(app_setting.key, general_display_setting_key))
		.limit(1);
	if (rows.length === 0) {
		return { ...general_display_defaults };
	}
	try {
		return clamp_general_display_settings(JSON.parse(rows[0].value_json));
	} catch {
		return { ...general_display_defaults };
	}
}

export async function replace_general_display_settings(
	next: unknown
): Promise<general_display_settings> {
	const merged = clamp_general_display_settings(next);
	const value_json = JSON.stringify(merged);
	await db
		.insert(app_setting)
		.values({ key: general_display_setting_key, value_json })
		.onConflictDoUpdate({
			target: app_setting.key,
			set: { value_json }
		});
	return merged;
}
