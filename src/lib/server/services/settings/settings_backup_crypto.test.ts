import { describe, expect, it } from 'vitest';

import {
	decrypt_llbak_buffer_to_zip,
	encrypt_zip_buffer_to_llbak,
	looks_like_llbak_buffer
} from './settings_backup_crypto';

describe('settings_backup_crypto', () => {
	it('roundtrips zip bytes with password', async () => {
		const zip_buf = Buffer.from('PK\x03\x04demo-zip', 'utf8');
		const encrypted = await encrypt_zip_buffer_to_llbak(zip_buf, 'secret-pass');
		expect(looks_like_llbak_buffer(encrypted)).toBe(true);
		const decrypted = await decrypt_llbak_buffer_to_zip(encrypted, 'secret-pass');
		expect(decrypted.equals(zip_buf)).toBe(true);
	});

	it('rejects wrong password', async () => {
		const zip_buf = Buffer.from('PK\x03\x04demo-zip', 'utf8');
		const encrypted = await encrypt_zip_buffer_to_llbak(zip_buf, 'correct-pass');
		await expect(decrypt_llbak_buffer_to_zip(encrypted, 'wrong-pass')).rejects.toThrow(
			'Invalid backup password or corrupted encrypted backup'
		);
	});

	it('rejects malformed envelope', async () => {
		const malformed = Buffer.from('LLBAK1', 'utf8');
		await expect(decrypt_llbak_buffer_to_zip(malformed, 'secret')).rejects.toThrow();
	});
});
