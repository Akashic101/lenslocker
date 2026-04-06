import { describe, expect, it } from 'vitest';
import { app_form_field_class, app_form_field_class_max_w_md } from './form_classes';

describe('form_classes', () => {
	it('exports tailwind utility strings for shared inputs', () => {
		expect(app_form_field_class.length).toBeGreaterThan(20);
		expect(app_form_field_class).toContain('w-full');
		expect(app_form_field_class).toContain('rounded-lg');
		expect(app_form_field_class_max_w_md).toContain(app_form_field_class);
		expect(app_form_field_class_max_w_md).toContain('max-w-md');
	});
});
