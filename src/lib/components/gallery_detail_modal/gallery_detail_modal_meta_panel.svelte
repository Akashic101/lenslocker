<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		upload_id,
		detail_loading,
		detail_error,
		detail,
		no_record,
		loading,
		detail_body
	}: {
		upload_id: string | null;
		detail_loading: boolean;
		detail_error: string | null;
		detail: Record<string, unknown> | null;
		no_record: Snippet;
		loading: Snippet;
		detail_body: Snippet;
	} = $props();

	const panel_shell_class =
		'flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden border-t border-gray-200 text-xs text-gray-800 sm:px-1 lg:w-[min(26rem,42vw)] lg:shrink-0 lg:border-t-0 lg:border-l dark:border-gray-700 dark:text-gray-200';
</script>

<div class={panel_shell_class}>
	{#if upload_id == null}
		<div class="overflow-y-auto px-1 py-3 sm:px-2">
			{@render no_record()}
		</div>
	{:else if detail_loading}
		<div class="px-1 py-3 sm:px-2">
			{@render loading()}
		</div>
	{:else if detail_error != null}
		<div class="px-1 py-3 sm:px-2">
			<p class="text-red-600 dark:text-red-400">{detail_error}</p>
		</div>
	{:else if detail != null}
		{@render detail_body()}
	{/if}
</div>
