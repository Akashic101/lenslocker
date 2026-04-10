import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const llbak_magic = Buffer.from('LLBAK1');
const llbak_header_len = llbak_magic.length + 1 + 1 + 1 + 1;
const llbak_version = 1;
const llbak_salt_len = 16;
const llbak_iv_len = 12;
const llbak_tag_len = 16;
const llbak_key_len = 32;

const scrypt_n = 16384;
const scrypt_r = 8;
const scrypt_p = 1;
const scrypt_maxmem_bytes = 64 * 1024 * 1024;

function has_llbak_magic(buf: Buffer): boolean {
	return (
		buf.length >= llbak_magic.length && buf.subarray(0, llbak_magic.length).equals(llbak_magic)
	);
}

async function derive_aes_key(password: string, salt: Buffer): Promise<Buffer> {
	const key = scryptSync(password, salt, llbak_key_len, {
		N: scrypt_n,
		r: scrypt_r,
		p: scrypt_p,
		maxmem: scrypt_maxmem_bytes
	});
	return key;
}

export function looks_like_llbak_buffer(buf: Buffer): boolean {
	return has_llbak_magic(buf);
}

export async function encrypt_zip_buffer_to_llbak(buf: Buffer, password: string): Promise<Buffer> {
	if (password === '') {
		throw new Error('Password is required for encrypted backup export');
	}
	const salt = randomBytes(llbak_salt_len);
	const iv = randomBytes(llbak_iv_len);
	const key = await derive_aes_key(password, salt);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(buf), cipher.final()]);
	const tag = cipher.getAuthTag();

	const header = Buffer.alloc(llbak_header_len);
	llbak_magic.copy(header, 0);
	header.writeUInt8(llbak_version, llbak_magic.length);
	header.writeUInt8(llbak_salt_len, llbak_magic.length + 1);
	header.writeUInt8(llbak_iv_len, llbak_magic.length + 2);
	header.writeUInt8(llbak_tag_len, llbak_magic.length + 3);

	return Buffer.concat([header, salt, iv, tag, ciphertext]);
}

export async function decrypt_llbak_buffer_to_zip(buf: Buffer, password: string): Promise<Buffer> {
	if (!has_llbak_magic(buf)) {
		throw new Error('Invalid encrypted backup format');
	}
	if (buf.length < llbak_header_len) {
		throw new Error('Invalid encrypted backup header');
	}
	const version = buf.readUInt8(llbak_magic.length);
	if (version !== llbak_version) {
		throw new Error(`Unsupported encrypted backup version: ${version}`);
	}
	const salt_len = buf.readUInt8(llbak_magic.length + 1);
	const iv_len = buf.readUInt8(llbak_magic.length + 2);
	const tag_len = buf.readUInt8(llbak_magic.length + 3);
	if (salt_len !== llbak_salt_len || iv_len !== llbak_iv_len || tag_len !== llbak_tag_len) {
		throw new Error('Invalid encrypted backup parameters');
	}
	const payload_off = llbak_header_len + salt_len + iv_len + tag_len;
	if (buf.length <= payload_off) {
		throw new Error('Encrypted backup has no payload');
	}
	const salt_off = llbak_header_len;
	const iv_off = salt_off + salt_len;
	const tag_off = iv_off + iv_len;
	const ciphertext_off = tag_off + tag_len;
	const salt = buf.subarray(salt_off, iv_off);
	const iv = buf.subarray(iv_off, tag_off);
	const tag = buf.subarray(tag_off, ciphertext_off);
	const ciphertext = buf.subarray(ciphertext_off);

	if (password === '') {
		throw new Error('Backup password is required');
	}
	const key = await derive_aes_key(password, salt);
	try {
		const decipher = createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	} catch {
		throw new Error('Invalid backup password or corrupted encrypted backup');
	}
}
