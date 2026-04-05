<script lang="ts">
	import { CheckOutline } from 'flowbite-svelte-icons';
	import type { gallery_grid_item } from '$lib/gallery/gallery_grid_types';
	import { meta_row_icon_for_key } from '$lib/gallery/meta_row_icon_for_key';
	import { m } from '$lib/paraglide/messages.js';
	import GalleryTileImageButton from '$lib/components/gallery_tile_image_button.svelte';

	const meta_icon_class = 'mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400';

	let {
		images,
		grid_list_class,
		show_meta,
		selection_mode,
		upload_is_selected,
		on_tile_activate,
		has_more,
		load_more_in_flight,
		load_more_error,
		on_retry_load_more,
		load_more_sentinel_el = $bindable<HTMLDivElement | null>(null)
	}: {
		images: gallery_grid_item[];
		grid_list_class: string;
		show_meta: boolean;
		selection_mode: boolean;
		upload_is_selected: (upload_id: string) => boolean;
		on_tile_activate: (item: gallery_grid_item, e: MouseEvent) => void;
		has_more: boolean;
		load_more_in_flight: boolean;
		load_more_error: string | null;
		on_retry_load_more: () => void;
		load_more_sentinel_el?: HTMLDivElement | null;
	} = $props();
</script>

<ul class={grid_list_class} role="list">
	{#each images as item (item.relative_path)}
		<li
			class="relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 {selection_mode &&
			item.upload_id != null &&
			upload_is_selected(item.upload_id)
				? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
				: ''}"
		>
			{#if selection_mode && item.upload_id != null}
				<span
					class="pointer-events-none absolute top-1.5 left-1.5 z-10 flex h-6 w-6 items-center justify-center rounded border-2 border-white bg-black/50 shadow dark:border-gray-800"
					aria-hidden="true"
				>
					{#if upload_is_selected(item.upload_id)}
						<CheckOutline class="h-4 w-4 text-white" />
					{/if}
				</span>
			{/if}
			<GalleryTileImageButton
				src={item.src}
				alt={item.alt}
				starred={item.starred}
				on_tile_click={(e) => on_tile_activate(item, e)}
			/>
			{#if show_meta && item.meta}
				<button
					type="button"
					class="w-full border-t border-gray-200 bg-white/90 px-2 py-2 text-left dark:border-gray-700 dark:bg-gray-950/90"
					onclick={(e) => on_tile_activate(item, e)}
				>
					<div class="space-y-1" role="group" aria-label={m.calm_gray_martin_aria_photo_details()}>
						{#each item.meta.rows as row, row_i (`${item.relative_path}-${row.key}-${row_i}`)}
							{@const Icon = meta_row_icon_for_key(row.key)}
							<div class="flex gap-1.5 text-[10px] leading-snug text-gray-700 dark:text-gray-300">
								<Icon class={meta_icon_class} aria-hidden="true" />
								<span class="min-w-0 wrap-break-word">{row.text}</span>
							</div>
						{/each}
					</div>
				</button>
			{/if}
		</li>
	{/each}
</ul>

{#if has_more}
	<div bind:this={load_more_sentinel_el} class="h-1 w-full shrink-0" aria-hidden="true"></div>
{/if}

{#if load_more_in_flight}
	<p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400" role="status">
		{m.small_proud_robin_wait_preparing()}
	</p>
{/if}

{#if load_more_error != null}
	<p class="mt-4 text-center text-sm text-red-600 dark:text-red-400" role="alert">
		{load_more_error}
		<button type="button" class="ms-2 underline" onclick={on_retry_load_more}>
			{m.still_kind_racoon_engage_next()}
		</button>
	</p>
{/if}
