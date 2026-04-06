import { describe, expect, it, vi } from 'vitest';

vi.mock('flowbite-svelte-icons', () => {
	const make_icon_stub = (icon_id: string) => Object.freeze({ __test_icon_stub: icon_id });

	return {
		AdjustmentsHorizontalOutline: make_icon_stub('AdjustmentsHorizontalOutline'),
		AdjustmentsVerticalOutline: make_icon_stub('AdjustmentsVerticalOutline'),
		CameraPhotoOutline: make_icon_stub('CameraPhotoOutline'),
		ClockOutline: make_icon_stub('ClockOutline'),
		EyeOutline: make_icon_stub('EyeOutline'),
		FolderOutline: make_icon_stub('FolderOutline'),
		ImageOutline: make_icon_stub('ImageOutline')
	};
});

import {
	AdjustmentsHorizontalOutline,
	AdjustmentsVerticalOutline,
	CameraPhotoOutline,
	ClockOutline,
	EyeOutline,
	FolderOutline,
	ImageOutline
} from 'flowbite-svelte-icons';
import { meta_row_icon_for_key } from './meta_row_icon_for_key';

describe('meta_row_icon_for_key', () => {
	it('maps known meta row keys to flowbite icon components', () => {
		expect(meta_row_icon_for_key('camera')).toBe(CameraPhotoOutline);
		expect(meta_row_icon_for_key('lens')).toBe(EyeOutline);
		expect(meta_row_icon_for_key('dimensions')).toBe(ImageOutline);
		expect(meta_row_icon_for_key('datetime')).toBe(ClockOutline);
		expect(meta_row_icon_for_key('resolution')).toBe(AdjustmentsHorizontalOutline);
		expect(meta_row_icon_for_key('file_size')).toBe(FolderOutline);
		expect(meta_row_icon_for_key('exposure')).toBe(AdjustmentsVerticalOutline);
	});

	it('falls back to ImageOutline for unknown keys', () => {
		expect(meta_row_icon_for_key('unknown_key')).toBe(ImageOutline);
		expect(meta_row_icon_for_key('')).toBe(ImageOutline);
	});
});
