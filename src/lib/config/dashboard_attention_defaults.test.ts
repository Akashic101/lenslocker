import { describe, expect, it } from 'vitest';
import {
	dashboard_needs_attention_default_keys,
	dashboard_needs_attention_defaults
} from './dashboard_attention_defaults';

describe('dashboard_needs_attention_default_keys', () => {
	it('lists unique non-empty rule keys', () => {
		expect(dashboard_needs_attention_default_keys.length).toBeGreaterThan(0);
		for (const key of dashboard_needs_attention_default_keys) {
			expect(key.length).toBeGreaterThan(0);
		}
		expect(new Set(dashboard_needs_attention_default_keys).size).toBe(
			dashboard_needs_attention_default_keys.length
		);
	});

	it('includes the built-in needs-attention rules', () => {
		const keys = new Set(dashboard_needs_attention_default_keys);
		expect(keys.has('gps_either_missing')).toBe(true);
		expect(keys.has('camera_body_incomplete')).toBe(true);
		expect(keys.has('lens_incomplete')).toBe(true);
		expect(keys.has('shot_date_calendar_missing')).toBe(true);
	});
});

describe('dashboard_needs_attention_defaults', () => {
	it('matches default keys as a copy', () => {
		expect(dashboard_needs_attention_defaults.required_field_keys).toEqual(
			dashboard_needs_attention_default_keys
		);
		expect(dashboard_needs_attention_defaults.required_field_keys).not.toBe(
			dashboard_needs_attention_default_keys
		);
	});
});
