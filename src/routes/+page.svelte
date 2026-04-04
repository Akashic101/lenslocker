<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { untrack } from 'svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { gallery_active_upload_count_depends_key } from '$lib/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/transformed_media_cache';
	import { upload_meta_editable_field_list } from '$lib/upload_meta_editable_fields';
	import { CloseButton, Modal } from 'flowbite-svelte';
	import {
		AdjustmentsHorizontalOutline,
		AdjustmentsVerticalOutline,
		CameraPhotoOutline,
		ChevronLeftOutline,
		ChevronRightOutline,
		ClockOutline,
		EyeOutline,
		FilterOutline,
		FolderOutline,
		ImageOutline,
		PenOutline,
		StarOutline,
		StarSolid,
		TrashBinOutline
	} from 'flowbite-svelte-icons';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';

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

	let { data } = $props();

	/**
	 * Panel is shown when the URL has filter params or the user opened it. Hiding clears the query and
	 * resets this flag so the full gallery is listed again.
	 */
	let filters_panel_user_open = $state(false);

	const filters_panel_open = $derived(data.gallery_filters.active || filters_panel_user_open);

	function on_filters_toggle_click(): void {
		if (filters_panel_open) {
			filters_panel_user_open = false;
			void goto(localizeHref('/'), { noScroll: true });
		} else {
			filters_panel_user_open = true;
		}
	}

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
		const pairs = data.gallery_filter_meta.camera_pairs;
		const make_lc = filter_camera_make.trim().toLowerCase();
		const all = [...new Set(pairs.map((p) => p.model.trim()).filter((m) => m !== ''))].sort(
			(a, b) => a.localeCompare(b)
		);
		if (make_lc === '') return all;
		const narrowed = [
			...new Set(
				pairs
					.filter((p) => p.make.trim().toLowerCase() === make_lc)
					.map((p) => p.model.trim())
					.filter((m) => m !== '')
			)
		].sort((a, b) => a.localeCompare(b));
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
		const pairs = data.gallery_filter_meta.lens_pairs;
		const make_lc = filter_lens_make.trim().toLowerCase();
		const all = [...new Set(pairs.map((p) => p.lens_model.trim()).filter((m) => m !== ''))].sort(
			(a, b) => a.localeCompare(b)
		);
		if (make_lc === '') return all;
		const narrowed = [
			...new Set(
				pairs
					.filter((p) => p.lens_make.trim().toLowerCase() === make_lc)
					.map((p) => p.lens_model.trim())
					.filter((m) => m !== '')
			)
		].sort((a, b) => a.localeCompare(b));
		return narrowed.length > 0 ? narrowed : all;
	});

	const iso_placeholder_min = $derived(
		data.gallery_filter_meta.iso_stats.min != null
			? String(data.gallery_filter_meta.iso_stats.min)
			: 'Min'
	);
	const iso_placeholder_max = $derived(
		data.gallery_filter_meta.iso_stats.max != null
			? String(data.gallery_filter_meta.iso_stats.max)
			: 'Max'
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
	let modal_heading = $state('Photo');
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

	const modal_list_index = $derived.by(() => {
		if (modal_current_relative_path === '') return -1;
		return data.images.findIndex((i) => i.relative_path === modal_current_relative_path);
	});

	const modal_has_prev = $derived(modal_list_index > 0);
	const modal_has_next = $derived(
		modal_list_index >= 0 && modal_list_index < data.images.length - 1
	);

	const modal_detail_starred = $derived(modal_detail != null && Number(modal_detail.starred) === 1);

	let preview_scale = $state(1);
	let preview_pan_x = $state(0);
	let preview_pan_y = $state(0);
	let modal_meta_editing = $state(false);
	let meta_edit_values = $state<Record<string, string>>({});
	let meta_save_loading = $state(false);
	let meta_save_error = $state<string | null>(null);

	const real_numeric_field_keys = new Set<string>([
		'f_number',
		'exposure_time_seconds',
		'focal_length'
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
			});
		}
	});

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
			if (body.archive === true) {
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

	async function archive_current_modal_upload(): Promise<void> {
		const ok = await patch_gallery_upload({ archive: true });
		if (ok) gallery_modal_open = false;
	}

	function modal_go_delta(delta: number): void {
		const i = modal_list_index;
		if (i < 0) return;
		const next_item = data.images[i + delta];
		if (next_item == null) return;
		void open_gallery_modal(next_item);
	}

	function pagination_href(target_page: number): string {
		const q = new SvelteURLSearchParams(data.gallery_filter_query);
		if (target_page > 1) q.set('page', String(target_page));
		else q.delete('page');
		const s = q.toString();
		return s ? localizeHref(`/?${s}`) : localizeHref('/');
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
		if (value === null || value === undefined) return '—';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	const editable_meta_keys = new Set<string>(
		upload_meta_editable_field_list.map((field) => field.key)
	);

	/** Same field order as the edit form; then remaining columns A–Z. */
	function modal_detail_view_rows(
		row: Record<string, unknown>
	): { key: string; label: string; value: unknown }[] {
		const ordered = upload_meta_editable_field_list.map((field) => ({
			key: field.key,
			label: field.label,
			value: row[field.key]
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
			.map(([key, value]) => ({ key, label: key, value }));
		return [...ordered, ...rest];
	}

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
		revoke_modal_object_url();
		modal_image_session += 1;
		const fetch_session = modal_image_session;
		modal_meta_editing = false;
		meta_save_error = null;
		reset_preview_zoom_pan();
		modal_image_fallback_src = item.src;
		modal_image_display_src = item.src;
		modal_image_key += 1;
		modal_heading = item.relative_path.split('/').pop() ?? 'Photo';
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
	<title>Transformed</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Transformed</h1>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
				Media root: <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800"
					>{data.transformed_source}</code
				>
				— up to {data.pagination.images_per_page} files per page ({data.pagination.total_count} total),
				newest first. Click an image for a large view and full metadata (uploads only). New uploads get
				<code class="text-xs">_thumb.jpg</code> (grid) and <code class="text-xs">_full.jpg</code>
				(modal) under
				<code class="text-xs">upload-previews/</code>. Open the Filters button to narrow by EXIF;
				with the panel closed and no filter query, every file in the media root is listed.
			</p>
		</div>
		<button
			type="button"
			class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
			aria-expanded={filters_panel_open}
			aria-controls="gallery-filters-panel"
			onclick={on_filters_toggle_click}
		>
			<FilterOutline class="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
			{filters_panel_open ? 'Hide filters' : 'Filters'}
		</button>
	</header>

	{#if filters_panel_open}
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
				Filters
			</h2>
			<form method="GET" action={localizeHref('/')} class="mt-4 space-y-4">
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<div>
						<label
							for="gf-camera-make"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
							>Camera make</label
						>
						<select
							id="gf-camera-make"
							name="camera_make"
							class={filter_field_class}
							bind:value={filter_camera_make}
							onchange={on_filter_camera_make_change}
						>
							<option value="">Any</option>
							{#each gallery_camera_makes as make_option (make_option)}
								<option value={make_option}>{make_option}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="gf-camera-model"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
							>Camera model</label
						>
						<select
							id="gf-camera-model"
							name="camera_model"
							class={filter_field_class}
							bind:value={filter_camera_model}
						>
							<option value="">Any</option>
							{#each gallery_camera_models as model_option (model_option)}
								<option value={model_option}>{model_option}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="gf-lens-make"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
							>Lens make</label
						>
						<select
							id="gf-lens-make"
							name="lens_make"
							class={filter_field_class}
							bind:value={filter_lens_make}
							onchange={on_filter_lens_make_change}
						>
							<option value="">Any</option>
							{#each gallery_lens_makes as make_option (make_option)}
								<option value={make_option}>{make_option}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="gf-lens-model"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
							>Lens model</label
						>
						<select
							id="gf-lens-model"
							name="lens_model"
							class={filter_field_class}
							bind:value={filter_lens_model}
						>
							<option value="">Any</option>
							{#each gallery_lens_models as model_option (model_option)}
								<option value={model_option}>{model_option}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="gf-date-from"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
							>Date from</label
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
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Date to</label
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
						Starred only
					</label>
				</div>
				<div class="flex flex-wrap items-end gap-3">
					<div class="w-full max-w-xs min-w-[8rem] sm:w-auto">
						<label
							for="gf-iso-min"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">ISO min</label
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
					<div class="w-full max-w-xs min-w-[8rem] sm:w-auto">
						<label
							for="gf-iso-max"
							class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">ISO max</label
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
							Apply filters
						</button>
						<a
							href={localizeHref('/')}
							class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
						>
							Clear
						</a>
					</div>
				</div>
			</form>
		</section>
	{/if}

	{#if data.images.length === 0}
		<p
			class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400"
		>
			{#if data.gallery_filters.active}
				No photos match these filters. Try clearing filters or broadening ISO / dates.
			{:else}
				No media yet. Upload from <a
					href={localizeHref('/upload')}
					class="text-primary-600 underline dark:text-primary-400">Upload</a
				>, set <code class="text-xs">TRANSFORMED_MEDIA_ROOT</code>, or add files under
				<code class="text-xs">static/transformed/</code>.
			{/if}
		</p>
	{:else}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" role="list">
			{#each data.images as item (item.relative_path)}
				<li
					class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
				>
					<button
						type="button"
						class="relative block w-full shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
						onclick={() => open_gallery_modal(item)}
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
					{#if item.meta}
						<button
							type="button"
							class="w-full border-t border-gray-200 bg-white/90 px-2 py-2 text-left dark:border-gray-700 dark:bg-gray-950/90"
							onclick={() => open_gallery_modal(item)}
						>
							<div class="space-y-1" role="group" aria-label="Photo details">
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

		{#if data.pagination.total_pages > 1}
			<nav class="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
				{#if data.pagination.has_previous}
					<a
						href={pagination_href(data.pagination.current_page - 1)}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						Previous
					</a>
				{/if}

				<span class="px-3 text-sm text-gray-600 dark:text-gray-400">
					Page {data.pagination.current_page} of {data.pagination.total_pages}
				</span>

				{#if data.pagination.has_next}
					<a
						href={pagination_href(data.pagination.current_page + 1)}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						Next
					</a>
				{/if}
			</nav>
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
					aria-label="Previous image"
					disabled={!modal_has_prev || modal_action_loading}
					onclick={() => modal_go_delta(-1)}
				>
					<ChevronLeftOutline class="h-5 w-5 shrink-0" />
				</button>
				<button
					type="button"
					class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
					aria-label="Next image"
					disabled={!modal_has_next || modal_action_loading}
					onclick={() => modal_go_delta(1)}
				>
					<ChevronRightOutline class="h-5 w-5 shrink-0" />
				</button>
				{#if modal_upload_id != null}
					<button
						type="button"
						class="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-950/40"
						aria-label={modal_detail_starred ? 'Remove star' : 'Star image'}
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
						class="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/40"
						aria-label="Archive image"
						disabled={modal_action_loading}
						onclick={() => void archive_current_modal_upload()}
					>
						<TrashBinOutline class="h-5 w-5 shrink-0" />
					</button>
				{/if}
			</div>
			<CloseButton
				class="shrink-0"
				name=""
				ariaLabel="Close"
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
		<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
			<div
				class="relative flex h-[min(38dvh,400px)] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 px-2 py-2 lg:h-full lg:min-h-0 lg:flex-1 lg:self-stretch dark:bg-gray-950"
			>
				{#if modal_image_display_src}
					<div
						class="relative h-full w-full touch-none"
						use:attach_zoom_pan
						role="application"
						aria-label="Preview: scroll to zoom, drag to pan, double-click image to reset"
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
							Scroll to zoom · drag to pan · double-click to reset
						</p>
					</div>
				{:else}
					<p class="m-auto text-sm text-gray-500 dark:text-gray-400">No image URL</p>
				{/if}
			</div>
			<div
				class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden border-t border-gray-200 text-xs text-gray-800 sm:px-1 lg:w-[min(26rem,42vw)] lg:shrink-0 lg:border-t-0 lg:border-l dark:border-gray-700 dark:text-gray-200"
			>
				{#if modal_upload_id == null}
					<div class="overflow-y-auto px-1 py-3 sm:px-2">
						<p class="text-gray-500 dark:text-gray-400">
							No database record for this file — only the preview image is shown.
						</p>
					</div>
				{:else if modal_detail_loading}
					<div class="px-1 py-3 sm:px-2">
						<p class="text-gray-500 dark:text-gray-400">Loading metadata…</p>
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
								Edit metadata
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
								Cancel
							</button>
							<button
								type="button"
								class="rounded-lg bg-primary-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
								disabled={meta_save_loading}
								onclick={() => void save_meta_edits()}
							>
								{meta_save_loading ? 'Saving…' : 'Save'}
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
								{#each upload_meta_editable_field_list as field (field.key)}
									<div>
										<label
											class="mb-0.5 block text-[10px] font-medium text-gray-500 dark:text-gray-400"
											for="meta-edit-{field.key}">{field.label}</label
										>
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
								{#each modal_detail_view_rows(modal_detail) as view_row (view_row.key)}
									<div class="border-b border-gray-100 pb-2 last:border-0 dark:border-gray-800">
										<dt
											class="text-[10px] font-medium text-gray-500 dark:text-gray-400"
											class:font-mono={view_row.label === view_row.key}
											title={view_row.key}
										>
											{view_row.label}
										</dt>
										<dd class="mt-0.5 font-mono text-[11px] wrap-break-word">
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
