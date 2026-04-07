/** Avoid noisy ETA when almost no progress yet (linear extrapolation explodes near 0%). */
const upload_eta_min_overall_percent = 1;
/** Wait until we have a few seconds of wall time before showing an estimate. */
const upload_eta_min_elapsed_ms = 1000;

/**
 * Linear extrapolation from overall batch percent: assumes steady progress (approximate).
 * Returns null when an estimate would not be meaningful.
 */
export function estimate_upload_remaining_seconds(
	elapsed_ms: number,
	overall_percent: number
): number | null {
	if (overall_percent < upload_eta_min_overall_percent || overall_percent >= 100) return null;
	if (elapsed_ms < upload_eta_min_elapsed_ms) return null;
	const total_ms = elapsed_ms * (100 / overall_percent);
	const remaining_ms = total_ms - elapsed_ms;
	if (!Number.isFinite(remaining_ms) || remaining_ms < 0) return 0;
	return Math.round(remaining_ms / 1000);
}

const max_eta_seconds_display = 6 * 60 * 60;

/** Short human-readable duration for ETA (locale-aware via `locale`). */
export function format_upload_eta_duration(seconds: number, locale: string): string {
	const capped = Math.min(Math.max(0, Math.round(seconds)), max_eta_seconds_display);
	const is_de = locale === 'de' || locale.startsWith('de-');
	if (capped < 60) {
		return is_de ? `${capped} s` : `${capped}s`;
	}
	const m = Math.floor(capped / 60);
	const rem = capped % 60;
	if (rem === 0) return is_de ? `${m} Min.` : `${m} min`;
	return is_de ? `${m} Min. ${rem} s` : `${m} min ${rem}s`;
}
