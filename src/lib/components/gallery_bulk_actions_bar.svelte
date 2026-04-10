<script lang="ts">
	import { SpeedDial, SpeedDialButton, SpeedDialTrigger } from 'flowbite-svelte';
	import {
		Images,
		Eraser,
		Star,
		StarOff,
		Trash2,
		FolderOpen,
		Trash,
		EllipsisVertical
	} from '@lucide/svelte/icons';
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
		label_star,
		label_unstar,
		label_archive,
		label_restore,
		label_add_to_album,
		on_select_all,
		on_clear_selection,
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
</script>

<div class="z-30" role="region" aria-label={aria_bulk_region_label}>
	{#if bulk_action_error}
		<p
			class="fixed right-6 bottom-24 z-40 max-w-xs rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950 dark:text-red-300"
			role="alert"
		>
			{bulk_action_error}
		</p>
	{/if}
	<span class="sr-only">{hint_text}</span>
	<SpeedDialTrigger class="fixed right-6 bottom-6 z-30" name={selected_count_label}>
		<EllipsisVertical class="h-5 w-5" aria-hidden="true" />
	</SpeedDialTrigger>
	<SpeedDial class="fixed right-6 bottom-6 z-30">
		<SpeedDialButton
			name={label_all_on_page}
			disabled={bulk_action_loading}
			onclick={on_select_all}
		>
			<Images class="h-4 w-4 text-amber-500" aria-hidden="true" />
		</SpeedDialButton>
		<SpeedDialButton
			name={label_clear_selection}
			disabled={bulk_action_loading || gallery_selected_count === 0}
			onclick={on_clear_selection}
		>
			<Eraser class="h-4 w-4" aria-hidden="true" />
		</SpeedDialButton>
		<SpeedDialButton
			name={label_star}
			disabled={bulk_action_loading || gallery_selected_count === 0}
			onclick={() => on_star_change(true)}
		>
			<Star class="h-4 w-4 text-amber-500" aria-hidden="true" />
		</SpeedDialButton>
		<SpeedDialButton
			name={label_unstar}
			disabled={bulk_action_loading || gallery_selected_count === 0}
			onclick={() => on_star_change(false)}
		>
			<StarOff class="h-4 w-4" aria-hidden="true" />
		</SpeedDialButton>
		{#if bulk_bar_can_archive}
			<SpeedDialButton
				name={label_archive}
				disabled={bulk_action_loading || gallery_selected_count === 0}
				onclick={() => on_archive_change(true)}
			>
				<Trash2 class="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
			</SpeedDialButton>
		{/if}
		{#if bulk_bar_can_restore}
			<SpeedDialButton
				name={label_restore}
				disabled={bulk_action_loading || gallery_selected_count === 0}
				onclick={() => on_archive_change(false)}
			>
				<Trash class="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
			</SpeedDialButton>
		{/if}
		<SpeedDialButton
			name={label_add_to_album}
			disabled={bulk_action_loading || gallery_selected_count === 0}
			onclick={on_add_to_album}
		>
			<FolderOpen class="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
		</SpeedDialButton>
	</SpeedDial>
</div>
