<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { albums_list_depends_key } from '$lib/cache/albums_cache';
	import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/cache/transformed_media_cache';
	import {
		needs_attention_issue_for_detail_key,
		needs_attention_label_for_key
	} from '$lib/gallery/needs_attention_catalog';
	import { upload_meta_editable_field_list } from '$lib/gallery/upload_meta_editable_fields';
	import { CloseButton, Modal } from 'flowbite-svelte';
	import {
		AdjustmentsHorizontalOutline,
		AdjustmentsVerticalOutline,
		CameraPhotoOutline,
		ColumnOutline,
		DownloadOutline,
		ChevronDownOutline,
		ChevronLeftOutline,
		CheckOutline,
		ChevronRightOutline,
		ClockOutline,
		ExclamationCircleOutline,
		EyeOutline,
		FilterOutline,
		FilterSolid,
		FolderOutline,
		GridOutline,
		ImageOutline,
		PenOutline,
		StarOutline,
		StarSolid,
		ArchiveArrowDownOutline,
		TrashBinOutline
	} from 'flowbite-svelte-icons';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';

	/* eslint-disable svelte/no-navigation-without-resolve -- localizeHref; /media/transformed/* URLs are not typed routes */

	type gallery_grid_item = {
		relative_path: string;
		src: string;
		full_src: string | null;
		upload_id: string | null;
		starred: boolean;
		alt: string;
		meta: { rows: { key: string; text: string }[] } | null;
	};

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
		const s = q.toString();
		return s !== '' ? localizeHref(`/?${s}`) : localizeHref('/');
	});

	function on_filters_toggle_click(): void {
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

	const bulk_bar_button_class =
		'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

	const filter_field_class =
		'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

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

	const meta_icon_class = 'mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400';

	let gallery_modal_open = $state(false);
	let modal_heading = $state('');
	let modal_image_display_src = $state('');
	let modal_image_fallback_src = $state('');
	/** Bump to remount the preview img when the URL changes (loads reliably in the dialog). */
	let modal_image_key = $state(0);
	let modal_upload_id = $state<string | null>(null);
	let modal_detail = $state<Record<string, unknown> | null>(null);
	let modal_detail_loading = $state(false);
	let modal_detail_error = $state<string | null>(null);
	let modal_image_object_url = $state<string | null>(null);
	/** Invalidates in-flight full-image fetches when the modal is reopened or closed. */
	let modal_image_session = 0;

	let modal_current_relative_path = $state('');
	let modal_action_loading = $state(false);
	let modal_action_error = $state<string | null>(null);
	let modal_download_menu_open = $state(false);
	let modal_download_loading = $state(false);
	let modal_download_error = $state<string | null>(null);

	let gallery_selection_mode = $state(false);
	let gallery_selected_upload_ids = $state<string[]>([]);
	/** Grid index for shift+click range select; reset when the selection list is cleared. */
	let gallery_selection_anchor_index = $state<number | null>(null);
	let bulk_action_loading = $state(false);
	let bulk_action_error = $state<string | null>(null);

	let album_modal_open = $state(false);
	let album_target_mode = $state<'existing' | 'new'>('existing');
	let album_existing_id = $state('');
	let album_new_name = $state('');
	let album_modal_loading = $state(false);
	let album_modal_error = $state<string | null>(null);

	let hub_new_album_name = $state('');
	let hub_create_loading = $state(false);
	let hub_create_error = $state<string | null>(null);

	/** Plain `let`: must not be `$state` or assigning inside `$effect` retriggers the effect forever. */
	let gallery_list_track_prev: string | null = null;

	/** Merged grid: initial chunk from the server plus batches from `/api/gallery/grid-slice`. */
	let gallery_images = $state<gallery_grid_item[]>([]);

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
		void open_gallery_modal(item);
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
		album_modal_error = null;
		if (data.albums.length > 0) {
			album_target_mode = 'existing';
			album_existing_id = data.albums[0]!.id;
		} else {
			album_target_mode = 'new';
			album_existing_id = '';
		}
		album_new_name = '';
		album_modal_open = true;
	}

	async function submit_add_to_album(): Promise<void> {
		const ids = [...gallery_selected_upload_ids];
		if (ids.length === 0) return;
		if (album_target_mode === 'new' && album_new_name.trim() === '') {
			return;
		}
		if (album_target_mode === 'existing' && album_existing_id.trim() === '') {
			return;
		}
		album_modal_loading = true;
		album_modal_error = null;
		try {
			const body =
				album_target_mode === 'new'
					? { upload_ids: ids, new_album_name: album_new_name.trim() }
					: { upload_ids: ids, album_id: album_existing_id.trim() };
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
			album_modal_open = false;
		} catch (e) {
			album_modal_error = e instanceof Error ? e.message : String(e);
		} finally {
			album_modal_loading = false;
		}
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

	const modal_list_index = $derived.by(() => {
		if (modal_current_relative_path === '') return -1;
		return gallery_images.findIndex((i) => i.relative_path === modal_current_relative_path);
	});

	const modal_grid_item = $derived(
		modal_list_index >= 0 ? gallery_images[modal_list_index] : undefined
	);
	const modal_can_download_preview = $derived(
		modal_grid_item?.full_src != null && modal_grid_item.full_src !== ''
	);

	const modal_has_prev = $derived(modal_list_index > 0);
	const modal_has_next = $derived(
		modal_list_index >= 0 && modal_list_index < gallery_images.length - 1
	);

	const modal_detail_starred = $derived(modal_detail != null && Number(modal_detail.starred) === 1);

	const modal_detail_archived = $derived(
		modal_detail != null &&
			modal_detail.archived_at_ms != null &&
			Number(modal_detail.archived_at_ms) > 0
	);

	let preview_scale = $state(1);
	let preview_pan_x = $state(0);
	let preview_pan_y = $state(0);

	/** Wheel zoom clamps to >= 1; use epsilon so float noise does not count as zoomed. */
	const preview_zoom_epsilon = 0.001;
	const modal_preview_at_default_zoom = $derived(preview_scale <= 1 + preview_zoom_epsilon);
	let modal_meta_editing = $state(false);
	let meta_edit_values = $state<Record<string, string>>({});
	let meta_save_loading = $state(false);
	let meta_save_error = $state<string | null>(null);

	const real_numeric_field_keys = new Set<string>([
		'f_number',
		'exposure_time_seconds',
		'focal_length',
		'gps_latitude',
		'gps_longitude'
	]);

	function reset_preview_zoom_pan(): void {
		preview_scale = 1;
		preview_pan_x = 0;
		preview_pan_y = 0;
	}

	$effect(() => {
		void modal_image_key;
		reset_preview_zoom_pan();
	});

	function attach_zoom_pan(node: HTMLElement) {
		let drag = false;
		let start_client_x = 0;
		let start_client_y = 0;
		let origin_pan_x = 0;
		let origin_pan_y = 0;

		const on_wheel = (e: WheelEvent) => {
			e.preventDefault();
			const delta = e.deltaY > 0 ? -0.14 : 0.14;
			const next = Math.min(8, Math.max(1, preview_scale + delta));
			preview_scale = next;
			if (next <= 1) {
				preview_pan_x = 0;
				preview_pan_y = 0;
			}
		};

		const on_pointer_down = (e: PointerEvent) => {
			if (e.button !== 0) return;
			drag = true;
			start_client_x = e.clientX;
			start_client_y = e.clientY;
			origin_pan_x = preview_pan_x;
			origin_pan_y = preview_pan_y;
			node.setPointerCapture(e.pointerId);
		};

		const on_pointer_move = (e: PointerEvent) => {
			if (!drag) return;
			preview_pan_x = origin_pan_x + (e.clientX - start_client_x);
			preview_pan_y = origin_pan_y + (e.clientY - start_client_y);
		};

		const on_pointer_up = (e: PointerEvent) => {
			drag = false;
			try {
				node.releasePointerCapture(e.pointerId);
			} catch {
				/* not capturing */
			}
		};

		node.addEventListener('wheel', on_wheel, { passive: false });
		node.addEventListener('pointerdown', on_pointer_down);
		node.addEventListener('pointermove', on_pointer_move);
		node.addEventListener('pointerup', on_pointer_up);
		node.addEventListener('pointercancel', on_pointer_up);

		return {
			destroy() {
				node.removeEventListener('wheel', on_wheel);
				node.removeEventListener('pointerdown', on_pointer_down);
				node.removeEventListener('pointermove', on_pointer_move);
				node.removeEventListener('pointerup', on_pointer_up);
				node.removeEventListener('pointercancel', on_pointer_up);
			}
		};
	}

	function detail_value_as_edit_string(value: unknown): string {
		if (value === null || value === undefined) return '';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function fill_meta_edit_from_detail(): void {
		if (modal_detail == null) return;
		const next: Record<string, string> = {};
		for (const f of upload_meta_editable_field_list) {
			next[f.key] = detail_value_as_edit_string(modal_detail[f.key]);
		}
		meta_edit_values = next;
	}

	/** Live merge for attention ordering while the user edits (string values match form state). */
	function merge_detail_with_meta_edits(
		detail: Record<string, unknown>,
		edits: Record<string, string>
	): Record<string, unknown> {
		const out: Record<string, unknown> = { ...detail };
		for (const f of upload_meta_editable_field_list) {
			if (edits[f.key] !== undefined) out[f.key] = edits[f.key];
		}
		return out;
	}

	function build_meta_patch_body(): Record<string, unknown> {
		const body: Record<string, unknown> = {};
		for (const f of upload_meta_editable_field_list) {
			const raw = (meta_edit_values[f.key] ?? '').trim();
			if (f.kind === 'number') {
				if (raw === '') body[f.key] = null;
				else {
					const n = real_numeric_field_keys.has(f.key)
						? Number.parseFloat(raw)
						: Number.parseInt(raw, 10);
					body[f.key] = Number.isFinite(n) ? n : null;
				}
			} else {
				body[f.key] = raw === '' ? null : raw;
			}
		}
		return body;
	}

	async function save_meta_edits(): Promise<void> {
		if (modal_upload_id == null) return;
		meta_save_loading = true;
		meta_save_error = null;
		try {
			const response = await fetch(resolve(`/api/gallery/upload-meta/${modal_upload_id}`), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(build_meta_patch_body())
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const payload = (await response.json()) as Record<string, unknown>;
			modal_detail = payload;
			if (typeof payload.original_filename === 'string') {
				modal_heading = payload.original_filename;
			}
			modal_meta_editing = false;
			await invalidate(transformed_media_depends_key);
		} catch (e) {
			meta_save_error = e instanceof Error ? e.message : String(e);
		} finally {
			meta_save_loading = false;
		}
	}

	function revoke_modal_object_url(): void {
		if (modal_image_object_url) {
			URL.revokeObjectURL(modal_image_object_url);
			modal_image_object_url = null;
		}
	}

	$effect(() => {
		if (!gallery_modal_open) {
			untrack(() => {
				revoke_modal_object_url();
				modal_current_relative_path = '';
				modal_download_menu_open = false;
				modal_download_error = null;
			});
		}
	});

	function parse_filename_from_content_disposition(
		header: string | null,
		fallback: string
	): string {
		if (header == null || header === '') return fallback;
		const star = header.match(/filename\*=UTF-8''([^;]+)/i);
		if (star?.[1]) {
			try {
				return decodeURIComponent(star[1].trim());
			} catch {
				return fallback;
			}
		}
		const quoted = header.match(/filename="((?:\\.|[^"\\])*)"/i);
		if (quoted?.[1]) return quoted[1].replace(/\\(.)/g, '$1');
		const plain = header.match(/filename=([^;\n]+)/i);
		if (plain?.[1]) return plain[1].trim().replace(/^["']|["']$/g, '');
		return fallback;
	}

	async function modal_trigger_download(kind: 'preview' | 'raw'): Promise<void> {
		if (!browser || modal_upload_id == null) return;
		modal_download_menu_open = false;
		modal_download_loading = true;
		modal_download_error = null;
		try {
			const u = resolve(`/api/gallery/download/${modal_upload_id}?kind=${kind}`);
			const response = await fetch(u);
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const blob = await response.blob();
			const safe_heading = modal_heading.replace(/[^\w.\-]+/g, '_') || 'photo';
			const fallback =
				kind === 'preview' ? `${safe_heading}_preview.jpg` : safe_heading || 'download';
			const download_name = parse_filename_from_content_disposition(
				response.headers.get('Content-Disposition'),
				fallback
			);
			const object_url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = object_url;
			a.download = download_name;
			a.rel = 'noopener';
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(object_url);
		} catch (e) {
			modal_download_error = e instanceof Error ? e.message : String(e);
		} finally {
			modal_download_loading = false;
		}
	}

	async function patch_gallery_upload(body: Record<string, unknown>): Promise<boolean> {
		if (modal_upload_id == null) return false;
		modal_action_loading = true;
		modal_action_error = null;
		try {
			const response = await fetch(resolve(`/api/gallery/upload-meta/${modal_upload_id}`), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const payload = (await response.json()) as Record<string, unknown>;
			modal_detail = payload;
			if (typeof payload.original_filename === 'string') {
				modal_heading = payload.original_filename;
			}
			await invalidate(transformed_media_depends_key);
			if (body.archive === true || body.archive === false) {
				await invalidate(gallery_active_upload_count_depends_key);
			}
			return true;
		} catch (e) {
			modal_action_error = e instanceof Error ? e.message : String(e);
			return false;
		} finally {
			modal_action_loading = false;
		}
	}

	async function toggle_modal_star(): Promise<void> {
		if (modal_detail == null || modal_upload_id == null) return;
		const next = !(Number(modal_detail.starred) === 1);
		await patch_gallery_upload({ starred: next });
	}

	async function toggle_modal_archive(): Promise<void> {
		const want_archive = !modal_detail_archived;
		await patch_gallery_upload({ archive: want_archive });
	}

	function modal_go_delta(delta: number): void {
		const i = modal_list_index;
		if (i < 0) return;
		const next_item = gallery_images[i + delta];
		if (next_item == null) return;
		void open_gallery_modal(next_item);
	}

	function on_gallery_modal_window_keydown(e: KeyboardEvent): void {
		if (!gallery_modal_open) return;
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		const t = e.target;
		if (t instanceof HTMLElement) {
			const tag = t.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
				return;
			}
		}
		if (!modal_preview_at_default_zoom) return;
		if (e.key === 'ArrowLeft') {
			if (!modal_has_prev || modal_action_loading) return;
			e.preventDefault();
			modal_go_delta(-1);
			return;
		}
		if (!modal_has_next || modal_action_loading) return;
		e.preventDefault();
		modal_go_delta(1);
	}

	function meta_row_icon_component(key: string) {
		switch (key) {
			case 'camera':
				return CameraPhotoOutline;
			case 'lens':
				return EyeOutline;
			case 'dimensions':
				return ImageOutline;
			case 'datetime':
				return ClockOutline;
			case 'resolution':
				return AdjustmentsHorizontalOutline;
			case 'file_size':
				return FolderOutline;
			case 'exposure':
				return AdjustmentsVerticalOutline;
			default:
				return ImageOutline;
		}
	}

	function format_detail_value(value: unknown): string {
		if (value === null || value === undefined) return m.flat_moody_gull_detail_empty_dash();
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function gallery_filters_toggle_aria_label(panel_open: boolean): string {
		const n = gallery_exif_star_filter_count;
		const suffix = n > 0 ? m.salty_bold_mare_filters_active_suffix({ count: n }) : '';
		if (panel_open) {
			return `${m.salty_bold_mare_filters_hide()}${suffix}`;
		}
		return `${m.salty_bold_mare_filters_show()}${suffix}`;
	}

	const editable_meta_keys = new Set<string>(
		upload_meta_editable_field_list.map((field) => field.key)
	);

	type modal_detail_view_row = {
		key: string;
		label: string;
		value: unknown;
		attention_issue: boolean;
	};

	function modal_detail_key_is_attention_issue(
		row: Record<string, unknown>,
		key: string,
		required_keys: ReadonlySet<string>
	): boolean {
		return needs_attention_issue_for_detail_key(row, key, required_keys);
	}

	/**
	 * Same field order as the edit form; then remaining columns A–Z.
	 * On the Needs attention dashboard, rows that violate a selected rule are flagged (order unchanged).
	 */
	function modal_detail_view_rows(
		row: Record<string, unknown>,
		needs_attention_modal_ui: boolean,
		required_keys: ReadonlySet<string>
	): modal_detail_view_row[] {
		const ordered = upload_meta_editable_field_list.map((field) => ({
			key: field.key,
			label: field.label,
			value: row[field.key],
			attention_issue:
				needs_attention_modal_ui &&
				modal_detail_key_is_attention_issue(row, field.key, required_keys)
		}));
		const rest = Object.entries(row)
			.filter(
				([key]) =>
					key !== 'exifr_full_json' &&
					key !== 'exifr_full_json_parsed' &&
					key !== 'starred' &&
					key !== 'archived_at_ms' &&
					!editable_meta_keys.has(key)
			)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => ({
				key,
				label: key,
				value,
				attention_issue:
					needs_attention_modal_ui && modal_detail_key_is_attention_issue(row, key, required_keys)
			}));

		return [...ordered, ...rest];
	}

	const meta_edit_row_for_attention = $derived.by((): Record<string, unknown> | null => {
		if (modal_detail == null) return null;
		if (modal_meta_editing) return merge_detail_with_meta_edits(modal_detail, meta_edit_values);
		return modal_detail;
	});

	const meta_edit_fields_display_order = $derived([...upload_meta_editable_field_list]);

	function modal_image_on_error() {
		if (modal_image_display_src === modal_image_object_url) {
			revoke_modal_object_url();
		}
		if (modal_image_fallback_src !== '' && modal_image_display_src !== modal_image_fallback_src) {
			modal_image_display_src = modal_image_fallback_src;
			modal_image_key += 1;
		}
	}

	async function open_gallery_modal(item: gallery_grid_item) {
		modal_current_relative_path = item.relative_path;
		modal_action_error = null;
		modal_download_error = null;
		modal_download_menu_open = false;
		revoke_modal_object_url();
		modal_image_session += 1;
		const fetch_session = modal_image_session;
		modal_meta_editing = false;
		meta_save_error = null;
		reset_preview_zoom_pan();
		modal_image_fallback_src = item.src;
		modal_image_display_src = item.src;
		modal_image_key += 1;
		modal_heading = item.relative_path.split('/').pop() ?? m.plain_soft_crow_fallback_photo();
		modal_upload_id = item.upload_id;
		gallery_modal_open = true;
		modal_detail = null;
		modal_detail_error = null;

		const full_url = item.full_src;
		if (full_url != null && full_url !== '') {
			void (async () => {
				try {
					const response = await fetch(full_url);
					if (!response.ok) return;
					const blob = await response.blob();
					if (blob.size === 0) return;
					const object_url = URL.createObjectURL(blob);
					if (fetch_session !== modal_image_session || !gallery_modal_open) {
						URL.revokeObjectURL(object_url);
						return;
					}
					revoke_modal_object_url();
					modal_image_object_url = object_url;
					modal_image_display_src = object_url;
					modal_image_key += 1;
				} catch {
					/* keep grid thumbnail */
				}
			})();
		}

		if (item.upload_id == null) {
			modal_detail_loading = false;
			return;
		}

		modal_detail_loading = true;
		try {
			const response = await fetch(resolve(`/api/gallery/upload-meta/${item.upload_id}`));
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const payload = (await response.json()) as Record<string, unknown>;
			modal_detail = payload;
			if (typeof payload.original_filename === 'string') {
				modal_heading = payload.original_filename;
			}
		} catch (e) {
			modal_detail_error = e instanceof Error ? e.message : String(e);
		} finally {
			modal_detail_loading = false;
		}
	}
</script>

<svelte:head>
	<title>{m.tidy_best_bumblebee_feast_dashboard()}</title>
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
		<div class="flex shrink-0 items-center gap-2">
			{#if data.gallery_filters.gallery_focus !== 'albums'}
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
						<GridOutline class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{:else}
						<ColumnOutline class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{/if}
				</button>
				<button
					type="button"
					class="{gallery_header_icon_button_class} {gallery_selection_mode
						? 'border-primary-500 ring-2 ring-primary-200 dark:border-primary-500 dark:ring-primary-900'
						: ''}"
					aria-pressed={gallery_selection_mode}
					aria-label={gallery_selection_mode
						? m.fierce_tiny_lark_aria_exit_multiselect()
						: m.fierce_tiny_lark_aria_enter_multiselect()}
					onclick={() => set_gallery_selection_mode(!gallery_selection_mode)}
				>
					<CheckOutline class={gallery_header_icon_glyph_class} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="{gallery_header_icon_button_class} relative"
					aria-expanded={filters_panel_user_open}
					aria-controls="gallery-filters-panel"
					aria-label={gallery_filters_toggle_aria_label(filters_panel_user_open)}
					onclick={on_filters_toggle_click}
				>
					{#if filters_panel_user_open || gallery_exif_star_filter_count > 0}
						<FilterSolid class={gallery_header_icon_glyph_class} aria-hidden="true" />
					{:else}
						<FilterOutline class={gallery_header_icon_glyph_class} aria-hidden="true" />
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
						class={filter_field_class}
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
								<FolderOutline
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
			<div
				class="dark:bg-primary-950/40 mb-4 rounded-lg border border-primary-200 bg-primary-50/90 px-3 py-2.5 dark:border-primary-900"
				role="region"
				aria-label={m.dull_solid_gull_aria_bulk_actions()}
			>
				{#if bulk_action_error}
					<p class="mb-2 text-xs text-red-700 dark:text-red-300" role="alert">
						{bulk_action_error}
					</p>
				{/if}
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<span class="text-sm font-medium text-gray-800 dark:text-gray-200">
						{m.warm_round_bison_bulk_selected_count({ count: gallery_selected_count })}
					</span>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class={bulk_bar_button_class}
							disabled={bulk_action_loading}
							onclick={select_all_gallery_uploads_on_page}
						>
							{m.noble_clear_frog_bulk_all_on_page()}
						</button>
						<button
							type="button"
							class={bulk_bar_button_class}
							disabled={bulk_action_loading || gallery_selected_count === 0}
							onclick={() => {
								gallery_selected_upload_ids = [];
								gallery_selection_anchor_index = null;
							}}
						>
							{m.noble_clear_frog_bulk_clear_selection()}
						</button>
						<button
							type="button"
							class={bulk_bar_button_class}
							disabled={bulk_action_loading}
							onclick={() => set_gallery_selection_mode(false)}
						>
							{m.noble_clear_frog_bulk_done()}
						</button>
					</div>
					<span class="hidden h-4 w-px bg-gray-300 sm:block dark:bg-gray-600" aria-hidden="true"
					></span>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="{bulk_bar_button_class} inline-flex items-center gap-1"
							disabled={bulk_action_loading || gallery_selected_count === 0}
							onclick={() => void bulk_star_selected(true)}
						>
							<StarSolid class="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
							{m.noble_clear_frog_bulk_star()}
						</button>
						<button
							type="button"
							class="{bulk_bar_button_class} inline-flex items-center gap-1"
							disabled={bulk_action_loading || gallery_selected_count === 0}
							onclick={() => void bulk_star_selected(false)}
						>
							<StarOutline class="h-3.5 w-3.5" aria-hidden="true" />
							{m.noble_clear_frog_bulk_unstar()}
						</button>
						{#if bulk_bar_can_archive}
							<button
								type="button"
								class="{bulk_bar_button_class} inline-flex items-center gap-1 text-red-700 dark:text-red-300"
								disabled={bulk_action_loading || gallery_selected_count === 0}
								onclick={() => void bulk_archive_selected(true)}
							>
								<TrashBinOutline class="h-3.5 w-3.5" aria-hidden="true" />
								{m.noble_clear_frog_bulk_archive()}
							</button>
						{/if}
						{#if bulk_bar_can_restore}
							<button
								type="button"
								class="{bulk_bar_button_class} inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
								disabled={bulk_action_loading || gallery_selected_count === 0}
								onclick={() => void bulk_archive_selected(false)}
							>
								<ArchiveArrowDownOutline class="h-3.5 w-3.5" aria-hidden="true" />
								{m.noble_clear_frog_bulk_restore()}
							</button>
						{/if}
						<button
							type="button"
							class="{bulk_bar_button_class} inline-flex items-center gap-1 text-primary-700 dark:text-primary-300"
							disabled={bulk_action_loading || gallery_selected_count === 0}
							onclick={open_album_modal}
						>
							<FolderOutline class="h-3.5 w-3.5" aria-hidden="true" />
							{m.moody_bright_carp_bulk_add_to_album()}
						</button>
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-600 dark:text-gray-400">
					{m.noble_clear_frog_bulk_hint()}
				</p>
			</div>
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
					<FilterOutline
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
								class={filter_field_class}
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
								class={filter_field_class}
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
								class={filter_field_class}
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
								class={filter_field_class}
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
								class={filter_field_class}
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
								class={filter_field_class}
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
								class={filter_field_class}
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
								class={filter_field_class}
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
			<ul class={gallery_grid_list_class} role="list">
				{#each gallery_images as item (item.relative_path)}
					<li
						class="relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 {gallery_selection_mode &&
						item.upload_id != null &&
						gallery_upload_is_selected(item.upload_id)
							? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
							: ''}"
					>
						{#if gallery_selection_mode && item.upload_id != null}
							<span
								class="pointer-events-none absolute top-1.5 left-1.5 z-10 flex h-6 w-6 items-center justify-center rounded border-2 border-white bg-black/50 shadow dark:border-gray-800"
								aria-hidden="true"
							>
								{#if gallery_upload_is_selected(item.upload_id)}
									<CheckOutline class="h-4 w-4 text-white" />
								{/if}
							</span>
						{/if}
						<button
							type="button"
							class="relative block w-full shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
							onclick={(e) => on_gallery_tile_activate(item, e)}
						>
							<img
								src={item.src}
								alt={item.alt}
								class="aspect-square w-full object-cover"
								loading="lazy"
								decoding="async"
							/>
							{#if item.starred}
								<span
									class="pointer-events-none absolute top-1 right-1 rounded bg-black/55 p-0.5 text-amber-300"
									aria-hidden="true"
								>
									<StarSolid class="h-3.5 w-3.5" />
								</span>
							{/if}
						</button>
						{#if gallery_grid_show_meta && item.meta}
							<button
								type="button"
								class="w-full border-t border-gray-200 bg-white/90 px-2 py-2 text-left dark:border-gray-700 dark:bg-gray-950/90"
								onclick={(e) => on_gallery_tile_activate(item, e)}
							>
								<div
									class="space-y-1"
									role="group"
									aria-label={m.calm_gray_martin_aria_photo_details()}
								>
									{#each item.meta.rows as row, row_i (`${item.relative_path}-${row.key}-${row_i}`)}
										{@const Icon = meta_row_icon_component(row.key)}
										<div
											class="flex gap-1.5 text-[10px] leading-snug text-gray-700 dark:text-gray-300"
										>
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

			{#if gallery_has_more}
				<div
					bind:this={gallery_load_more_sentinel}
					class="h-1 w-full shrink-0"
					aria-hidden="true"
				></div>
			{/if}

			{#if gallery_load_more_in_flight}
				<p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400" role="status">
					{m.small_proud_robin_wait_preparing()}
				</p>
			{/if}

			{#if gallery_load_more_error != null}
				<p class="mt-4 text-center text-sm text-red-600 dark:text-red-400" role="alert">
					{gallery_load_more_error}
					<button
						type="button"
						class="ms-2 underline"
						onclick={() => void fetch_next_gallery_batch()}
					>
						{m.still_kind_racoon_engage_next()}
					</button>
				</p>
			{/if}
		{/if}
	{/if}
</div>

<Modal
	bind:open={gallery_modal_open}
	size="xl"
	dismissable={false}
	classes={{
		header: '!py-2 !px-2 !border-b !border-gray-200 dark:!border-gray-700',
		body: 'max-h-[min(92vh,920px)] overflow-hidden !p-3 sm:!p-4'
	}}
>
	{#snippet header()}
		<div class="flex w-full min-w-0 items-center gap-1">
			<p
				class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white"
				title={modal_heading}
			>
				{modal_heading}
			</p>
			<div class="flex shrink-0 items-center gap-0.5">
				<button
					type="button"
					class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
					aria-label={m.brisk_tidy_finch_aria_prev_image()}
					disabled={!modal_has_prev || modal_action_loading}
					onclick={() => modal_go_delta(-1)}
				>
					<ChevronLeftOutline class="h-5 w-5 shrink-0" />
				</button>
				<button
					type="button"
					class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
					aria-label={m.brisk_tidy_finch_aria_next_image()}
					disabled={!modal_has_next || modal_action_loading}
					onclick={() => modal_go_delta(1)}
				>
					<ChevronRightOutline class="h-5 w-5 shrink-0" />
				</button>
				{#if modal_upload_id != null}
					<button
						type="button"
						class="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-950/40"
						aria-label={modal_detail_starred
							? m.brisk_tidy_finch_aria_remove_star()
							: m.brisk_tidy_finch_aria_star_image()}
						disabled={modal_detail_loading || modal_action_loading || modal_detail == null}
						onclick={() => void toggle_modal_star()}
					>
						{#if modal_detail_starred}
							<StarSolid class="h-5 w-5 shrink-0" />
						{:else}
							<StarOutline class="h-5 w-5 shrink-0" />
						{/if}
					</button>
					<button
						type="button"
						class="rounded-lg p-2 disabled:pointer-events-none disabled:opacity-40 {modal_detail_archived
							? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
							: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'}"
						aria-label={modal_detail_archived
							? m.brisk_tidy_finch_aria_restore_gallery()
							: m.brisk_tidy_finch_aria_archive_image()}
						disabled={modal_detail_loading || modal_action_loading || modal_detail == null}
						onclick={() => void toggle_modal_archive()}
					>
						{#if modal_detail_archived}
							<ArchiveArrowDownOutline class="h-5 w-5 shrink-0" />
						{:else}
							<TrashBinOutline class="h-5 w-5 shrink-0" />
						{/if}
					</button>
					<details bind:open={modal_download_menu_open} class="relative">
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
								disabled={modal_download_loading || !modal_can_download_preview}
								onclick={() => void modal_trigger_download('preview')}
							>
								{m.quick_polite_gecko_modal_download_preview()}
							</button>
							<button
								type="button"
								role="menuitem"
								class="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-700"
								disabled={modal_download_loading}
								onclick={() => void modal_trigger_download('raw')}
							>
								{m.quick_polite_gecko_modal_download_raw()}
							</button>
						</div>
					</details>
				{/if}
			</div>
			<CloseButton
				class="shrink-0"
				name=""
				ariaLabel={m.brisk_tidy_finch_aria_close()}
				onclick={() => {
					gallery_modal_open = false;
				}}
			/>
		</div>
	{/snippet}
	<div
		class="flex h-[min(90dvh,880px)] w-full max-w-[100vw] flex-col overflow-hidden lg:h-[min(86vh,840px)]"
	>
		{#if modal_action_error}
			<p
				class="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
				role="alert"
			>
				{modal_action_error}
			</p>
		{/if}
		{#if modal_download_error != null}
			<p
				class="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
				role="alert"
			>
				{m.quick_polite_gecko_modal_download_failed()}
				{modal_download_error}
			</p>
		{/if}
		<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
			<div
				class="relative flex h-[min(38dvh,400px)] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 px-2 py-2 lg:h-full lg:min-h-0 lg:flex-1 lg:self-stretch dark:bg-gray-950"
			>
				{#if modal_image_display_src}
					<div
						class="relative h-full w-full touch-none"
						use:attach_zoom_pan
						role="application"
						aria-label={m.grand_sleek_herring_aria_preview_zoom_pan()}
					>
						<div
							class="flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
							style="transform: translate({preview_pan_x}px, {preview_pan_y}px) scale({preview_scale}); transform-origin: center center; will-change: transform;"
						>
							{#key modal_image_key}
								<img
									src={modal_image_display_src}
									alt=""
									loading="eager"
									decoding="async"
									fetchpriority="high"
									draggable="false"
									class="max-h-full max-w-full object-contain select-none"
									onerror={modal_image_on_error}
									ondblclick={(e) => {
										e.stopPropagation();
										reset_preview_zoom_pan();
									}}
								/>
							{/key}
						</div>
						<p
							class="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white"
						>
							{m.busy_fun_toad_feel_scroll_to_zoom()} · {m.ornate_house_flamingo_foster_drag_tp_pan()}
							· {m.topical_lower_eagle_pull_double_click_to_reset()}
						</p>
					</div>
				{:else}
					<p class="m-auto text-sm text-gray-500 dark:text-gray-400">
						{m.each_direct_kestrel_praise_no_image_url()}
					</p>
				{/if}
			</div>
			<div
				class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden border-t border-gray-200 text-xs text-gray-800 sm:px-1 lg:w-[min(26rem,42vw)] lg:shrink-0 lg:border-t-0 lg:border-l dark:border-gray-700 dark:text-gray-200"
			>
				{#if modal_upload_id == null}
					<div class="overflow-y-auto px-1 py-3 sm:px-2">
						<p class="text-gray-500 dark:text-gray-400">
							{m.slow_true_angelfish_enchant_no_database_record_for_this_file()}
						</p>
					</div>
				{:else if modal_detail_loading}
					<div class="px-1 py-3 sm:px-2">
						<p class="text-gray-500 dark:text-gray-400">
							{m.silly_these_deer_amaze_loading_metadata()}
						</p>
					</div>
				{:else if modal_detail_error}
					<div class="px-1 py-3 sm:px-2">
						<p class="text-red-600 dark:text-red-400">{modal_detail_error}</p>
					</div>
				{:else if modal_detail}
					<div
						class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-gray-200 px-1 py-2 sm:px-2 dark:border-gray-800"
					>
						{#if !modal_meta_editing}
							<button
								type="button"
								class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
								onclick={() => {
									fill_meta_edit_from_detail();
									modal_meta_editing = true;
								}}
							>
								<PenOutline class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
								{m.tense_caring_pug_bake_edit_metadata()}
							</button>
						{:else}
							<button
								type="button"
								class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
								disabled={meta_save_loading}
								onclick={() => {
									modal_meta_editing = false;
									meta_save_error = null;
								}}
							>
								{m.low_seemly_crow_slurp_cancel()}
							</button>
							<button
								type="button"
								class="rounded-lg bg-primary-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
								disabled={meta_save_loading}
								onclick={() => void save_meta_edits()}
							>
								{meta_save_loading
									? m.fierce_small_goat_busy_saving()
									: m.bold_calm_koala_save_changes()}
							</button>
						{/if}
					</div>
					{#if meta_save_error != null && modal_meta_editing}
						<p class="shrink-0 px-1 py-1 text-[11px] text-red-600 sm:px-2 dark:text-red-400">
							{meta_save_error}
						</p>
					{/if}
					<div
						class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-1 py-3 sm:px-2"
					>
						{#if modal_meta_editing}
							<form
								class="space-y-3"
								onsubmit={(e) => {
									e.preventDefault();
									void save_meta_edits();
								}}
							>
								{#each meta_edit_fields_display_order as field (field.key)}
									<div>
										<label
											class="mb-0.5 flex items-start gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400"
											for="meta-edit-{field.key}"
										>
											{#if modal_needs_attention_ui && meta_edit_row_for_attention != null && modal_detail_key_is_attention_issue(meta_edit_row_for_attention, field.key, needs_attention_required_key_set)}
												<ExclamationCircleOutline
													class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400"
													aria-hidden="true"
												/>
												<span class="sr-only">{m.left_fresh_dolphin_nail_missing_data()}:</span>
											{/if}
											<span class="min-w-0">{field.label}</span>
										</label>
										{#if field.kind === 'textarea'}
											<textarea
												id="meta-edit-{field.key}"
												rows="2"
												class="w-full min-w-0 rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-[11px] text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
												bind:value={meta_edit_values[field.key]}
											></textarea>
										{:else}
											<input
												id="meta-edit-{field.key}"
												type="text"
												inputmode={field.kind === 'number' ? 'decimal' : undefined}
												class="w-full min-w-0 rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-[11px] text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
												bind:value={meta_edit_values[field.key]}
											/>
										{/if}
									</div>
								{/each}
							</form>
						{:else}
							<dl class="space-y-2">
								{#each modal_detail_view_rows(modal_detail, modal_needs_attention_ui, needs_attention_required_key_set) as view_row (view_row.key)}
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
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</Modal>

<Modal
	bind:open={album_modal_open}
	size="md"
	autoclose={false}
	classes={{
		header: '!py-3 !px-4 !border-b !border-gray-200 dark:!border-gray-700',
		body: '!p-4'
	}}
>
	{#snippet header()}
		<p class="text-base font-semibold text-gray-900 dark:text-white">
			{m.jumpy_green_finch_album_add_modal_title()}
		</p>
	{/snippet}
	<div class="space-y-4">
		{#if album_modal_error != null}
			<p class="text-sm text-red-600 dark:text-red-400" role="alert">{album_modal_error}</p>
		{/if}
		<fieldset class="space-y-3">
			<legend class="sr-only">{m.jumpy_green_finch_album_add_modal_title()}</legend>
			<label
				class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
			>
				<input
					type="radio"
					name="album_target_mode"
					value="existing"
					class="border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
					bind:group={album_target_mode}
					disabled={data.albums.length === 0}
				/>
				{m.late_mild_crane_album_add_existing_label()}
			</label>
			{#if album_target_mode === 'existing' && data.albums.length > 0}
				<select
					class="{filter_field_class} ms-6 max-w-md"
					bind:value={album_existing_id}
					aria-label={m.tight_proud_bass_album_add_select_placeholder()}
				>
					{#each data.albums as album_option (album_option.id)}
						<option value={album_option.id}>{album_option.name}</option>
					{/each}
				</select>
			{/if}
			<label
				class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
			>
				<input
					type="radio"
					name="album_target_mode"
					value="new"
					class="border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
					bind:group={album_target_mode}
				/>
				{m.fancy_quaint_newt_album_add_new_label()}
			</label>
			{#if album_target_mode === 'new'}
				<input
					type="text"
					class="{filter_field_class} ms-6 max-w-md"
					placeholder={m.crisp_slow_lark_album_add_name_placeholder()}
					bind:value={album_new_name}
					maxlength={200}
					autocomplete="off"
				/>
			{/if}
		</fieldset>
		<div class="flex flex-wrap justify-end gap-2 pt-2">
			<button
				type="button"
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
				disabled={album_modal_loading}
				onclick={() => {
					album_modal_open = false;
				}}
			>
				{m.low_seemly_crow_slurp_cancel()}
			</button>
			<button
				type="button"
				class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
				disabled={album_modal_loading ||
					(album_target_mode === 'existing' &&
						(data.albums.length === 0 || album_existing_id.trim() === '')) ||
					(album_target_mode === 'new' && album_new_name.trim() === '')}
				onclick={() => void submit_add_to_album()}
			>
				{album_modal_loading
					? m.fierce_small_goat_busy_saving()
					: m.noble_tidy_quail_album_add_submit()}
			</button>
		</div>
	</div>
</Modal>

<svelte:window onkeydown={on_gallery_modal_window_keydown} />
