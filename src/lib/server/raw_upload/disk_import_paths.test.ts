import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	raw_upload_file_to_relative_posix,
	resolve_relative_posix_under_root
} from './disk_import_paths';

describe('resolve_relative_posix_under_root', () => {
	const root = path.resolve('/data/raw');

	it('resolves safe relative segments', () => {
		const got = resolve_relative_posix_under_root('incoming/foo.arw', root);
		expect(got).toBe(path.join(root, 'incoming', 'foo.arw'));
	});

	it('rejects parent traversal', () => {
		expect(resolve_relative_posix_under_root('../etc/passwd', root)).toBeNull();
		expect(resolve_relative_posix_under_root('a/../../b', root)).toBeNull();
	});

	it('rejects nul bytes', () => {
		expect(resolve_relative_posix_under_root('a\0b.arw', root)).toBeNull();
	});
});

describe('raw_upload_file_to_relative_posix', () => {
	it('uses forward slashes in the relative path', () => {
		const root = path.resolve('/x');
		const file = path.join(root, '2025', '04', 'x.arw');
		expect(raw_upload_file_to_relative_posix(file, root)).toBe('2025/04/x.arw');
	});
});
