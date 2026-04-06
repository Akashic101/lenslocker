import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	apply_system_theme,
	persisted_theme_storage_key,
	read_stored_theme,
	toggle_persisted_color_scheme,
	use_system_color_scheme
} from './persisted_theme';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('persisted_theme_storage_key', () => {
	it('matches flowbite dark-mode storage name', () => {
		expect(persisted_theme_storage_key).toBe('THEME_PREFERENCE_KEY');
	});
});

describe('read_stored_theme', () => {
	it('returns null when localStorage is unavailable', () => {
		vi.stubGlobal('localStorage', undefined as unknown as Storage);
		expect(read_stored_theme()).toBe(null);
	});

	it('returns dark or light only when stored value is valid', () => {
		const store: Record<string, string> = {};
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => store[k] ?? null,
			setItem: (k: string, v: string) => {
				store[k] = v;
			},
			removeItem: (k: string) => {
				delete store[k];
			}
		} as Storage);

		store[persisted_theme_storage_key] = 'dark';
		expect(read_stored_theme()).toBe('dark');
		store[persisted_theme_storage_key] = 'light';
		expect(read_stored_theme()).toBe('light');
		store[persisted_theme_storage_key] = 'system';
		expect(read_stored_theme()).toBe(null);
	});
});

describe('apply_system_theme', () => {
	it('toggles document dark class from prefers-color-scheme', () => {
		const classes = new Set<string>();
		const root = {
			classList: {
				contains: (c: string) => classes.has(c),
				add: (c: string) => {
					classes.add(c);
				},
				remove: (c: string) => {
					classes.delete(c);
				}
			}
		};
		vi.stubGlobal('document', { documentElement: root });

		vi.stubGlobal('window', {
			matchMedia: (q: string) => ({
				matches: q.includes('prefers-color-scheme: dark')
			})
		});

		apply_system_theme();
		expect(classes.has('dark')).toBe(true);

		vi.stubGlobal('window', {
			matchMedia: () => ({ matches: false })
		});
		apply_system_theme();
		expect(classes.has('dark')).toBe(false);
	});
});

describe('toggle_persisted_color_scheme', () => {
	it('flips dark class and persists choice', () => {
		const store: Record<string, string> = {};
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => store[k] ?? null,
			setItem: (k: string, v: string) => {
				store[k] = v;
			},
			removeItem: (k: string) => {
				delete store[k];
			}
		} as Storage);

		const classes = new Set<string>();
		vi.stubGlobal('document', {
			documentElement: {
				classList: {
					contains: (c: string) => classes.has(c),
					add: (c: string) => {
						classes.add(c);
					},
					remove: (c: string) => {
						classes.delete(c);
					}
				}
			}
		});

		toggle_persisted_color_scheme();
		expect(classes.has('dark')).toBe(true);
		expect(store[persisted_theme_storage_key]).toBe('dark');

		toggle_persisted_color_scheme();
		expect(classes.has('dark')).toBe(false);
		expect(store[persisted_theme_storage_key]).toBe('light');
	});
});

describe('use_system_color_scheme', () => {
	it('clears storage and applies system theme', () => {
		let removed: string | null = null;
		const store: Record<string, string> = { [persisted_theme_storage_key]: 'dark' };
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => store[k] ?? null,
			setItem: (k: string, v: string) => {
				store[k] = v;
			},
			removeItem: (k: string) => {
				removed = k;
				delete store[k];
			}
		} as Storage);

		const classes = new Set<string>();
		vi.stubGlobal('document', {
			documentElement: {
				classList: {
					contains: (c: string) => classes.has(c),
					add: (c: string) => {
						classes.add(c);
					},
					remove: (c: string) => {
						classes.delete(c);
					}
				}
			}
		});

		vi.stubGlobal('window', {
			matchMedia: () => ({ matches: false })
		});

		use_system_color_scheme();
		expect(removed).toBe(persisted_theme_storage_key);
		expect(classes.has('dark')).toBe(false);
	});
});
