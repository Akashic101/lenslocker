<script lang="ts">
	import { browser } from '$app/environment';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { apply_system_theme, read_stored_theme } from '$lib/theme/persisted_theme';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if (!browser) return;
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const on_system_theme_change = () => {
			if (read_stored_theme() === null) apply_system_theme();
		};
		media.addEventListener('change', on_system_theme_change);
		return () => media.removeEventListener('change', on_system_theme_change);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
