import { describe, expect, it, vi } from 'vitest';

vi.mock('@lucide/svelte', () => {
	const make_icon_stub = (icon_id: string) => Object.freeze({ __test_icon_stub: icon_id });

	return {
		Camera: make_icon_stub('Camera'),
		Clock: make_icon_stub('Clock'),
		Eye: make_icon_stub('Eye'),
		Folder: make_icon_stub('Folder'),
		Image: make_icon_stub('Image'),
		SlidersVertical: make_icon_stub('SlidersVertical')
	};
});
import { meta_row_icon_for_key } from './meta_row_icon_for_key';
import { Camera, Clock, Eye, Folder, Image, SlidersVertical } from '@lucide/svelte';

describe('meta_row_icon_for_key', () => {
	it('maps known meta row keys to lucide icon components', () => {
		expect(meta_row_icon_for_key('camera')).toBe(Camera);
		expect(meta_row_icon_for_key('lens')).toBe(Eye);
		expect(meta_row_icon_for_key('dimensions')).toBe(Image);
		expect(meta_row_icon_for_key('datetime')).toBe(Clock);
		expect(meta_row_icon_for_key('file_size')).toBe(Folder);
		expect(meta_row_icon_for_key('exposure')).toBe(SlidersVertical);
	});

	it('falls back to Image for unknown keys', () => {
		expect(meta_row_icon_for_key('unknown_key')).toBe(Image);
		expect(meta_row_icon_for_key('')).toBe(Image);
	});
});
