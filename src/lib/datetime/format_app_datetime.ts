import type { app_time_format } from '$lib/config/display_defaults';

/** Date + short time for UI (backup list, share links, etc.). */
export function format_app_datetime_medium_short(ms: number, time_format: app_time_format): string {
	const hour12 = time_format === '12h';
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
			hour12
		}).format(new Date(ms));
	} catch {
		return new Date(ms).toISOString();
	}
}
