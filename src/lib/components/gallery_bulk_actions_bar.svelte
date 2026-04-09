<script lang="ts">
	import {
		ArchiveArrowDownOutline,
		FolderOutline,
		StarOutline,
		StarSolid,
		TrashBinOutline
	} from 'flowbite-svelte-icons';

	let {
		bulk_action_error,
		bulk_action_loading,
		gallery_selected_count,
		bulk_bar_can_archive,
		bulk_bar_can_restore,
		selected_count_label,
		hint_text,
		aria_bulk_region_label,
		label_all_on_page,
		label_clear_selection,
		label_done,
		label_star,
		label_unstar,
		label_archive,
		label_restore,
		label_add_to_album,
		on_select_all,
		on_clear_selection,
		on_done,
		on_star_change,
		on_archive_change,
		on_add_to_album
	}: {
		bulk_action_error: string | null;
		bulk_action_loading: boolean;
		gallery_selected_count: number;
		bulk_bar_can_archive: boolean;
		bulk_bar_can_restore: boolean;
		selected_count_label: string;
		hint_text: string;
		aria_bulk_region_label: string;
		label_all_on_page: string;
		label_clear_selection: string;
		label_done: string;
		label_star: string;
		label_unstar: string;
		label_archive: string;
		label_restore: string;
		label_add_to_album: string;
		on_select_all: () => void;
		on_clear_selection: () => void;
		on_done: () => void;
		on_star_change: (starred: boolean) => void;
		on_archive_change: (archive: boolean) => void;
		on_add_to_album: () => void;
	} = $props();

	const bulk_bar_button_class =
		'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';
</script>

<div
	class="sticky top-0 z-30 mb-4 rounded-lg bg-gray-50 px-3 py-2.5 shadow-sm dark:bg-gray-900"
	role="region"
	aria-label={aria_bulk_region_label}
>
	{#if bulk_action_error}
		<p class="mb-2 text-xs text-red-700 dark:text-red-300" role="alert">
			{bulk_action_error}
		</p>
	{/if}
	<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
		<span class="text-sm font-medium text-gray-800 dark:text-gray-200">
			{selected_count_label}
		</span>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class={bulk_bar_button_class}
				disabled={bulk_action_loading}
				onclick={on_select_all}
			>
				{label_all_on_page}
			</button>
			<button
				type="button"
				class={bulk_bar_button_class}
				disabled={bulk_action_loading || gallery_selected_count === 0}
				onclick={on_clear_selection}
			>
				{label_clear_selection}
			</button>
			<button
				type="button"
				class={bulk_bar_button_class}
				disabled={bulk_action_loading}
				onclick={on_done}
			>
				{label_done}
			</button>
		</div>
		<span class="hidden h-4 w-px bg-gray-300 sm:block dark:bg-gray-600" aria-hidden="true"></span>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="{bulk_bar_button_class} inline-flex items-center gap-1"
				disabled={bulk_action_loading || gallery_selected_count === 0}
				onclick={() => on_star_change(true)}
			>
				<StarSolid class="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
				{label_star}
			</button>
			<button
				type="button"
				class="{bulk_bar_button_class} inline-flex items-center gap-1"
				disabled={bulk_action_loading || gallery_selected_count === 0}
				onclick={() => on_star_change(false)}
			>
				<StarOutline class="h-3.5 w-3.5" aria-hidden="true" />
				{label_unstar}
			</button>
			{#if bulk_bar_can_archive}
				<button
					type="button"
					class="{bulk_bar_button_class} inline-flex items-center gap-1 text-red-700 dark:text-red-300"
					disabled={bulk_action_loading || gallery_selected_count === 0}
					onclick={() => on_archive_change(true)}
				>
					<TrashBinOutline class="h-3.5 w-3.5" aria-hidden="true" />
					{label_archive}
				</button>
			{/if}
			{#if bulk_bar_can_restore}
				<button
					type="button"
					class="{bulk_bar_button_class} inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
					disabled={bulk_action_loading || gallery_selected_count === 0}
					onclick={() => on_archive_change(false)}
				>
					<ArchiveArrowDownOutline class="h-3.5 w-3.5" aria-hidden="true" />
					{label_restore}
				</button>
			{/if}
			<button
				type="button"
				class="{bulk_bar_button_class} inline-flex items-center gap-1 text-primary-700 dark:text-primary-300"
				disabled={bulk_action_loading || gallery_selected_count === 0}
				onclick={on_add_to_album}
			>
				<FolderOutline class="h-3.5 w-3.5" aria-hidden="true" />
				{label_add_to_album}
			</button>
		</div>
	</div>
	<p class="mt-2 text-xs text-gray-600 dark:text-gray-400">
		{hint_text}
	</p>
</div>
