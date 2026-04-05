<script lang="ts">
	import { toggle_persisted_color_scheme } from '$lib/theme/persisted_theme';

	/** Mirrors flowbite-svelte `darkmode` tv base (no extra theme merge). */
	const toggle_button_class =
		'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-hidden rounded-lg text-sm p-2.5';

	function on_click(ev: MouseEvent): void {
		const target = ev.currentTarget as HTMLElement;
		if (target.ownerDocument !== document) return;
		toggle_persisted_color_scheme();
	}
</script>

<button type="button" class={toggle_button_class} aria-label="Toggle dark mode" onclick={on_click}>
	<span class="hidden dark:block">
		<svg
			role="img"
			aria-label="Light mode"
			class="h-5 w-5"
			fill="currentColor"
			viewBox="0 0 20 20"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
				fill-rule="evenodd"
				clip-rule="evenodd"
			/>
		</svg>
	</span>
	<span class="block dark:hidden">
		<svg
			role="img"
			aria-label="Dark mode"
			class="h-5 w-5"
			fill="currentColor"
			viewBox="0 0 20 20"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
		</svg>
	</span>
</button>
