/** User-configurable rules for Dashboard → Needs attention (shared server + client). */
export type dashboard_needs_attention_settings = {
	/** Any photo matching at least one of these rules appears in Needs attention. Order is not meaningful. */
	required_field_keys: string[];
};

export const dashboard_needs_attention_default_keys: string[] = [
	'gps_either_missing',
	'camera_body_incomplete',
	'lens_incomplete',
	'shot_date_calendar_missing'
];

export const dashboard_needs_attention_defaults: dashboard_needs_attention_settings = {
	required_field_keys: [...dashboard_needs_attention_default_keys]
};
