import { describe, expect, it } from 'vitest';
import {
	is_allowed_raw_upload_extension,
	raw_upload_extension_rejected_message,
	raw_upload_extensions
} from './raw_upload_extensions';

describe('is_allowed_raw_upload_extension', () => {
	it('accepts common camera RAW extensions case-insensitively', () => {
		expect(is_allowed_raw_upload_extension('DSC_0001.CR2')).toBe(true);
		expect(is_allowed_raw_upload_extension('DSC_0001.cr2')).toBe(true);
		expect(is_allowed_raw_upload_extension('image.NEF')).toBe(true);
		expect(is_allowed_raw_upload_extension('image.arw')).toBe(true);
		expect(is_allowed_raw_upload_extension('roll.RAF')).toBe(true);
		expect(is_allowed_raw_upload_extension('scan.tiff')).toBe(true);
		expect(is_allowed_raw_upload_extension('scan.TIF')).toBe(true);
		expect(is_allowed_raw_upload_extension('Adobe.DNG')).toBe(true);
	});

	it('rejects jpeg and png', () => {
		expect(is_allowed_raw_upload_extension('photo.jpg')).toBe(false);
		expect(is_allowed_raw_upload_extension('photo.JPEG')).toBe(false);
		expect(is_allowed_raw_upload_extension('shot.png')).toBe(false);
	});

	it('rejects names without an extension', () => {
		expect(is_allowed_raw_upload_extension('noextension')).toBe(false);
		expect(is_allowed_raw_upload_extension('')).toBe(false);
	});

	it('uses the final dot segment only', () => {
		expect(is_allowed_raw_upload_extension('archive.tar.gz')).toBe(false);
		expect(is_allowed_raw_upload_extension('image.preview.cr3')).toBe(true);
	});

	it('matches the published allow-list set', () => {
		expect(raw_upload_extensions.has('.x3f')).toBe(true);
		expect(raw_upload_extensions.has('.orf')).toBe(true);
		expect(raw_upload_extensions.has('.jpeg')).toBe(false);
	});
});

describe('raw_upload_extension_rejected_message', () => {
	it('is a stable non-empty user-facing string', () => {
		expect(raw_upload_extension_rejected_message.length).toBeGreaterThan(20);
		expect(raw_upload_extension_rejected_message).toContain('RAW');
	});
});
