import { describe, expect, it } from 'vitest';
import {
	type upload_preview_pipeline_settings,
	upload_preview_pipeline_defaults
} from './upload_pipeline_defaults';

describe('upload_preview_pipeline_defaults', () => {
	it('uses sane numeric bounds', () => {
		const d = upload_preview_pipeline_defaults;
		expect(d.thumb_max_edge_px).toBeGreaterThan(0);
		expect(d.max_full_edge_px).toBeGreaterThanOrEqual(d.thumb_max_edge_px);
		expect(d.jpeg_q_thumb).toBeGreaterThanOrEqual(1);
		expect(d.jpeg_q_thumb).toBeLessThanOrEqual(100);
		expect(d.jpeg_q_full).toBeGreaterThanOrEqual(1);
		expect(d.jpeg_q_full).toBeLessThanOrEqual(100);
		expect(d.max_upload_bytes).toBe(512 * 1024 * 1024);
	});

	it('defaults preview format to jpeg', () => {
		expect(upload_preview_pipeline_defaults.upload_preview_format).toBe('jpeg');
	});

	it('matches upload_preview_pipeline_settings shape', () => {
		const row: upload_preview_pipeline_settings = upload_preview_pipeline_defaults;
		expect(Object.keys(row).sort()).toEqual(
			[
				'jpeg_q_full',
				'jpeg_q_thumb',
				'max_full_edge_px',
				'max_upload_bytes',
				'thumb_max_edge_px',
				'upload_preview_format'
			].sort()
		);
	});
});
