import { describe, expect, it } from 'vitest';
import { albums_list_depends_key } from './albums_cache';
import { dashboard_attention_settings_depends_key } from './dashboard_attention_settings_cache';
import { general_display_settings_depends_key } from './general_display_settings_cache';
import { gallery_active_upload_count_depends_key } from './gallery_upload_count_cache';
import { settings_backup_list_depends_key } from './settings_backup_list_cache';
import { transformed_media_depends_key } from './transformed_media_cache';
import { upload_pipeline_settings_depends_key } from './upload_pipeline_settings_cache';

const all_keys = [
	albums_list_depends_key,
	dashboard_attention_settings_depends_key,
	general_display_settings_depends_key,
	gallery_active_upload_count_depends_key,
	settings_backup_list_depends_key,
	transformed_media_depends_key,
	upload_pipeline_settings_depends_key
];

describe('lib/cache depends keys', () => {
	it('exports non-empty lenslocker-prefixed strings', () => {
		for (const key of all_keys) {
			expect(key.length).toBeGreaterThan(0);
			expect(key.startsWith('lenslocker:')).toBe(true);
		}
	});

	it('uses a distinct key per module', () => {
		expect(new Set(all_keys).size).toBe(all_keys.length);
	});

	it('general_display_settings_depends_key is stable for SvelteKit depends()', () => {
		expect(general_display_settings_depends_key).toBe('lenslocker:general_display_settings');
	});
});
