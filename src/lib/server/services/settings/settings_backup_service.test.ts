import { describe, expect, it } from 'vitest';

import { encrypt_zip_buffer_to_llbak } from './settings_backup_crypto';
import {
	import_settings_backup_from_zip_buffer,
	is_valid_settings_backup_filename
} from './settings_backup_service';

describe('settings_backup_service filename validation', () => {
	it('accepts both .zip and .llbak backup filenames', () => {
		expect(is_valid_settings_backup_filename('LensLocker-backup-2026-04-10-12-34-1.zip')).toBe(
			true
		);
		expect(is_valid_settings_backup_filename('LensLocker-backup-2026-04-10-12-34-2.llbak')).toBe(
			true
		);
	});
});

describe('settings_backup_service import protected format handling', () => {
	it('rejects encrypted backup without password', async () => {
		const encrypted = await encrypt_zip_buffer_to_llbak(
			Buffer.from('PK\x03\x04demo', 'utf8'),
			'secret'
		);
		await expect(import_settings_backup_from_zip_buffer(encrypted)).rejects.toThrow(
			'This backup is password-protected. Enter the backup password.'
		);
	});

	it('rejects encrypted backup with wrong password', async () => {
		const encrypted = await encrypt_zip_buffer_to_llbak(
			Buffer.from('PK\x03\x04demo', 'utf8'),
			'secret'
		);
		await expect(import_settings_backup_from_zip_buffer(encrypted, 'wrong')).rejects.toThrow(
			'Invalid backup password or corrupted encrypted backup'
		);
	});

	it('rejects unsupported backup format', async () => {
		await expect(
			import_settings_backup_from_zip_buffer(Buffer.from('not-a-backup'))
		).rejects.toThrow('Unsupported backup format. Expected .zip or .llbak');
	});
});
