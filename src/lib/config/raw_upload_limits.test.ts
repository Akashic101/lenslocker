import { describe, expect, it } from 'vitest';
import { max_raw_upload_bytes } from './raw_upload_limits';
import { upload_preview_pipeline_defaults } from './upload_pipeline_defaults';

describe('max_raw_upload_bytes', () => {
	it('matches default pipeline max upload size', () => {
		expect(max_raw_upload_bytes).toBe(upload_preview_pipeline_defaults.max_upload_bytes);
	});
});
