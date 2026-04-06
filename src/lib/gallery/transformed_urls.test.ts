import { describe, expect, it, vi } from 'vitest';

/** `$app/paths` is a SvelteKit module; stub `resolve` so this unit runs in Vitest without a full app shell. */
vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

import { transformed_media_url } from './transformed_urls';

describe('transformed_media_url', () => {
	it('prefixes media route and encodes each path segment', () => {
		expect(transformed_media_url('upload-previews/abc_thumb.jpg')).toBe(
			'/media/transformed/upload-previews/abc_thumb.jpg'
		);
	});

	it('percent-encodes special characters per segment', () => {
		expect(transformed_media_url('upload-previews/my photo_thumb.jpg')).toBe(
			'/media/transformed/upload-previews/my%20photo_thumb.jpg'
		);
		expect(transformed_media_url('seg/with/slash?in-name')).toBe(
			'/media/transformed/seg/with/slash%3Fin-name'
		);
	});

	it('handles a single segment', () => {
		expect(transformed_media_url('only.jpg')).toBe('/media/transformed/only.jpg');
	});

	it('handles empty relative path', () => {
		expect(transformed_media_url('')).toBe('/media/transformed/');
	});
});
