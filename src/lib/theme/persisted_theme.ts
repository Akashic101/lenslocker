/** Matches flowbite-svelte `DarkMode` so existing saved choices keep working. */
export const persisted_theme_storage_key = 'THEME_PREFERENCE_KEY';

type persisted_theme_value = 'dark' | 'light';

export function read_stored_theme(): persisted_theme_value | null {
	if (typeof localStorage === 'undefined') return null;
	const raw = localStorage.getItem(persisted_theme_storage_key);
	if (raw === 'dark' || raw === 'light') return raw;
	return null;
}

/** Apply OS light/dark when the user has not chosen an explicit theme. */
export function apply_system_theme(): void {
	const root = document.documentElement;
	if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

export function toggle_persisted_color_scheme(): void {
	const root = document.documentElement;
	const next_is_dark = !root.classList.contains('dark');
	if (next_is_dark) {
		root.classList.add('dark');
		localStorage.setItem(persisted_theme_storage_key, 'dark');
	} else {
		root.classList.remove('dark');
		localStorage.setItem(persisted_theme_storage_key, 'light');
	}
}

export function use_system_color_scheme(): void {
	localStorage.removeItem(persisted_theme_storage_key);
	apply_system_theme();
}
