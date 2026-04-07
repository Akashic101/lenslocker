import { afterEach, describe, expect, it, vi } from 'vitest';

import { format_app_datetime_medium_short } from './format_app_datetime';

describe('format_app_datetime_medium_short', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('differs between 12h and 24h for the same instant', () => {
		const ms = Date.UTC(2024, 5, 15, 14, 30, 0);
		const as_24h = format_app_datetime_medium_short(ms, '24h');
		const as_12h = format_app_datetime_medium_short(ms, '12h');
		expect(as_24h.length).toBeGreaterThan(0);
		expect(as_12h.length).toBeGreaterThan(0);
		expect(as_24h).not.toBe(as_12h);
	});

	it('falls back to ISO when Intl.DateTimeFormat throws', () => {
		vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
			throw new Error('mock intl failure');
		});
		const ms = 1_700_000_000_000;
		expect(format_app_datetime_medium_short(ms, '24h')).toBe(new Date(ms).toISOString());
	});
});
