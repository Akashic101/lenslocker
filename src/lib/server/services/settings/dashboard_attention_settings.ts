import { and, eq } from 'drizzle-orm';
import {
	dashboard_needs_attention_defaults,
	type dashboard_needs_attention_settings
} from '$lib/config/dashboard_attention_defaults';
import {
	normalize_dashboard_needs_attention_request_body,
	parse_dashboard_needs_attention_stored_json
} from '$lib/gallery/needs_attention_catalog';
import { db } from '$lib/server/db';
import { app_setting } from '$lib/server/db/app_setting.schema';

const dashboard_attention_setting_key = 'dashboard_needs_attention';

export async function get_dashboard_needs_attention_settings(
	user_id: string
): Promise<dashboard_needs_attention_settings> {
	const rows = await db
		.select()
		.from(app_setting)
		.where(
			and(eq(app_setting.user_id, user_id), eq(app_setting.key, dashboard_attention_setting_key))
		)
		.limit(1);
	if (rows.length === 0) {
		return {
			required_field_keys: [...dashboard_needs_attention_defaults.required_field_keys]
		};
	}
	try {
		const parsed = JSON.parse(rows[0].value_json);
		const { required_field_keys } = parse_dashboard_needs_attention_stored_json(parsed);
		return { required_field_keys: [...required_field_keys] };
	} catch {
		return {
			required_field_keys: [...dashboard_needs_attention_defaults.required_field_keys]
		};
	}
}

export async function replace_dashboard_needs_attention_settings(
	user_id: string,
	next: unknown
): Promise<dashboard_needs_attention_settings> {
	const merged = normalize_dashboard_needs_attention_request_body(next);
	const value_json = JSON.stringify(merged);
	await db
		.insert(app_setting)
		.values({ user_id, key: dashboard_attention_setting_key, value_json })
		.onConflictDoUpdate({
			target: [app_setting.user_id, app_setting.key],
			set: { value_json }
		});
	return { required_field_keys: [...merged.required_field_keys] };
}
