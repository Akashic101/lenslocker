<script lang="ts">
	import { Pencil } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		meta_editing,
		meta_save_loading,
		on_begin_edit,
		on_cancel_edit,
		on_save
	}: {
		meta_editing: boolean;
		meta_save_loading: boolean;
		on_begin_edit: () => void;
		on_cancel_edit: () => void;
		on_save: () => void;
	} = $props();
</script>

<div
	class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-gray-200 px-1 py-2 sm:px-2 dark:border-gray-800"
>
	{#if !meta_editing}
		<button
			type="button"
			class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
			onclick={on_begin_edit}
		>
			<Pencil class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
			{m.tense_caring_pug_bake_edit_metadata()}
		</button>
	{:else}
		<button
			type="button"
			class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
			disabled={meta_save_loading}
			onclick={on_cancel_edit}
		>
			{m.low_seemly_crow_slurp_cancel()}
		</button>
		<button
			type="button"
			class="rounded-lg bg-primary-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
			disabled={meta_save_loading}
			onclick={on_save}
		>
			{meta_save_loading
				? m.fierce_small_goat_busy_saving_display()
				: m.bold_calm_koala_save_changes()}
		</button>
	{/if}
</div>
