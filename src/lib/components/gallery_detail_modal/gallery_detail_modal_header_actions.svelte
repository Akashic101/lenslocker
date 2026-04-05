<script lang="ts">
	import {
		ArchiveArrowDownOutline,
		ChevronDownOutline,
		ChevronLeftOutline,
		ChevronRightOutline,
		DownloadOutline,
		StarOutline,
		StarSolid,
		TrashBinOutline
	} from 'flowbite-svelte-icons';
	import { m } from '$lib/paraglide/messages.js';

	let {
		prev_disabled,
		next_disabled,
		show_upload_actions,
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
		aria-label={m.brisk_tidy_finch_aria_prev_image()}
		disabled={prev_disabled}
		onclick={on_prev}
	>
		<ChevronLeftOutline class="h-5 w-5 shrink-0" />
	</button>
	<button
		type="button"
		class={icon_button_neutral_class}
		aria-label={m.brisk_tidy_finch_aria_next_image()}
		disabled={next_disabled}
		onclick={on_next}
	>
		<ChevronRightOutline class="h-5 w-5 shrink-0" />
	</button>
	{#if show_upload_actions}
		<button
			type="button"
			class="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-950/40"
			aria-label={detail_starred
				? m.brisk_tidy_finch_aria_remove_star()
				: m.brisk_tidy_finch_aria_star_image()}
			disabled={toggle_star_disabled}
			onclick={on_toggle_star}
		>
			{#if detail_starred}
				<StarSolid class="h-5 w-5 shrink-0" />
			{:else}
				<StarOutline class="h-5 w-5 shrink-0" />
			{/if}
		</button>
		<button
			type="button"
			class="rounded-lg p-2 disabled:pointer-events-none disabled:opacity-40 {detail_archived
				? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
				: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'}"
			aria-label={detail_archived
				? m.brisk_tidy_finch_aria_restore_gallery()
				: m.brisk_tidy_finch_aria_archive_image()}
			disabled={toggle_archive_disabled}
			onclick={on_toggle_archive}
		>
			{#if detail_archived}
				<ArchiveArrowDownOutline class="h-5 w-5 shrink-0" />
			{:else}
				<TrashBinOutline class="h-5 w-5 shrink-0" />
			{/if}
		</button>
		<details bind:open={download_menu_open} class="relative">
			<summary
				class="flex cursor-pointer list-none items-center justify-center gap-0.5 rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden"
				aria-label={m.quick_polite_gecko_modal_download_aria()}
			>
				<DownloadOutline class="h-5 w-5 shrink-0" aria-hidden="true" />
				<ChevronDownOutline class="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
				<span class="sr-only">{m.quick_polite_gecko_modal_download_trigger()}</span>
			</summary>
			<div
				class="absolute end-0 top-full z-[60] mt-1 min-w-[11rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
				role="menu"
			>
				<button
					type="button"
					role="menuitem"
					class="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-700"
					disabled={download_preview_disabled}
					onclick={on_download_preview}
				>
					{m.quick_polite_gecko_modal_download_preview()}
				</button>
				<button
					type="button"
					role="menuitem"
					class="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-700"
					disabled={download_raw_disabled}
					onclick={on_download_raw}
				>
					{m.quick_polite_gecko_modal_download_raw()}
				</button>
			</div>
		</details>
	{/if}
</div>
