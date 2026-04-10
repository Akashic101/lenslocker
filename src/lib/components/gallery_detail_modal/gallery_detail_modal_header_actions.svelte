<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		ArchiveRestore,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ImageDown,
		Star,
		StarOff,
		Trash2
	} from '@lucide/svelte';

	let {
		prev_disabled,
		next_disabled,
		show_upload_actions,
		read_only_visitor = false,
		toggle_star_disabled,
		toggle_archive_disabled,
		detail_starred,
		detail_archived,
		download_preview_disabled,
		download_raw_disabled,
		download_menu_open = $bindable(false),
		on_prev,
		on_next,
		on_toggle_star,
		on_toggle_archive,
		on_download_preview,
		on_download_raw
	}: {
		prev_disabled: boolean;
		next_disabled: boolean;
		show_upload_actions: boolean;
		/** Public share visitor: only prev/next; no star/archive/download. */
		read_only_visitor?: boolean;
		toggle_star_disabled: boolean;
		toggle_archive_disabled: boolean;
		detail_starred: boolean;
		detail_archived: boolean;
		download_preview_disabled: boolean;
		download_raw_disabled: boolean;
		download_menu_open?: boolean;
		on_prev: () => void;
		on_next: () => void;
		on_toggle_star: () => void;
		on_toggle_archive: () => void;
		on_download_preview: () => void;
		on_download_raw: () => void;
	} = $props();

	const icon_button_neutral_class =
		'rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800';
</script>

<div class="flex shrink-0 items-center gap-0.5">
	<button
		type="button"
		class={icon_button_neutral_class}
		aria-label={m.aqua_merry_sloth_lightbox_prev_hint()}
		disabled={prev_disabled}
		onclick={on_prev}
	>
		<ChevronLeft class="h-5 w-5 shrink-0" />
	</button>
	<button
		type="button"
		class={icon_button_neutral_class}
		aria-label={m.coral_proof_ibex_lightbox_next_hint()}
		disabled={next_disabled}
		onclick={on_next}
	>
		<ChevronRight class="h-5 w-5 shrink-0" />
	</button>
	{#if show_upload_actions && !read_only_visitor}
		<button
			type="button"
			class="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-950/40"
			aria-label={detail_starred
				? m.dusty_round_owl_unstar_hint()
				: m.teal_happy_yak_star_photo_hint()}
			disabled={toggle_star_disabled}
			onclick={on_toggle_star}
		>
			{#if detail_starred}
				<StarOff class="h-5 w-5 shrink-0" />
			{:else}
				<Star class="h-5 w-5 shrink-0" />
			{/if}
		</button>
		<button
			type="button"
			class="rounded-lg p-2 disabled:pointer-events-none disabled:opacity-40 {detail_archived
				? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
				: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'}"
			aria-label={detail_archived
				? m.pale_stout_bass_unarchive_hint()
				: m.limp_brave_mole_archive_hint()}
			disabled={toggle_archive_disabled}
			onclick={on_toggle_archive}
		>
			{#if detail_archived}
				<ArchiveRestore class="h-5 w-5 shrink-0" />
			{:else}
				<Trash2 class="h-5 w-5 shrink-0" />
			{/if}
		</button>
		<details bind:open={download_menu_open} class="relative">
			<summary
				class="flex cursor-pointer list-none items-center justify-center gap-0.5 rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden"
				aria-label={m.happy_keen_crane_download_menu_hint()}
			>
				<ImageDown class="h-5 w-5 shrink-0" aria-hidden="true" />
				<ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
				<span class="sr-only">{m.tame_sleepy_ibex_download_button_sr()}</span>
			</summary>
			<div
				class="absolute inset-e-0 top-full z-60 mt-1 min-w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
				role="menu"
			>
				<button
					type="button"
					role="menuitem"
					class="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-700"
					disabled={download_preview_disabled}
					onclick={on_download_preview}
				>
					{m.each_misty_mink_download_full_jpeg()}
				</button>
				<button
					type="button"
					role="menuitem"
					class="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-700"
					disabled={download_raw_disabled}
					onclick={on_download_raw}
				>
					{m.wide_green_eel_download_raw_file()}
				</button>
			</div>
		</details>
	{/if}
</div>
