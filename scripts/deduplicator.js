#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

const messages_dir = './messages';
const codebase_dir = './';
const file_extensions = ['.js', '.jsx', '.ts', '.tsx', '.svelte', '.vue'];

console.log('🚀 Starting translation deduplication...');

/**
 * Read and parse a JSON translation file
 */
function read_translation_file(file_path) {
	const content = readFileSync(file_path, 'utf-8');
	return JSON.parse(content);
}

/**
 * Find duplicate values and create a mapping of duplicates to first occurrence
 */
function find_duplicates(translations) {
	const value_to_keys = new Map();
	const key_mapping = {};
	const keys_to_delete = new Set();

	for (const [key, value] of Object.entries(translations)) {
		if (!value_to_keys.has(value)) value_to_keys.set(value, []);
		value_to_keys.get(value).push(key);
	}

	for (const [, keys] of value_to_keys.entries()) {
		if (keys.length > 1) {
			const first_key = keys[0];
			for (let i = 1; i < keys.length; i++) {
				key_mapping[keys[i]] = first_key;
				keys_to_delete.add(keys[i]);
			}
		}
	}

	return { key_mapping, keys_to_delete };
}

/**
 * Remove duplicate keys from translations object
 */
function remove_duplicates(translations, keys_to_delete) {
	const cleaned = { ...translations };
	for (const key of keys_to_delete) delete cleaned[key];
	return cleaned;
}

/**
 * Recursively find all files with specified extensions
 */
function find_files(dir, extensions, exclude_dirs = ['node_modules', '.git', 'dist', 'build']) {
	const files = [];

	function traverse(current_path) {
		const entries = readdirSync(current_path, { withFileTypes: true });
		for (const entry of entries) {
			const full_path = join(current_path, entry.name);
			if (entry.isDirectory() && !exclude_dirs.includes(entry.name)) {
				traverse(full_path);
			} else if (entry.isFile() && extensions.includes(extname(entry.name))) {
				files.push(full_path);
			}
		}
	}

	traverse(dir);
	return files;
}

/**
 * Replace old keys with new keys in code files
 * Only matches translation key patterns: m.key, {m.key}, m.key(), m.key({...})
 * Does NOT replace standalone occurrences of keys (e.g., variables named like translation keys)
 */
function replace_keys_in_file(file_path, key_mapping) {
	let content = readFileSync(file_path, 'utf-8');
	let modified = false;

	for (const [oldKey, newKey] of Object.entries(key_mapping)) {
		// Escape special regex characters in the key
		const escapedKey = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Patterns that match translation key usage - must have m. prefix:
		// 1. m.key (property access)
		// 2. {m.key} (in template expressions)
		// 3. m.key() (function call)
		// 4. m.key({...}) (function call with params)
		const patterns = [
			// Match m.key (with optional { } wrapper) - most common pattern
			// Uses word boundary before m to avoid matching things like "something.m.key"
			new RegExp(`(\\{)?\\bm\\.${escapedKey}\\b(\\})?`, 'g'),
			// Match m.key() or m.key({...}) - function call patterns
			new RegExp(`\\bm\\.${escapedKey}\\s*\\(`, 'g')
		];

		for (const pattern of patterns) {
			if (pattern.test(content)) {
				content = content.replace(pattern, (match) => {
					// Replace the key but preserve the m. prefix and any surrounding braces/parens
					return match.replace(new RegExp(`\\b${escapedKey}\\b`, 'g'), newKey);
				});
				modified = true;
			}
		}
	}

	if (modified) writeFileSync(file_path, content, 'utf-8');
	return modified;
}

/**
 * Extract translation keys used in codebase (flat keys: m.key or {m.key})
 */
function extract_used_keys(files) {
	const used_keys = new Set();
	const key_patterns = [/\{m\.([A-Za-z0-9_-]+)\}/g, /\bm\.([A-Za-z0-9_-]+)\b/g];

	for (const file of files) {
		const content = readFileSync(file, 'utf-8');
		for (const pattern of key_patterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				used_keys.add(match[1]);
			}
		}
	}

	return used_keys;
}

/**
 * Remove translation keys not used in codebase
 */
function remove_unused_keys(translations, code_files) {
	const used_keys = extract_used_keys(code_files);
	const cleaned = {};

	for (const [key, value] of Object.entries(translations)) {
		if (used_keys.has(key)) cleaned[key] = value;
	}

	return cleaned;
}

/**
 * Main deduplication + unused key cleanup
 */
function deduplicate_translations() {
	try {
		const translation_files = ['de.json', 'en.json'];
		const all_key_mappings = {};

		// Deduplicate translations
		for (const file_name of translation_files) {
			const file_path = join(messages_dir, file_name);
			if (!existsSync(file_path)) {
				console.log(`⚠️  ${file_name} not found, skipping...`);
				continue;
			}

			console.log(`📝 Processing ${file_name}...`);
			const translations = read_translation_file(file_path);
			const { key_mapping, keys_to_delete } = find_duplicates(translations);

			console.log(`   Found ${keys_to_delete.size} duplicate keys`);

			if (keys_to_delete.size > 0) {
				Object.assign(all_key_mappings, key_mapping);
				const cleaned = remove_duplicates(translations, keys_to_delete);
				writeFileSync(file_path, JSON.stringify(cleaned, null, 2) + '\n', 'utf-8');
				console.log(`   ✅ Removed ${keys_to_delete.size} duplicate entries`);
				for (const [old_key, new_key] of Object.entries(key_mapping)) {
					console.log(`      ${old_key} → ${new_key}`);
				}
			} else {
				console.log(`   ✅ No duplicates found`);
			}
			console.log('');
		}

		// Update codebase with new keys
		if (Object.keys(all_key_mappings).length > 0) {
			console.log('🔍 Updating codebase references for deduplicated keys...\n');
			const code_files = find_files(codebase_dir, file_extensions);
			let files_modified = 0;

			for (const file of code_files) {
				const was_modified = replace_keys_in_file(file, all_key_mappings);
				if (was_modified) {
					files_modified++;
					console.log(`   ✏️  Updated: ${file}`);
				}
			}

			console.log(`\n✅ Updated ${files_modified} file(s) in codebase\n`);
		}

		// Remove unused keys
		console.log('🧹 Removing unused translation keys...');
		const code_files = find_files(codebase_dir, file_extensions);

		for (const file_name of translation_files) {
			const file_path = join(messages_dir, file_name);
			if (!existsSync(file_path)) continue;

			const translations = read_translation_file(file_path);
			const cleaned = remove_unused_keys(translations, code_files);
			const removed_count = Object.keys(translations).length - Object.keys(cleaned).length;

			if (removed_count > 0) {
				writeFileSync(file_path, JSON.stringify(cleaned, null, 2) + '\n', 'utf-8');
				console.log(`   🗑️  Removed ${removed_count} unused keys from ${file_name}`);
			} else {
				console.log(`   ✅ No unused keys in ${file_name}`);
			}
		}

		console.log('\n🎉 Deduplication + cleanup complete!');
	} catch (err) {
		console.error('❌ Error during deduplication:', err);
	}
}

// Run the script
deduplicate_translations();
