<script lang="ts">
	import type { gallery_modal_detail_view_row } from '$lib/gallery/gallery_modal_detail_view_row';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { m } from '$lib/paraglide/messages.js';

	let { rows }: { rows: gallery_modal_detail_view_row[] } = $props();

	function format_detail_value(value: unknown): string {
		if (value === null || value === undefined) return m.flat_moody_gull_detail_empty_dash();
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<dl class="space-y-2">
	{#each rows as view_row (view_row.key)}
		<div class="border-b border-gray-100 pb-2 last:border-0 dark:border-gray-800">
			<dt
				class="flex items-start gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400"
				class:font-mono={view_row.label === view_row.key}
				title={view_row.key}
			>
				{#if view_row.attention_issue}
					<ExclamationCircleOutline
						class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400"
						aria-hidden="true"
					/>
					<span class="sr-only">{m.left_fresh_dolphin_nail_missing_data()}:</span>
				{/if}
				<span class="min-w-0">{view_row.label}</span>
			</dt>
			<dd
				class="mt-0.5 font-mono text-[11px] wrap-break-word"
				class:text-red-700={view_row.attention_issue}
				class:dark:text-red-300={view_row.attention_issue}
			>
				{format_detail_value(view_row.value)}
			</dd>
		</div>
	{/each}
</dl>
