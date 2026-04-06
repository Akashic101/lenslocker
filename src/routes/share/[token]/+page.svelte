<script lang="ts">
	import GalleryDetailModal from '$lib/components/gallery_detail_modal/gallery_detail_modal.svelte';
	import GalleryImageGrid from '$lib/components/gallery_image_grid.svelte';
	import type { gallery_grid_item } from '$lib/gallery/gallery_grid_types';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let gallery_detail_modal = $state<
		{ open_for_grid_item: (item: gallery_grid_item) => void } | undefined
	>();

	function on_tile_activate(item: gallery_grid_item): void {
		gallery_detail_modal?.open_for_grid_item(item);
	}
</script>

<svelte:head>
	<title>{data.title} — {m.vivid_flat_marten_share_sheet_title()}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">{data.title}</h1>

	{#if data.images.length === 0}
		<p class="text-center text-sm text-gray-500 dark:text-gray-400">
			{m.bad_vexed_carp_grasp_no_images_found()}
		</p>
	{:else}
		<GalleryImageGrid
			images={data.images}
			grid_list_class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
			show_meta={true}
			selection_mode={false}
			upload_is_selected={() => false}
			{on_tile_activate}
			has_more={false}
			load_more_in_flight={false}
			load_more_error={null}
			on_retry_load_more={() => {}}
		/>
	{/if}
</div>

<GalleryDetailModal
	bind:this={gallery_detail_modal}
	images={data.images}
	needs_attention_ui={false}
	needs_attention_required_keys={new Set()}
	read_only={true}
	share_token={data.token}
/>
