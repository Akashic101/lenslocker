import { describe, expect, it } from 'vitest';
import { dashboard_needs_attention_default_keys } from '$lib/config/dashboard_attention_defaults';
import {
	type needs_attention_field_catalog_entry,
	filter_valid_needs_attention_field_keys,
	needs_attention_catalog,
	needs_attention_int_column_keys,
	needs_attention_issue_for_detail_key,
	needs_attention_label_for_key,
	needs_attention_real_column_keys,
	needs_attention_special_field_keys,
	needs_attention_text_column_keys,
	needs_attention_valid_key_set,
	normalize_dashboard_needs_attention_request_body,
	parse_dashboard_needs_attention_stored_json,
	shot_calendar_date_from_exif
} from './needs_attention_catalog';

describe('needs_attention_special_field_keys', () => {
	it('lists compound shortcut rules', () => {
		expect(needs_attention_special_field_keys).toContain('gps_either_missing');
		expect(needs_attention_special_field_keys).toContain('exposure_both_missing');
		expect(new Set(needs_attention_special_field_keys).size).toBe(
			needs_attention_special_field_keys.length
		);
	});
});

describe('needs_attention column kind sets', () => {
	it('classifies representative raw_image_upload columns', () => {
		expect(needs_attention_text_column_keys.has('make')).toBe(true);
		expect(needs_attention_int_column_keys.has('iso_speed')).toBe(true);
		expect(needs_attention_real_column_keys.has('gps_latitude')).toBe(true);
	});
});

describe('needs_attention_field_catalog_entry', () => {
	it('matches every catalog row at runtime (type export)', () => {
		for (const row of needs_attention_catalog) {
			const entry: needs_attention_field_catalog_entry = row;
			expect(entry.key.length).toBeGreaterThan(0);
			expect(entry.label.length).toBeGreaterThan(0);
			expect(entry.group.length).toBeGreaterThan(0);
		}
	});
});

describe('needs_attention_catalog', () => {
	it('is sorted by group then label', () => {
		for (let i = 1; i < needs_attention_catalog.length; i++) {
			const prev = needs_attention_catalog[i - 1]!;
			const cur = needs_attention_catalog[i]!;
			const by_group = prev.group.localeCompare(cur.group);
			expect(by_group < 0 || (by_group === 0 && prev.label.localeCompare(cur.label) <= 0)).toBe(
				true
			);
		}
	});

	it('has unique keys and includes specials plus column-derived entries', () => {
		const keys = needs_attention_catalog.map((e) => e.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const k of needs_attention_special_field_keys) {
			expect(keys).toContain(k);
		}
		expect(needs_attention_valid_key_set.size).toBe(keys.length);
	});
});

describe('filter_valid_needs_attention_field_keys', () => {
	it('keeps valid keys in order, dedupes, and drops unknown or non-strings', () => {
		const mixed = ['iso_speed', 'not_in_catalog', 'iso_speed', 1, null] as unknown as string[];
		expect(filter_valid_needs_attention_field_keys(mixed)).toEqual(['iso_speed']);
	});
});

describe('parse_dashboard_needs_attention_stored_json', () => {
	it('returns filtered keys for new shape', () => {
		expect(
			parse_dashboard_needs_attention_stored_json({
				required_field_keys: ['make', 'invalid_key']
			})
		).toEqual({ required_field_keys: ['make'] });
	});

	it('defaults when stored object has no required_field_keys array', () => {
		expect(parse_dashboard_needs_attention_stored_json({})).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
		expect(parse_dashboard_needs_attention_stored_json({ flag_iso: true })).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
	});

	it('falls back to defaults when shape is wrong', () => {
		expect(parse_dashboard_needs_attention_stored_json(null)).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
		expect(parse_dashboard_needs_attention_stored_json([])).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
	});
});

describe('normalize_dashboard_needs_attention_request_body', () => {
	it('mirrors parse rules for API bodies', () => {
		expect(normalize_dashboard_needs_attention_request_body(null)).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
		expect(
			normalize_dashboard_needs_attention_request_body({
				required_field_keys: ['f_number']
			})
		).toEqual({ required_field_keys: ['f_number'] });
		expect(normalize_dashboard_needs_attention_request_body({ flag_iso: true })).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
	});

	it('defaults when body is a plain object without required_field_keys array', () => {
		expect(normalize_dashboard_needs_attention_request_body({})).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
		expect(normalize_dashboard_needs_attention_request_body({ note: 'ignored' })).toEqual({
			required_field_keys: [...dashboard_needs_attention_default_keys]
		});
	});
});

describe('needs_attention_label_for_key', () => {
	it('uses catalog label when present', () => {
		const from_catalog = needs_attention_catalog.find((e) => e.key === 'gps_either_missing');
		expect(needs_attention_label_for_key('gps_either_missing')).toBe(from_catalog!.label);
	});

	it('humanizes unknown keys', () => {
		expect(needs_attention_label_for_key('foo_bar_baz')).toBe('Foo Bar Baz');
	});
});

describe('shot_calendar_date_from_exif', () => {
	it('parses exif-style and plain iso date prefixes', () => {
		expect(shot_calendar_date_from_exif(null)).toBe(null);
		expect(shot_calendar_date_from_exif('')).toBe(null);
		expect(shot_calendar_date_from_exif('2024:03:09 14:00:00')).toBe('2024-03-09');
		expect(shot_calendar_date_from_exif('2024-03-09T12:00:00Z')).toBe('2024-03-09');
		expect(shot_calendar_date_from_exif('not a date')).toBe(null);
	});
});

describe('needs_attention_issue_for_detail_key', () => {
	const required_gps = new Set<string>(['gps_either_missing']);
	const required_make_model = new Set<string>(['camera_body_incomplete']);
	const required_iso = new Set<string>(['iso_speed']);

	it('flags GPS row when either coordinate missing', () => {
		const row = { gps_latitude: null, gps_longitude: 1 };
		expect(needs_attention_issue_for_detail_key(row, 'gps_latitude', required_gps)).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ gps_latitude: 1, gps_longitude: null },
				'gps_longitude',
				required_gps
			)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ gps_latitude: 1, gps_longitude: 2 },
				'gps_latitude',
				required_gps
			)
		).toBe(false);
	});

	it('flags camera body when both make and model empty', () => {
		const row = { make: '', model: '  ' };
		expect(needs_attention_issue_for_detail_key(row, 'make', required_make_model)).toBe(true);
		expect(
			needs_attention_issue_for_detail_key({ make: '', model: '' }, 'model', required_make_model)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ make: 'Canon', model: '' },
				'model',
				required_make_model
			)
		).toBe(false);
		expect(
			needs_attention_issue_for_detail_key({ make: '', model: 'R5' }, 'make', required_make_model)
		).toBe(false);
		expect(
			needs_attention_issue_for_detail_key(
				{ make: '', model: '' },
				'iso_speed',
				required_make_model
			)
		).toBe(false);
	});

	it('uses column emptiness when key is directly required', () => {
		const row = { iso_speed: null };
		expect(needs_attention_issue_for_detail_key(row, 'iso_speed', required_iso)).toBe(true);
		expect(needs_attention_issue_for_detail_key(row, 'iso_speed', new Set())).toBe(false);
	});

	it('numeric columns treat non-finite numbers, blank strings, and non-numeric strings as missing', () => {
		const required_iso = new Set<string>(['iso_speed']);
		expect(
			needs_attention_issue_for_detail_key({ iso_speed: NaN }, 'iso_speed', required_iso)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ iso_speed: Number.POSITIVE_INFINITY },
				'iso_speed',
				required_iso
			)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key({ iso_speed: '   ' }, 'iso_speed', required_iso)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key({ iso_speed: 'not-a-number' }, 'iso_speed', required_iso)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key({ iso_speed: '400' }, 'iso_speed', required_iso)
		).toBe(false);
	});

	it('text columns use trim_meta_str emptiness when the field is required', () => {
		const required_title = new Set<string>(['title']);
		expect(needs_attention_issue_for_detail_key({ title: '  ok  ' }, 'title', required_title)).toBe(
			false
		);
		expect(needs_attention_issue_for_detail_key({ title: '' }, 'title', required_title)).toBe(true);
	});

	it('treats shortcut-only catalog keys as non-column for generic missing check', () => {
		expect(
			needs_attention_issue_for_detail_key(
				{},
				'gps_either_missing',
				new Set(['gps_either_missing'])
			)
		).toBe(false);
	});

	it('flags lens shortcut when both lens fields empty (both display branches)', () => {
		const required_lens = new Set<string>(['lens_incomplete']);
		const empty_row = { lens_make: '', lens_model: '' };
		expect(needs_attention_issue_for_detail_key(empty_row, 'lens_make', required_lens)).toBe(true);
		expect(needs_attention_issue_for_detail_key(empty_row, 'lens_model', required_lens)).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ lens_make: 'Tokina', lens_model: '' },
				'lens_model',
				required_lens
			)
		).toBe(false);
		expect(
			needs_attention_issue_for_detail_key(
				{ lens_make: '', lens_model: '' },
				'iso_speed',
				required_lens
			)
		).toBe(false);
	});

	it('flags shot-date shortcut when datetime_original is not calendar-parseable', () => {
		const required_shot = new Set<string>(['shot_date_calendar_missing']);
		expect(
			needs_attention_issue_for_detail_key(
				{ datetime_original: 'not-parseable' },
				'datetime_original',
				required_shot
			)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ datetime_original: '2024-01-05' },
				'datetime_original',
				required_shot
			)
		).toBe(false);
	});

	it('flags exposure shortcut when both numeric and text exposure are missing', () => {
		const required_exposure = new Set<string>(['exposure_both_missing']);
		const empty_exposure = { exposure_time_seconds: null, exposure_time: '' };
		expect(
			needs_attention_issue_for_detail_key(empty_exposure, 'exposure_time', required_exposure)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				empty_exposure,
				'exposure_time_seconds',
				required_exposure
			)
		).toBe(true);
		expect(
			needs_attention_issue_for_detail_key(
				{ exposure_time_seconds: 0.01, exposure_time: '' },
				'exposure_time',
				required_exposure
			)
		).toBe(false);
		expect(
			needs_attention_issue_for_detail_key(empty_exposure, 'iso_speed', required_exposure)
		).toBe(false);
	});
});
