import { describe, expect, it } from 'vitest';
import { upload_meta_editable_field_list } from './upload_meta_editable_fields';

const allowed_kinds = new Set(['text', 'number', 'textarea']);

describe('upload_meta_editable_field_list', () => {
	it('has entries with key, label, and allowed kind', () => {
		expect(upload_meta_editable_field_list.length).toBeGreaterThan(0);
		for (const row of upload_meta_editable_field_list) {
			expect(row.key.length).toBeGreaterThan(0);
			expect(row.label.length).toBeGreaterThan(0);
			expect(allowed_kinds.has(row.kind)).toBe(true);
		}
	});

	it('uses unique keys', () => {
		const keys = upload_meta_editable_field_list.map((r) => r.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('includes representative fields', () => {
		const key_set = new Set(upload_meta_editable_field_list.map((r) => r.key));
		expect(key_set.has('original_filename')).toBe(true);
		expect(key_set.has('caption')).toBe(true);
		expect(key_set.has('rating')).toBe(true);
		const user_comment = upload_meta_editable_field_list.find((r) => r.key === 'user_comment');
		expect(user_comment?.kind).toBe('textarea');
	});
});
