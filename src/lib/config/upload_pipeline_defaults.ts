import type { upload_preview_format } from './upload_preview_format';

/** Client-safe defaults; keep aligned with `clamp_upload_preview_pipeline_settings` bounds on the server. */
export const upload_preview_pipeline_defaults = {
	thumb_max_edge_px: 480,
	max_full_edge_px: 8192,
	jpeg_q_thumb: 82,
	jpeg_q_full: 93,
	max_upload_bytes: 512 * 1024 * 1024,
	upload_preview_format: 'jpeg' as upload_preview_format
};

export type upload_preview_pipeline_settings = {
	thumb_max_edge_px: number;
	max_full_edge_px: number;
	jpeg_q_thumb: number;
	jpeg_q_full: number;
	max_upload_bytes: number;
	upload_preview_format: upload_preview_format;
};
