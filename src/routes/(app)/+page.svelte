<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import GalleryImageGrid from '$lib/components/gallery_image_grid.svelte';
	import { albums_list_depends_key } from '$lib/cache/albums_cache';
	import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/cache/transformed_media_cache';
	import { needs_attention_label_for_key } from '$lib/gallery/needs_attention_catalog';
	import GalleryAddToAlbumModal from '$lib/components/gallery_add_to_album_modal.svelte';
	import GallerySharePanel from '$lib/components/gallery_share_panel.svelte';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages.js';
	import { raw_upload_batch_activity } from '$lib/gallery/raw_upload_batch_activity.svelte';
	import type { gallery_grid_item } from '$lib/gallery/gallery_grid_types';
	import type { PageData } from './$types';
	import GalleryBulkActionsBar from '$lib/components/gallery_bulk_actions_bar.svelte';
	import GalleryDetailModal from '$lib/components/gallery_detail_modal/gallery_detail_modal.svelte';
	import { app_form_field_class } from '$lib/ui/form_classes';
	import { CheckCheck, Folder, Funnel, FunnelX, Grid2x2, LayoutGrid, Share2 } from '@lucide/svelte';

	/* eslint-disable svelte/no-navigation-without-resolve -- localizeHref; /media/transformed/* URLs are not typed routes */

	type gallery_meta_camera_pair = { make: string; model: string };
	type gallery_meta_lens_pair = { lens_make: string; lens_model: string };

	let { data }: { data: PageData } = $props();

	/**
	 * Panel visibility is only toggled by the filters button. EXIF/starred params in the URL stay
	 * applied when the panel is hidden. `gallery_focus` does not affect the panel.
	 */
	let filters_panel_user_open = $state(false);

	/** EXIF fields + starred-only; excludes `gallery_focus` (view mode). */
	const gallery_exif_star_filter_count = $derived.by((): number => {
		const g = data.gallery_filters;
		let n = 0;
		if (g.camera_make.trim() !== '') n++;
		if (g.camera_model.trim() !== '') n++;
		if (g.lens_make.trim() !== '') n++;
		if (g.lens_model.trim() !== '') n++;
		if (g.date_from.trim() !== '') n++;
		if (g.date_to.trim() !== '') n++;
		if (g.iso_min.trim() !== '') n++;
		if (g.iso_max.trim() !== '') n++;
		if (g.starred_only) n++;
		return n;
	});

	const needs_attention_required_key_set = $derived(
		new SvelteSet<string>(data.needs_attention_settings.required_field_keys as string[])
	);

	const gallery_view_blurb = $derived.by((): string | null => {
		const f = data.gallery_filters.gallery_focus;
		if (f === 'needs_attention') {
			const keys = data.needs_attention_settings.required_field_keys;
			if (keys.length === 0) {
				return m.steep_mild_crane_gallery_blurb_needs_attention_no_rules();
			}
			const labels = keys.map((key: string) => needs_attention_label_for_key(key));
			return m.bold_koala_gallery_blurb_needs_attention_rules({ rules: labels.join('; ') });
		}
		if (f === 'archived') {
			return m.soft_plain_goose_gallery_blurb_archived();
		}
		if (f === 'albums') {
			return m.plain_bright_lynx_albums_hub_blurb();
		}
		if (f === 'album') {
			if (data.current_album != null) {
				return m.calm_short_stork_album_view_blurb({ name: data.current_album.name });
			}
			return m.dull_keen_ibex_album_invalid_blurb();
		}
		return null;
	});

	/** Reset EXIF filters but stay on the same dashboard view. */
	const dashboard_clear_href = $derived.by(() => {
		const g = data.gallery_filters;
		const q = new SvelteURLSearchParams();
		if (g.gallery_focus != null) {
			q.set('gallery_focus', g.gallery_focus);
		}
		if (g.gallery_focus === 'album' && g.album_id != null && g.album_id !== '') {
			q.set('album_id', g.album_id);
		}
		q.set('sort', g.sort);
		const s = q.toString();
		return s !== '' ? localizeHref(`/?${s}`) : localizeHref('/');
	});

	function on_gallery_sort_change(ev: Event): void {
		if (!browser) return;
		if (raw_upload_batch_activity.in_progress) return;
		const sel = ev.currentTarget as HTMLSelectElement;
		const next = sel.value;
		if (next === data.gallery_filters.sort) return;
		const q = new SvelteURLSearchParams(data.gallery_filter_query);
		q.set('sort', next);
		const path = page.url.pathname;
		void goto(localizeHref(`${path}?${q.toString()}`), { keepFocus: true, noScroll: true });
	}

	function on_filters_toggle_click(): void {
		if (raw_upload_batch_activity.in_progress) return;
		filters_panel_user_open = !filters_panel_user_open;
	}

	const modal_needs_attention_ui = $derived(
		data.gallery_filters.gallery_focus === 'needs_attention'
	);

	const gallery_grid_meta_storage_key = 'lenslocker_gallery_grid_show_meta';

	/** When true, each tile shows EXIF/caption rows under the thumbnail. */
	let gallery_grid_show_meta = $state(true);

	onMount(() => {
		if (!browser) return;
		const raw = localStorage.getItem(gallery_grid_meta_storage_key);
		if (raw === '0') gallery_grid_show_meta = false;
	});

	function toggle_gallery_grid_show_meta(): void {
		gallery_grid_show_meta = !gallery_grid_show_meta;
		if (browser) {
			localStorage.setItem(gallery_grid_meta_storage_key, gallery_grid_show_meta ? '1' : '0');
		}
	}

	const gallery_grid_list_class = $derived(
		gallery_grid_show_meta
			? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
			: 'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
	);

	const gallery_header_icon_button_class =
		'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

	const gallery_header_icon_glyph_class = 'h-5 w-5 shrink-0 text-gray-600 dark:text-gray-300';

	let filter_camera_make = $state('');
	let filter_camera_model = $state('');
	let filter_lens_make = $state('');
	let filter_lens_model = $state('');
	let filter_date_from = $state('');
	let filter_date_to = $state('');
	let filter_iso_min = $state('');
	let filter_iso_max = $state('');
	let filter_starred_only = $state(false);

	$effect(() => {
		filter_camera_make = data.gallery_filters.camera_make;
		filter_camera_model = data.gallery_filters.camera_model;
		filter_lens_make = data.gallery_filters.lens_make;
		filter_lens_model = data.gallery_filters.lens_model;
		filter_date_from = data.gallery_filters.date_from;
		filter_date_to = data.gallery_filters.date_to;
		filter_iso_min = data.gallery_filters.iso_min;
		filter_iso_max = data.gallery_filters.iso_max;
		filter_starred_only = data.gallery_filters.starred_only;
	});

	const gallery_camera_makes = $derived.by(() => {
		const s = new SvelteSet<string>();
		for (const p of data.gallery_filter_meta.camera_pairs) {
			const m = p.make.trim();
			if (m !== '') s.add(m);
		}
		return [...s].sort((a, b) => a.localeCompare(b));
	});

	const gallery_camera_models = $derived.by(() => {
		const pairs = data.gallery_filter_meta.camera_pairs as gallery_meta_camera_pair[];
		const make_lc = filter_camera_make.trim().toLowerCase();
		const camera_models_trimmed: string[] = pairs
			.map((p) => p.model.trim())
			.filter((m) => m !== '');
		const all = [...new Set(camera_models_trimmed)].sort((a, b) => a.localeCompare(b));
		if (make_lc === '') return all;
		const narrowed_trimmed: string[] = pairs
			.filter((p) => p.make.trim().toLowerCase() === make_lc)
			.map((p) => p.model.trim())
			.filter((m) => m !== '');
		const narrowed = [...new Set(narrowed_trimmed)].sort((a, b) => a.localeCompare(b));
		return narrowed.length > 0 ? narrowed : all;
	});

	const gallery_lens_makes = $derived.by(() => {
		const s = new SvelteSet<string>();
		for (const p of data.gallery_filter_meta.lens_pairs) {
			const m = p.lens_make.trim();
			if (m !== '') s.add(m);
		}
		return [...s].sort((a, b) => a.localeCompare(b));
	});

	const gallery_lens_models = $derived.by(() => {
		const pairs = data.gallery_filter_meta.lens_pairs as gallery_meta_lens_pair[];
		const make_lc = filter_lens_make.trim().toLowerCase();
		const lens_models_trimmed: string[] = pairs
			.map((p) => p.lens_model.trim())
			.filter((m) => m !== '');
		const all = [...new Set(lens_models_trimmed)].sort((a, b) => a.localeCompare(b));
		if (make_lc === '') return all;
		const narrowed_trimmed: string[] = pairs
			.filter((p) => p.lens_make.trim().toLowerCase() === make_lc)
			.map((p) => p.lens_model.trim())
			.filter((m) => m !== '');
		const narrowed = [...new Set(narrowed_trimmed)].sort((a, b) => a.localeCompare(b));
		return narrowed.length > 0 ? narrowed : all;
	});

	const iso_placeholder_min = $derived(
		data.gallery_filter_meta.iso_stats.min != null
			? String(data.gallery_filter_meta.iso_stats.min)
			: m.tiny_neat_wren_placeholder_iso_min()
	);
	const iso_placeholder_max = $derived(
		data.gallery_filter_meta.iso_stats.max != null
			? String(data.gallery_filter_meta.iso_stats.max)
			: m.tiny_neat_wren_placeholder_iso_max()
	);

	const date_input_min = $derived(
		data.gallery_filter_meta.date_stats.min != null &&
			/^\d{4}-\d{2}-\d{2}$/.test(data.gallery_filter_meta.date_stats.min)
			? data.gallery_filter_meta.date_stats.min
			: undefined
	);
	const date_input_max = $derived(
		data.gallery_filter_meta.date_stats.max != null &&
			/^\d{4}-\d{2}-\d{2}$/.test(data.gallery_filter_meta.date_stats.max)
			? data.gallery_filter_meta.date_stats.max
			: undefined
	);

	function on_filter_camera_make_change(): void {
		filter_camera_model = '';
	}

	function on_filter_lens_make_change(): void {
		filter_lens_model = '';
	}

	let gallery_selection_mode = $state(false);
	let gallery_selected_upload_ids = $state<string[]>([]);
	/** Grid index for shift+click range select; reset when the selection list is cleared. */
	let gallery_selection_anchor_index = $state<number | null>(null);
	let bulk_action_loading = $state(false);
	let bulk_action_error = $state<string | null>(null);

	let album_modal_open = $state(false);
	let album_modal_open_session = $state(0);

	let hub_new_album_name = $state('');
	let hub_create_loading = $state(false);
	let hub_create_error = $state<string | null>(null);

	let album_share_panel_open = $state(false);

	/** Plain `let`: must not be `$state` or assigning inside `$effect` retriggers the effect forever. */
	let gallery_list_track_prev: string | null = null;

	/** Merged grid: initial chunk from the server plus batches from `/api/gallery/grid-slice`. */
	let gallery_images = $state<gallery_grid_item[]>([]);

	const preload_image_src_list = $derived.by(() => {
		const limit = 8;
		const out: string[] = [];
		for (const item of gallery_images.slice(0, limit)) {
			if (item?.src) out.push(item.src);
		}
		return out;
	});

	let gallery_detail_modal = $state<
		{ open_for_grid_item: (item: gallery_grid_item) => void } | undefined
	>();

	let gallery_load_more_in_flight = $state(false);
	let gallery_load_more_error = $state<string | null>(null);
	let gallery_load_more_sentinel: HTMLDivElement | null = $state(null);

	const gallery_has_more = $derived(gallery_images.length < data.gallery_infinite.total_count);

	const gallery_selected_count = $derived(gallery_selected_upload_ids.length);

	const bulk_bar_can_archive = $derived(data.gallery_filters.gallery_focus !== 'archived');
	const bulk_bar_can_restore = $derived(data.gallery_filters.gallery_focus === 'archived');

	$effect(() => {
		const initial = data.images;
		const q = data.gallery_filter_query;
		gallery_images = [...initial];
		gallery_load_more_error = null;
		const prev = gallery_list_track_prev;
		if (prev != null && prev !== q) {
			gallery_selected_upload_ids = [];
			gallery_selection_anchor_index = null;
		}
		gallery_list_track_prev = q;
	});

	$effect(() => {
		if (!browser) return;
		const el = gallery_load_more_sentinel;
		if (el == null || !gallery_has_more || gallery_load_more_in_flight) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						void fetch_next_gallery_batch();
					}
				}
			},
			{ root: null, rootMargin: '280px', threshold: 0 }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	async function fetch_next_gallery_batch(): Promise<void> {
		if (!browser) return;
		if (gallery_load_more_in_flight || !gallery_has_more) return;
		const filter_q = data.gallery_filter_query;
		const next_offset = gallery_images.length;
		if (next_offset >= data.gallery_infinite.total_count) return;

		gallery_load_more_in_flight = true;
		gallery_load_more_error = null;
		try {
			const u = new URL(resolve('/api/gallery/grid-slice'), window.location.origin);
			const params = new SvelteURLSearchParams(filter_q);
			params.forEach((v, k) => {
				u.searchParams.set(k, v);
			});
			u.searchParams.set('offset', String(next_offset));
			const response = await fetch(u.toString());
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const body = (await response.json()) as { images: gallery_grid_item[] };
			if (data.gallery_filter_query !== filter_q) return;
			gallery_images = [...gallery_images, ...body.images];
		} catch (e) {
			gallery_load_more_error = e instanceof Error ? e.message : String(e);
		} finally {
			gallery_load_more_in_flight = false;
		}
	}

	function set_gallery_selection_mode(next: boolean): void {
		if (next && raw_upload_batch_activity.in_progress) return;
		gallery_selection_mode = next;
		if (!next) {
			gallery_selected_upload_ids = [];
			gallery_selection_anchor_index = null;
			bulk_action_error = null;
		}
	}

	function gallery_upload_is_selected(upload_id: string): boolean {
		return gallery_selected_upload_ids.includes(upload_id);
	}

	function toggle_gallery_upload_selected(upload_id: string): void {
		if (gallery_selected_upload_ids.includes(upload_id)) {
			gallery_selected_upload_ids = gallery_selected_upload_ids.filter((id) => id !== upload_id);
		} else {
			gallery_selected_upload_ids = [...gallery_selected_upload_ids, upload_id];
		}
	}

	function gallery_tile_index(item: gallery_grid_item): number {
		return gallery_images.findIndex((i) => i.relative_path === item.relative_path);
	}

	function on_gallery_tile_activate(item: gallery_grid_item, e: MouseEvent): void {
		if (gallery_selection_mode && item.upload_id != null) {
			const idx = gallery_tile_index(item);
			if (idx < 0) return;

			if (e.shiftKey && gallery_selection_anchor_index != null) {
				const anchor = gallery_selection_anchor_index;
				const lo = Math.min(anchor, idx);
				const hi = Math.max(anchor, idx);
				const range_ids: string[] = [];
				for (let i = lo; i <= hi; i++) {
					const u = gallery_images[i]?.upload_id;
					if (u != null) range_ids.push(u);
				}
				gallery_selected_upload_ids = [...new Set([...gallery_selected_upload_ids, ...range_ids])];
				return;
			}

			toggle_gallery_upload_selected(item.upload_id);
			gallery_selection_anchor_index = idx;
			return;
		}
		gallery_detail_modal?.open_for_grid_item(item);
	}

	function select_all_gallery_uploads_on_page(): void {
		gallery_selected_upload_ids = gallery_images
			.map((i) => i.upload_id)
			.filter((id): id is string => id != null);
		const first_idx = gallery_images.findIndex((i) => i.upload_id != null);
		gallery_selection_anchor_index = first_idx >= 0 ? first_idx : null;
	}

	async function apply_bulk_gallery_flags(payload: {
		upload_ids: string[];
		starred?: boolean;
		archive?: boolean;
	}): Promise<void> {
		if (payload.upload_ids.length === 0) return;
		bulk_action_loading = true;
		bulk_action_error = null;
		try {
			const response = await fetch(resolve('/api/gallery/bulk-flags'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			gallery_selected_upload_ids = [];
			gallery_selection_anchor_index = null;
			await invalidate(transformed_media_depends_key);
			await invalidate(gallery_active_upload_count_depends_key);
		} catch (e) {
			bulk_action_error = e instanceof Error ? e.message : String(e);
		} finally {
			bulk_action_loading = false;
		}
	}

	async function bulk_star_selected(starred: boolean): Promise<void> {
		await apply_bulk_gallery_flags({ upload_ids: [...gallery_selected_upload_ids], starred });
	}

	async function bulk_archive_selected(archive: boolean): Promise<void> {
		await apply_bulk_gallery_flags({ upload_ids: [...gallery_selected_upload_ids], archive });
	}

	function open_album_modal(): void {
		album_modal_open_session += 1;
		album_modal_open = true;
	}

	async function submit_add_to_album(
		body:
			| { upload_ids: string[]; album_id: string }
			| { upload_ids: string[]; new_album_name: string }
	): Promise<void> {
		const response = await fetch(resolve('/api/gallery/album-members'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			const text = await response.text();
			throw new Error(text || response.statusText);
		}
		await invalidate(albums_list_depends_key);
		gallery_selected_upload_ids = [];
		gallery_selection_anchor_index = null;
		set_gallery_selection_mode(false);
	}

	async function hub_create_empty_album(): Promise<void> {
		const name = hub_new_album_name.trim();
		if (name === '') return;
		hub_create_loading = true;
		hub_create_error = null;
		try {
			const response = await fetch(resolve('/api/gallery/albums'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const payload = (await response.json()) as { id: string };
			hub_new_album_name = '';
			await invalidate(albums_list_depends_key);
			await goto(localizeHref(`/?gallery_focus=album&album_id=${encodeURIComponent(payload.id)}`));
		} catch (e) {
			hub_create_error = e instanceof Error ? e.message : String(e);
		} finally {
			hub_create_loading = false;
		}
	}

	function gallery_filters_toggle_aria_label(panel_open: boolean): string {
		if (raw_upload_batch_activity.in_progress) {
			return m.humble_plain_gull_gallery_controls_locked_during_upload();
		}
		const n = gallery_exif_star_filter_count;
		const suffix = n > 0 ? m.salty_bold_mare_filters_active_suffix({ count: n }) : '';
		if (panel_open) {
			return `${m.salty_bold_mare_filters_hide()}${suffix}`;
		}
		return `${m.salty_bold_mare_filters_show()}${suffix}`;
	}

	$effect(() => {
		if (!raw_upload_batch_activity.in_progress) return;
		filters_panel_user_open = false;
		if (gallery_selection_mode) set_gallery_selection_mode(false);
	});
</script>

<svelte:head>
	<title
		>{m.tidy_best_bumblebee_feast_dashboard()} | {m.clever_quiet_eagle_brand_lenslocker()}</title
	>
	{#each preload_image_src_list as preload_href (preload_href)}
		<link rel="preload" as="image" href={preload_href} fetchpriority="high" />
	{/each}
</svelte:head>

<div class="mx-auto max-w-7xl">
	<header
		class="mb-8 flex min-w-0 flex-row flex-nowrap items-center justify-between gap-3 sm:gap-4"
	>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-semibold text-gray-900 dark:text-white">
				{m.tidy_best_bumblebee_feast_dashboard()}
			</h1>
			{#if gallery_view_blurb != null}
				<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{gallery_view_blurb}</p>
			{/if}
		</div>
		<div class="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
			{#if data.gallery_filters.gallery_focus !== 'albums'}
				<div class="flex max-w-50 min-w-38 shrink-0 flex-col gap-0.5 sm:min-w-44">
					<label
						for="gallery-sort-select"
						class="text-[10px] font-medium text-gray-500 dark:text-gray-400"
						>{m.icy_odd_snipe_gallery_sort_ui_label()}</label
					>
					<select
						id="gallery-sort-select"
						class="{app_form_field_class} py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
						disabled={raw_upload_batch_activity.in_progress}
						title={raw_upload_batch_activity.in_progress
							? m.humble_plain_gull_gallery_controls_locked_during_upload()
							: undefined}
						aria-label={raw_upload_batch_activity.in_progress
							? m.humble_plain_gull_gallery_controls_locked_during_upload()
							: m.brown_brave_kudu_gallery_sort_aria()}
						value={data.gallery_filters.sort}
						onchange={on_gallery_sort_change}
					>
						<option value="date_desc">{m.suave_quiet_fox_sort_date_new_first()}</option>
						<option value="date_asc">{m.posh_soft_frog_sort_date_old_first()}</option>
						<option value="iso_desc">{m.grand_sunny_mite_sort_iso_high_low()}</option>
						<option value="iso_asc">{m.plush_muted_puffin_sort_iso_low_high()}</option>
						<option value="size_desc">{m.spry_lofty_bass_sort_size_big_first()}</option>
						<option value="size_asc">{m.tiny_grassy_lark_sort_size_small_first()}</option>
					</select>
				</div>
				{#if data.gallery_filters.gallery_focus === 'album' && data.current_album != null}
					<button
						type="button"
						class="{gallery_header_icon_button_class} gap-1.5 px-2"
						aria-label={m.dull_lofty_crane_share_action_hint()}
						onclick={() => {
							album_share_panel_open = true;
						}}
					>
						<Share2 class={gallery_header_icon_glyph_class} aria-hidden="true" />
					</button>
				{/if}
				<button
					type="button"
					class={gallery_header_icon_button_class}
					aria-pressed={gallery_grid_show_meta}
					aria-label={gallery_grid_show_meta
						? m.calm_wide_otter_aria_compact_grid()
						: m.calm_wide_otter_aria_meta_grid()}
					onclick={toggle_gallery_grid_show_meta}
				>
					{#if gallery_grid_show_meta}
						<Grid2x2 class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{:else}
						<LayoutGrid class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{/if}
				</button>
				<button
					type="button"
					class="{gallery_header_icon_button_class} {gallery_selection_mode
						? 'border-primary-500 ring-2 ring-primary-200 dark:border-primary-500 dark:ring-primary-900'
						: ''} disabled:cursor-not-allowed disabled:opacity-50"
					disabled={raw_upload_batch_activity.in_progress}
					title={raw_upload_batch_activity.in_progress
						? m.humble_plain_gull_gallery_controls_locked_during_upload()
						: undefined}
					aria-pressed={gallery_selection_mode}
					aria-label={raw_upload_batch_activity.in_progress
						? m.humble_plain_gull_gallery_controls_locked_during_upload()
						: gallery_selection_mode
							? m.fierce_tiny_lark_aria_exit_multiselect()
							: m.fierce_tiny_lark_aria_enter_multiselect()}
					onclick={() => set_gallery_selection_mode(!gallery_selection_mode)}
				>
					<CheckCheck class={gallery_header_icon_glyph_class} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="{gallery_header_icon_button_class} relative disabled:cursor-not-allowed disabled:opacity-50"
					disabled={raw_upload_batch_activity.in_progress}
					title={raw_upload_batch_activity.in_progress
						? m.humble_plain_gull_gallery_controls_locked_during_upload()
						: undefined}
					aria-expanded={filters_panel_user_open}
					aria-controls="gallery-filters-panel"
					aria-label={gallery_filters_toggle_aria_label(filters_panel_user_open)}
					onclick={on_filters_toggle_click}
				>
					{#if filters_panel_user_open || gallery_exif_star_filter_count > 0}
						<FunnelX class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{:else}
						<Funnel class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{/if}
					{#if gallery_exif_star_filter_count > 0}
						<span
							class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] leading-none font-semibold text-white tabular-nums dark:bg-primary-500"
							aria-hidden="true"
						>
							{gallery_exif_star_filter_count > 99 ? '99+' : String(gallery_exif_star_filter_count)}
						</span>
					{/if}
				</button>
			{/if}
		</div>
	</header>

	{#if data.gallery_filters.gallery_focus === 'albums'}
		<section
			class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			aria-labelledby="albums-hub-heading"
		>
			<h2 id="albums-hub-heading" class="text-lg font-semibold text-gray-900 dark:text-white">
				{m.grand_merry_shrike_albums_hub_heading()}
			</h2>
			{#if hub_create_error != null}
				<p class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{hub_create_error}</p>
			{/if}
			<div class="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
				<div class="min-w-0 flex-1">
					<label
						for="hub-new-album-name"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
					>
						{m.zesty_slow_wren_albums_create_placeholder()}
					</label>
					<input
						id="hub-new-album-name"
						type="text"
						class={app_form_field_class}
						bind:value={hub_new_album_name}
						maxlength={200}
						autocomplete="off"
					/>
				</div>
				<button
					type="button"
					class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
					disabled={hub_create_loading || hub_new_album_name.trim() === ''}
					onclick={() => void hub_create_empty_album()}
				>
					{m.keen_plain_stork_albums_create_button()}
				</button>
			</div>
			{#if data.albums.length === 0}
				<p class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
					{m.round_calm_gull_albums_empty()}
				</p>
			{:else}
				<ul class="mt-8 divide-y divide-gray-200 dark:divide-gray-600" role="list">
					{#each data.albums as album_row (album_row.id)}
						<li>
							<a
								href={localizeHref(
									`/?gallery_focus=album&album_id=${encodeURIComponent(album_row.id)}`
								)}
								class="flex items-center gap-3 py-3 text-gray-900 no-underline hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
							>
								<Folder
									class="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400"
									aria-hidden="true"
								/>
								<span class="min-w-0 flex-1 truncate font-medium">{album_row.name}</span>
								<span class="shrink-0 text-sm text-gray-500 tabular-nums dark:text-gray-400">
									{album_row.image_count}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{:else}
		{#if gallery_selection_mode && gallery_images.length > 0}
			<GalleryBulkActionsBar
				{bulk_action_error}
				{bulk_action_loading}
				{gallery_selected_count}
				{bulk_bar_can_archive}
				{bulk_bar_can_restore}
				selected_count_label={m.warm_round_bison_bulk_selected_count({
					count: gallery_selected_count
				})}
				hint_text={m.noble_clear_frog_hint()}
				aria_bulk_region_label={m.dull_solid_gull_aria_bulk_actions()}
				label_all_on_page={m.noble_clear_frog_all_on_page()}
				label_clear_selection={m.noble_clear_frog_clear_selection()}
				label_done={m.noble_clear_frog_done()}
				label_star={m.noble_clear_frog_star()}
				label_unstar={m.noble_clear_frog_unstar()}
				label_archive={m.noble_clear_frog_archive()}
				label_restore={m.noble_clear_frog_restore()}
				label_add_to_album={m.moody_bright_carp_bulk_add_to_album()}
				on_select_all={select_all_gallery_uploads_on_page}
				on_clear_selection={() => {
					gallery_selected_upload_ids = [];
					gallery_selection_anchor_index = null;
				}}
				on_done={() => set_gallery_selection_mode(false)}
				on_star_change={(starred) => void bulk_star_selected(starred)}
				on_archive_change={(archive) => void bulk_archive_selected(archive)}
				on_add_to_album={open_album_modal}
			/>
		{/if}

		{#if filters_panel_user_open}
			<section
				id="gallery-filters-panel"
				class="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
				aria-labelledby="gallery-filters-heading"
			>
				<h2
					id="gallery-filters-heading"
					class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
				>
					<Funnel
						class="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
						aria-hidden="true"
					/>
					{m.noble_steady_puffin_filters_heading()}
				</h2>
				<form method="GET" action={localizeHref('/')} class="mt-4 space-y-4">
					{#if data.gallery_filters.gallery_focus != null}
						<input type="hidden" name="gallery_focus" value={data.gallery_filters.gallery_focus} />
					{/if}
					{#if data.gallery_filters.album_id != null && data.gallery_filters.album_id !== ''}
						<input type="hidden" name="album_id" value={data.gallery_filters.album_id} />
					{/if}
					<input type="hidden" name="sort" value={data.gallery_filters.sort} />
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						<div>
							<label
								for="gf-camera-make"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.dry_honest_earthworm_gleam_camera_make()}</label
							>
							<select
								id="gf-camera-make"
								name="camera_make"
								class={app_form_field_class}
								bind:value={filter_camera_make}
								onchange={on_filter_camera_make_change}
							>
								<option value="">{m.topical_front_vole_shine_any()}</option>
								{#each gallery_camera_makes as make_option (make_option)}
									<option value={make_option}>{make_option}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="gf-camera-model"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.green_lime_swan_gasp_camera_model()}</label
							>
							<select
								id="gf-camera-model"
								name="camera_model"
								class={app_form_field_class}
								bind:value={filter_camera_model}
							>
								<option value="">{m.topical_front_vole_shine_any()}</option>
								{#each gallery_camera_models as model_option (model_option)}
									<option value={model_option}>{model_option}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="gf-lens-make"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.east_mealy_vulture_aspire_lens_make()}</label
							>
							<select
								id="gf-lens-make"
								name="lens_make"
								class={app_form_field_class}
								bind:value={filter_lens_make}
								onchange={on_filter_lens_make_change}
							>
								<option value="">{m.topical_front_vole_shine_any()}</option>
								{#each gallery_lens_makes as make_option (make_option)}
									<option value={make_option}>{make_option}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="gf-lens-model"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.keen_mealy_eagle_yell_lens_model()}</label
							>
							<select
								id="gf-lens-model"
								name="lens_model"
								class={app_form_field_class}
								bind:value={filter_lens_model}
							>
								<option value="">{m.topical_front_vole_shine_any()}</option>
								{#each gallery_lens_models as model_option (model_option)}
									<option value={model_option}>{model_option}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="gf-date-from"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.only_many_leopard_express_date_from()}</label
							>
							<input
								id="gf-date-from"
								name="date_from"
								type="date"
								min={date_input_min}
								max={date_input_max}
								class={app_form_field_class}
								bind:value={filter_date_from}
							/>
						</div>
						<div>
							<label
								for="gf-date-to"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.wise_round_ibex_flow_date_to()}</label
							>
							<input
								id="gf-date-to"
								name="date_to"
								type="date"
								min={date_input_min}
								max={date_input_max}
								class={app_form_field_class}
								bind:value={filter_date_to}
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
						<label
							class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
						>
							<input
								type="checkbox"
								name="starred_only"
								value="1"
								class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
								bind:checked={filter_starred_only}
							/>
							{m.gaudy_nimble_ladybug_spin_starred_only()}
						</label>
					</div>
					<div class="flex flex-wrap items-end gap-3">
						<div class="w-full max-w-xs min-w-32 sm:w-auto">
							<label
								for="gf-iso-min"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.petty_same_dog_dine_iso_min()}</label
							>
							<input
								id="gf-iso-min"
								name="iso_min"
								type="number"
								inputmode="numeric"
								min="0"
								step="1"
								placeholder={iso_placeholder_min}
								class={app_form_field_class}
								bind:value={filter_iso_min}
							/>
						</div>
						<div class="w-full max-w-xs min-w-32 sm:w-auto">
							<label
								for="gf-iso-max"
								class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
								>{m.moving_slimy_alpaca_feast_iso_max()}</label
							>
							<input
								id="gf-iso-max"
								name="iso_max"
								type="number"
								inputmode="numeric"
								min="0"
								step="1"
								placeholder={iso_placeholder_max}
								class={app_form_field_class}
								bind:value={filter_iso_max}
							/>
						</div>
						<div class="flex flex-wrap gap-2 pb-0.5">
							<button
								type="submit"
								class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
							>
								{m.lofty_slow_guppy_inspire_apply_filters()}
							</button>
							<a
								href={dashboard_clear_href}
								class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
							>
								{m.green_suave_butterfly_succeed_clear()}
							</a>
						</div>
					</div>
				</form>
			</section>
		{/if}

		{#if data.gallery_infinite.total_count === 0}
			<p
				class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400"
			>
				{#if data.gallery_filters.starred_only || data.gallery_filters.exif_filters_active}
					{m.east_icy_iguana_arise_no_photos_match_these_filters()}
				{:else if data.gallery_filters.gallery_focus === 'needs_attention'}
					{m.inclusive_pretty_hornet_quiz_no_photos_need_attention()}
				{:else if data.gallery_filters.gallery_focus === 'archived'}
					{m.watery_small_wren_lift_no_archived_photos()}
				{:else if data.gallery_filters.gallery_focus === 'album'}
					{#if data.current_album == null}
						{m.dull_keen_ibex_album_invalid_blurb()}
					{:else}
						{m.bad_vexed_carp_grasp_no_images_found()}
					{/if}
				{:else}
					{m.bad_vexed_carp_grasp_no_images_found()}
					<a href={localizeHref('/upload')} class="text-primary-600 underline dark:text-primary-400"
						>{m.quaint_grand_snail_amaze_upload()}</a
					>
				{/if}
			</p>
		{:else}
			<GalleryImageGrid
				images={gallery_images}
				grid_list_class={gallery_grid_list_class}
				show_meta={gallery_grid_show_meta}
				selection_mode={gallery_selection_mode}
				upload_is_selected={gallery_upload_is_selected}
				on_tile_activate={on_gallery_tile_activate}
				has_more={gallery_has_more}
				load_more_in_flight={gallery_load_more_in_flight}
				load_more_error={gallery_load_more_error}
				on_retry_load_more={() => void fetch_next_gallery_batch()}
				bind:load_more_sentinel_el={gallery_load_more_sentinel}
			/>
		{/if}
	{/if}
</div>

<GalleryDetailModal
	bind:this={gallery_detail_modal}
	images={gallery_images}
	needs_attention_ui={modal_needs_attention_ui}
	needs_attention_required_keys={needs_attention_required_key_set}
/>

{#if data.gallery_filters.gallery_focus === 'album' && data.current_album != null}
	<GallerySharePanel
		bind:open={album_share_panel_open}
		kind="album"
		album_id={data.current_album.id}
	/>
{/if}

<GalleryAddToAlbumModal
	bind:open={album_modal_open}
	open_session={album_modal_open_session}
	albums={data.albums}
	form_field_class={app_form_field_class}
	selected_upload_ids={gallery_selected_upload_ids}
	on_submit={submit_add_to_album}
/>
