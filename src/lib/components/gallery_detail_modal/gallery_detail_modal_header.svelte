<script lang="ts">
	import { CloseButton } from 'flowbite-svelte';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		heading,
		on_close,
		toolbar
	}: {
		heading: string;
		on_close: () => void;
		toolbar: Snippet;
	} = $props();
</script>

<div class="flex w-full min-w-0 items-center gap-1">
	<p
		class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white"
		title={heading}
	>
		{heading}
	</p>
	{@render toolbar()}
	<CloseButton
		class="shrink-0"
		name=""
		ariaLabel={m.brisk_tidy_finch_aria_close()}
		onclick={on_close}
	/>
</div>
