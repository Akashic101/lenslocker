import { upload_preview_pipeline_defaults } from './upload_pipeline_defaults';

/** Fallback max upload size (matches default pipeline settings). Prefer `data.upload_pipeline_settings` from the upload page load. */
export const max_raw_upload_bytes = upload_preview_pipeline_defaults.max_upload_bytes;
