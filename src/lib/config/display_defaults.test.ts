import { describe, expect, it } from 'vitest';

import { general_display_defaults } from './display_defaults';

describe('general_display_defaults', () => {
	it('uses 24h as the default time format', () => {
		expect(general_display_defaults.time_format).toBe('24h');
	});
});
