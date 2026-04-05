<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { invalidate } from '$app/navigation';
	import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/cache/transformed_media_cache';
	import { needs_attention_issue_for_detail_key } from '$lib/gallery/needs_attention_catalog';
	import GalleryDetailModalAlertBar from './gallery_detail_modal_alert_bar.svelte';
	import GalleryDetailModalHeader from './gallery_detail_modal_header.svelte';
	import GalleryDetailModalHeaderActions from './gallery_detail_modal_header_actions.svelte';
	import GalleryDetailModalMetaActions from './gallery_detail_modal_meta_actions.svelte';
	import GalleryDetailModalMetaPanel from './gallery_detail_modal_meta_panel.svelte';
	import GalleryDetailModalMetaReadList from './gallery_detail_modal_meta_read_list.svelte';
	import type { gallery_grid_item } from '$lib/gallery/gallery_grid_types';
	import type { gallery_modal_detail_view_row } from '$lib/gallery/gallery_modal_detail_view_row';
	import { upload_meta_editable_field_list } from '$lib/gallery/upload_meta_editable_fields';
	import { Modal } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		images,
		needs_attention_ui,
		needs_attention_required_keys
	}: {
		images: gallery_grid_item[];
		needs_attention_ui: boolean;
		needs_attention_required_keys: ReadonlySet<string>;
	} = $props();

	let modal_open = $state(false);
	let modal_heading = $state('');
	let modal_image_display_src = $state('');
	let modal_image_fallback_src = $state('');
	let modal_image_key = $state(0);
	let modal_upload_id = $state<string | null>(null);
	let modal_detail = $state<Record<string, unknown> | null>(null);
	let modal_detail_loading = $state(false);
	let modal_detail_error = $state<string | null>(null);
	let modal_image_object_url = $state<string | null>(null);
	let modal_image_session = 0;

	let modal_current_relative_path = $state('');
	let modal_action_loading = $state(false);
	let modal_action_error = $state<string | null>(null);
	let modal_download_menu_open = $state(false);
	let modal_download_loading = $state(false);
	let modal_download_error = $state<string | null>(null);

	const modal_list_index = $derived.by(() => {
		if (modal_current_relative_path === '') return -1;
		return images.findIndex((i) => i.relative_path === modal_current_relative_path);
	});

	const modal_grid_item = $derived(modal_list_index >= 0 ? images[modal_list_index] : undefined);
	const modal_can_download_preview = $derived(
		modal_grid_item?.full_src != null && modal_grid_item.full_src !== ''
	);

	const modal_has_prev = $derived(modal_list_index > 0);
	const modal_has_next = $derived(modal_list_index >= 0 && modal_list_index < images.length - 1);

	const modal_detail_starred = $derived(modal_detail != null && Number(modal_detail.starred) === 1);

	const modal_detail_archived = $derived(
		modal_detail != null &&
			modal_detail.archived_at_ms != null &&
			Number(modal_detail.archived_at_ms) > 0
	);

	let preview_scale = $state(1);
	let preview_pan_x = $state(0);
	let preview_pan_y = $state(0);

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
		if (!modal_open) {
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
			const safe_heading = modal_heading.replace(/[^\w.-]+/g, '_') || 'photo';
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
		const next_item = images[i + delta];
		if (next_item == null) return;
		void open_gallery_modal(next_item);
	}

	function on_gallery_modal_window_keydown(e: KeyboardEvent): void {
		if (!modal_open) return;
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

	const editable_meta_keys = new Set<string>(
		upload_meta_editable_field_list.map((field) => field.key)
	);

	function modal_detail_key_is_attention_issue(
		row: Record<string, unknown>,
		key: string,
		required_keys: ReadonlySet<string>
	): boolean {
		return needs_attention_issue_for_detail_key(row, key, required_keys);
	}

	function modal_detail_view_rows(
		row: Record<string, unknown>,
		needs_attention_modal_ui: boolean,
		required_keys: ReadonlySet<string>
	): gallery_modal_detail_view_row[] {
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
		modal_open = true;
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
					if (fetch_session !== modal_image_session || !modal_open) {
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

	/** Open the lightbox for a grid item (parent calls via `bind:this`). */
	export function open_for_grid_item(item: gallery_grid_item): void {
		void open_gallery_modal(item);
	}
</script>

<svelte:window onkeydown={on_gallery_modal_window_keydown} />

<Modal
	bind:open={modal_open}
	size="xl"
	dismissable={false}
	classes={{
		header: '!py-2 !px-2 !border-b !border-gray-200 dark:!border-gray-700',
		body: 'max-h-[min(92vh,920px)] overflow-hidden !p-3 sm:!p-4'
	}}
>
	{#snippet header()}
		<GalleryDetailModalHeader
			heading={modal_heading}
			on_close={() => {
				modal_open = false;
			}}
		>
			{#snippet toolbar()}
				<GalleryDetailModalHeaderActions
					prev_disabled={!modal_has_prev || modal_action_loading}
					next_disabled={!modal_has_next || modal_action_loading}
					show_upload_actions={modal_upload_id != null}
					toggle_star_disabled={modal_detail_loading ||
						modal_action_loading ||
						modal_detail == null}
					toggle_archive_disabled={modal_detail_loading ||
						modal_action_loading ||
						modal_detail == null}
					detail_starred={modal_detail_starred}
					detail_archived={modal_detail_archived}
					download_preview_disabled={modal_download_loading || !modal_can_download_preview}
					download_raw_disabled={modal_download_loading}
					bind:download_menu_open={modal_download_menu_open}
					on_prev={() => modal_go_delta(-1)}
					on_next={() => modal_go_delta(1)}
					on_toggle_star={() => void toggle_modal_star()}
					on_toggle_archive={() => void toggle_modal_archive()}
					on_download_preview={() => void modal_trigger_download('preview')}
					on_download_raw={() => void modal_trigger_download('raw')}
				/>
			{/snippet}
		</GalleryDetailModalHeader>
	{/snippet}
	<div
		class="flex h-[min(90dvh,880px)] w-full max-w-[100vw] flex-col overflow-hidden lg:h-[min(86vh,840px)]"
	>
		{#if modal_action_error}
			<GalleryDetailModalAlertBar message={modal_action_error} />
		{/if}
		{#if modal_download_error != null}
			<GalleryDetailModalAlertBar
				prefix={m.quick_polite_gecko_modal_download_failed()}
				message={modal_download_error}
			/>
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
			<GalleryDetailModalMetaPanel
				upload_id={modal_upload_id}
				detail_loading={modal_detail_loading}
				detail_error={modal_detail_error}
				detail={modal_detail}
			>
				{#snippet no_record()}
					<p class="text-gray-500 dark:text-gray-400">
						{m.slow_true_angelfish_enchant_no_database_record_for_this_file()}
					</p>
				{/snippet}
				{#snippet loading()}
					<p class="text-gray-500 dark:text-gray-400">
						{m.silly_these_deer_amaze_loading_metadata()}
					</p>
				{/snippet}
				{#snippet detail_body()}
					<GalleryDetailModalMetaActions
						meta_editing={modal_meta_editing}
						{meta_save_loading}
						on_begin_edit={() => {
							fill_meta_edit_from_detail();
							modal_meta_editing = true;
						}}
						on_cancel_edit={() => {
							modal_meta_editing = false;
							meta_save_error = null;
						}}
						on_save={() => void save_meta_edits()}
					/>
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
											{#if needs_attention_ui && meta_edit_row_for_attention != null && modal_detail_key_is_attention_issue(meta_edit_row_for_attention, field.key, needs_attention_required_keys)}
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
							<GalleryDetailModalMetaReadList
								rows={modal_detail_view_rows(
									modal_detail!,
									needs_attention_ui,
									needs_attention_required_keys
								)}
							/>
						{/if}
					</div>
				{/snippet}
			</GalleryDetailModalMetaPanel>
		</div>
	</div>
</Modal>
