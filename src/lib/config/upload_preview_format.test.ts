import { describe, expect, it } from 'vitest';
import {
	is_upload_preview_format,
	upload_preview_format_file_ext,
	upload_preview_formats,
	type upload_preview_format
} from './upload_preview_format';

describe('upload_preview_formats', () => {
	it('lists supported preview codecs', () => {
		expect(upload_preview_formats).toEqual(['jpeg', 'webp', 'avif', 'png']);
	});
});

describe('is_upload_preview_format', () => {
	it('accepts only known format strings', () => {
		for (const fmt of upload_preview_formats) {
			expect(is_upload_preview_format(fmt)).toBe(true);
		}
		expect(is_upload_preview_format('jpg')).toBe(false);
		expect(is_upload_preview_format('')).toBe(false);
		expect(is_upload_preview_format(null)).toBe(false);
		expect(is_upload_preview_format(1)).toBe(false);
	});
});

describe('upload_preview_format_file_ext', () => {
	it('maps each format to a dotted file suffix', () => {
		expect(upload_preview_format_file_ext('jpeg')).toBe('.jpg');
		expect(upload_preview_format_file_ext('webp')).toBe('.webp');
		expect(upload_preview_format_file_ext('avif')).toBe('.avif');
		expect(upload_preview_format_file_ext('png')).toBe('.png');
	});

	it('exhaustive default runs if a caller asserts a non-format (covers runtime fallback)', () => {
		const not_a_format = 'gif' as upload_preview_format;
		expect(upload_preview_format_file_ext(not_a_format)).toBe('gif');
	});
});
