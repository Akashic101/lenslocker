import { describe, expect, it } from 'vitest';

import { estimate_upload_remaining_seconds, format_upload_eta_duration } from './upload_eta';

describe('estimate_upload_remaining_seconds', () => {
	it('returns null before minimum percent', () => {
		expect(estimate_upload_remaining_seconds(5_000, 0)).toBeNull();
		expect(estimate_upload_remaining_seconds(5_000, 0.99)).toBeNull();
	});

	it('returns null at or above 100%', () => {
		expect(estimate_upload_remaining_seconds(5_000, 100)).toBeNull();
		expect(estimate_upload_remaining_seconds(5_000, 120)).toBeNull();
	});

	it('returns null before minimum elapsed time', () => {
		expect(estimate_upload_remaining_seconds(0, 50)).toBeNull();
		expect(estimate_upload_remaining_seconds(999, 50)).toBeNull();
	});

	it('estimates remaining seconds via linear extrapolation', () => {
		expect(estimate_upload_remaining_seconds(5_000, 50)).toBe(5);
		expect(estimate_upload_remaining_seconds(10_000, 25)).toBe(30);
	});

	it('returns 0 for non-finite math edge cases', () => {
		expect(estimate_upload_remaining_seconds(Number.NaN, 50)).toBe(0);
		expect(estimate_upload_remaining_seconds(5_000, Number.NaN)).toBe(0);
		expect(estimate_upload_remaining_seconds(Number.POSITIVE_INFINITY, 50)).toBe(0);
	});
});

describe('format_upload_eta_duration', () => {
	it('formats seconds under 60', () => {
		expect(format_upload_eta_duration(0, 'en')).toBe('0s');
		expect(format_upload_eta_duration(9.6, 'en')).toBe('10s');
		expect(format_upload_eta_duration(9.6, 'de')).toBe('10 s');
	});

	it('formats exact minutes', () => {
		expect(format_upload_eta_duration(60, 'en')).toBe('1 min');
		expect(format_upload_eta_duration(60, 'de')).toBe('1 Min.');
	});

	it('formats minutes with remaining seconds', () => {
		expect(format_upload_eta_duration(61, 'en')).toBe('1 min 1s');
		expect(format_upload_eta_duration(61, 'de')).toBe('1 Min. 1 s');
	});

	it('clamps negative seconds to 0', () => {
		expect(format_upload_eta_duration(-10, 'en')).toBe('0s');
	});

	it('caps very large durations at 6 hours', () => {
		expect(format_upload_eta_duration(999_999, 'en')).toBe('360 min');
		expect(format_upload_eta_duration(999_999, 'de')).toBe('360 Min.');
	});

	it('treats de-* locales as German', () => {
		expect(format_upload_eta_duration(61, 'de-CH')).toBe('1 Min. 1 s');
	});
});
