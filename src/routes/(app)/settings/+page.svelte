<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { dashboard_attention_settings_depends_key } from '$lib/cache/dashboard_attention_settings_cache';
	import { settings_backup_list_depends_key } from '$lib/cache/settings_backup_list_cache';
	import { dashboard_needs_attention_default_keys } from '$lib/config/dashboard_attention_defaults';
	import {
		needs_attention_catalog,
		type needs_attention_field_catalog_entry
	} from '$lib/gallery/needs_attention_catalog';
	import { upload_preview_pipeline_defaults } from '$lib/config/upload_pipeline_defaults';
	import { albums_list_depends_key } from '$lib/cache/albums_cache';
	import { upload_pipeline_settings_depends_key } from '$lib/cache/upload_pipeline_settings_cache';
	import { general_display_settings_depends_key } from '$lib/cache/general_display_settings_cache';
	import type { app_time_format } from '$lib/config/display_defaults';
	import type { upload_preview_format } from '$lib/config/upload_preview_format';
	import { format_app_datetime_medium_short } from '$lib/datetime/format_app_datetime';
	import FilePickerButton from '$lib/components/file_picker_button.svelte';
	import InlineNotice from '$lib/components/inline_notice.svelte';
	import ThemeToggle from '$lib/components/theme_toggle.svelte';
	import { app_form_field_class_max_w_md } from '$lib/ui/form_classes';
	import { assertIsLocale, locales, setLocale } from '$lib/paraglide/runtime';
	import { use_system_color_scheme } from '$lib/theme/persisted_theme';
	import { Tabs, TabItem } from 'flowbite-svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages.js';

	const upload_preview_format_choices = $derived.by(
		(): { format_value: upload_preview_format; label: string }[] => [
			{ format_value: 'jpeg', label: m.keen_plain_ibis_upload_format_jpeg_default() },
			{ format_value: 'webp', label: m.stout_calm_raven_upload_format_webp() },
			{ format_value: 'avif', label: m.zany_short_hawk_upload_format_avif() },
			{ format_value: 'png', label: m.moody_clear_shrew_upload_format_png() }
		]
	);

	let { data } = $props();

	let selected_tab = $state('general');

	let thumb_max_edge_px = $state<number>(upload_preview_pipeline_defaults.thumb_max_edge_px);
	let max_full_edge_px = $state<number>(upload_preview_pipeline_defaults.max_full_edge_px);
	let jpeg_q_thumb = $state<number>(upload_preview_pipeline_defaults.jpeg_q_thumb);
	let jpeg_q_full = $state<number>(upload_preview_pipeline_defaults.jpeg_q_full);
	let max_upload_mb = $state<number>(
		Math.round(upload_preview_pipeline_defaults.max_upload_bytes / (1024 * 1024))
	);
	let chosen_upload_preview_format = $state<upload_preview_format>(
		upload_preview_pipeline_defaults.upload_preview_format
	);

	let save_loading = $state(false);
	let save_error = $state<string | null>(null);
	let save_ok = $state(false);

	let dash_required_field_keys = $state<string[]>([...dashboard_needs_attention_default_keys]);

	let dash_save_loading = $state(false);
	let dash_save_error = $state<string | null>(null);
	let dash_save_ok = $state(false);

	let backup_create_loading = $state(false);
	let backup_create_error = $state<string | null>(null);
	let backup_create_ok = $state(false);
	let backup_export_password = $state('');

	let backup_import_input_el = $state<HTMLInputElement | null>(null);
	let backup_import_loading = $state(false);
	let backup_import_error = $state<string | null>(null);
	let backup_import_ok = $state<string | null>(null);
	let backup_import_password = $state('');

	let backup_delete_busy_filename = $state<string | null>(null);
	let backup_delete_error = $state<string | null>(null);

	let chosen_time_format = $state<app_time_format>('24h');
	let display_save_loading = $state(false);
	let display_save_error = $state<string | null>(null);
	let display_save_ok = $state(false);

	$effect(() => {
		const s = data.upload_pipeline_settings;
		thumb_max_edge_px = s.thumb_max_edge_px;
		max_full_edge_px = s.max_full_edge_px;
		jpeg_q_thumb = s.jpeg_q_thumb;
		jpeg_q_full = s.jpeg_q_full;
		max_upload_mb = Math.round(s.max_upload_bytes / (1024 * 1024));
		chosen_upload_preview_format = s.upload_preview_format;
	});

	$effect(() => {
		chosen_time_format = data.general_display_settings.time_format;
	});

	$effect(() => {
		dash_required_field_keys = [...data.needs_attention_settings.required_field_keys];
	});

	const needs_attention_catalog_grouped = $derived.by(() => {
		const map = new SvelteMap<string, { key: string; label: string; group: string }[]>();
		for (const entry of needs_attention_catalog) {
			const group = settings_translated_needs_attention_group(entry.group);
			const label = settings_translated_needs_attention_label(entry);
			const list = map.get(group) ?? [];
			list.push({ key: entry.key, label, group });
			map.set(group, list);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	});

	function dash_field_key_checked(key: string): boolean {
		return dash_required_field_keys.includes(key);
	}

	function on_dash_field_key_change(key: string, checked: boolean): void {
		if (checked) {
			if (!dash_required_field_keys.includes(key)) {
				dash_required_field_keys = [...dash_required_field_keys, key];
			}
		} else {
			dash_required_field_keys = dash_required_field_keys.filter((k) => k !== key);
		}
	}

	function settings_translated_needs_attention_group(group: string): string {
		switch (group) {
			case 'File':
				return m.each_neat_kiwi_need_group_file();
			case 'Image geometry':
				return m.whole_suave_lark_need_group_image_geometry();
			case 'Camera & lens':
				return m.proud_key_badger_need_group_camera_lens();
			case 'Date & time':
				return m.late_merry_husk_need_group_date_time();
			case 'Exposure & shooting':
				return m.pink_clear_impala_need_group_exposure();
			case 'GPS':
				return m.tiny_loud_carp_need_group_gps();
			case 'Description & IPTC':
				return m.round_soft_mink_need_group_description_iptc();
			case 'RAW / DNG':
				return m.cold_sleek_yak_need_group_raw_dng();
			case 'Shortcuts':
				return m.swift_older_frog_need_group_shortcuts();
			default:
				return group;
		}
	}

	function settings_translated_needs_attention_label(
		entry: needs_attention_field_catalog_entry
	): string {
		switch (entry.key) {
			case 'gps_either_missing':
				return m.icy_merry_loon_need_special_gps_missing();
			case 'camera_body_incomplete':
				return m.wide_dull_gull_need_special_camera_incomplete();
			case 'lens_incomplete':
				return m.teal_brief_pike_need_special_lens_incomplete();
			case 'shot_date_calendar_missing':
				return m.brown_quiet_hare_need_special_shot_date_bad();
			case 'exposure_both_missing':
				return m.soft_glad_snipe_need_special_exposure_missing();
			default:
				return entry.label;
		}
	}

	function paraglide_locale_label(locale: (typeof locales)[number]): string {
		if (locale === 'en') return m.loud_formal_finch_locale_english();
		if (locale === 'de') return m.mild_formal_finch_locale_deutsch();
		return locale;
	}

	function on_paraglide_locale_change(ev: Event): void {
		if (!browser) return;
		const raw = (ev.currentTarget as HTMLSelectElement).value;
		const locale = assertIsLocale(raw);
		setLocale(locale);
	}

	async function save_general_display_settings(): Promise<void> {
		display_save_loading = true;
		display_save_error = null;
		display_save_ok = false;
		try {
			const response = await fetch(resolve('/api/settings/display'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ time_format: chosen_time_format })
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			display_save_ok = true;
			await invalidate(general_display_settings_depends_key);
		} catch (e) {
			display_save_error = e instanceof Error ? e.message : String(e);
		} finally {
			display_save_loading = false;
		}
	}

	async function save_upload_pipeline_settings(): Promise<void> {
		save_loading = true;
		save_error = null;
		save_ok = false;
		try {
			const max_upload_bytes = Math.round(max_upload_mb) * 1024 * 1024;
			const response = await fetch(resolve('/api/settings/upload'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					thumb_max_edge_px: Number(thumb_max_edge_px),
					max_full_edge_px: Number(max_full_edge_px),
					jpeg_q_thumb: Number(jpeg_q_thumb),
					jpeg_q_full: Number(jpeg_q_full),
					max_upload_bytes,
					upload_preview_format: chosen_upload_preview_format
				})
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			save_ok = true;
			await invalidate(upload_pipeline_settings_depends_key);
		} catch (e) {
			save_error = e instanceof Error ? e.message : String(e);
		} finally {
			save_loading = false;
		}
	}

	const dash_checkbox_class =
		'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900';

	function format_settings_backup_bytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(2)} MB`;
	}

	function format_settings_backup_when(ms: number): string {
		return format_app_datetime_medium_short(ms, data.general_display_settings.time_format);
	}

	async function create_settings_backup_zip(): Promise<void> {
		backup_create_loading = true;
		backup_create_error = null;
		backup_create_ok = false;
		try {
			const response = await fetch(resolve('/api/settings/backups'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					password: backup_export_password === '' ? null : backup_export_password
				})
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			backup_create_ok = true;
			await invalidate(settings_backup_list_depends_key);
		} catch (e) {
			backup_create_error = e instanceof Error ? e.message : String(e);
		} finally {
			backup_create_loading = false;
		}
	}

	function reset_settings_backup_import_input(): void {
		if (backup_import_input_el) backup_import_input_el.value = '';
	}

	async function submit_settings_backup_import(file: File): Promise<void> {
		if (!confirm(m.dark_heavy_oryx_confirm_restore_backup())) {
			reset_settings_backup_import_input();
			return;
		}
		backup_import_loading = true;
		backup_import_error = null;
		backup_import_ok = null;
		try {
			const form = new FormData();
			form.append('file', file);
			if (backup_import_password !== '') form.append('password', backup_import_password);
			const response = await fetch(resolve('/api/settings/backups/import'), {
				method: 'POST',
				body: form
			});
			const raw = await response.text();
			if (!response.ok) {
				let msg = raw || response.statusText;
				try {
					const j = JSON.parse(raw) as { message?: string };
					if (typeof j.message === 'string' && j.message !== '') msg = j.message;
				} catch {
					/* keep msg */
				}
				throw new Error(msg);
			}
			const parsed = JSON.parse(raw) as {
				app_settings_count?: number;
				hardware_items_count?: number;
				albums_count?: number;
				album_memberships_count?: number;
				date_stamp?: string;
				restored_full_database?: boolean;
			};
			const ac = parsed.app_settings_count ?? 0;
			const hc = parsed.hardware_items_count ?? 0;
			const stamp_suffix =
				typeof parsed.date_stamp === 'string' && parsed.date_stamp !== ''
					? m.plain_tiny_wren_backup_stamp_suffix({ stamp: parsed.date_stamp })
					: '';
			const full = parsed.restored_full_database === true;
			const album_c = parsed.albums_count;
			const album_link_c = parsed.album_memberships_count;
			backup_import_ok = full
				? m.such_proud_puffin_restore_full_db({ stamp_suffix })
				: typeof album_c === 'number' && typeof album_link_c === 'number'
					? m.calm_bright_dotterel_restore_partial_albums({
							app_count: ac,
							hardware_count: hc,
							album_count: album_c,
							album_link_count: album_link_c,
							stamp_suffix
						})
					: m.calm_bright_dotterel_restore_partial({
							app_count: ac,
							hardware_count: hc,
							stamp_suffix
						});
			if (full) {
				await invalidateAll();
			} else {
				await invalidate(upload_pipeline_settings_depends_key);
				await invalidate(dashboard_attention_settings_depends_key);
				await invalidate(general_display_settings_depends_key);
				await invalidate(albums_list_depends_key);
				await invalidate(settings_backup_list_depends_key);
			}
		} catch (e) {
			backup_import_error = e instanceof Error ? e.message : String(e);
		} finally {
			backup_import_loading = false;
			reset_settings_backup_import_input();
		}
	}

	function on_settings_backup_import_change(ev: Event): void {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		void submit_settings_backup_import(file);
	}

	async function delete_settings_backup_row(filename: string): Promise<void> {
		if (!confirm(m.moody_broad_gadfly_confirm_delete_backup({ filename }))) {
			return;
		}
		backup_delete_busy_filename = filename;
		backup_delete_error = null;
		try {
			const response = await fetch(resolve(`/api/settings/backups/${filename}`), {
				method: 'DELETE'
			});
			const raw = await response.text();
			if (!response.ok) {
				let msg = raw || response.statusText;
				try {
					const j = JSON.parse(raw) as { message?: string };
					if (typeof j.message === 'string' && j.message !== '') msg = j.message;
				} catch {
					/* keep msg */
				}
				throw new Error(msg);
			}
			await invalidate(settings_backup_list_depends_key);
		} catch (e) {
			backup_delete_error = e instanceof Error ? e.message : String(e);
		} finally {
			backup_delete_busy_filename = null;
		}
	}

	async function save_dashboard_attention_settings(): Promise<void> {
		dash_save_loading = true;
		dash_save_error = null;
		dash_save_ok = false;
		try {
			const response = await fetch(resolve('/api/settings/dashboard'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					required_field_keys: dash_required_field_keys
				})
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			dash_save_ok = true;
			await invalidate(dashboard_attention_settings_depends_key);
		} catch (e) {
			dash_save_error = e instanceof Error ? e.message : String(e);
		} finally {
			dash_save_loading = false;
		}
	}
</script>

<svelte:head>
	<title>{m.fuzzy_dull_alpaca_achieve_settings()} | {m.clever_quiet_eagle_brand_lenslocker()}</title
	>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
		{m.fuzzy_dull_alpaca_achieve_settings()}
	</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		{m.dear_stoic_gull_note_settings_intro()}
	</p>

	{#if data.account_email}
		<div
			class="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="text-sm font-medium text-gray-900 dark:text-white">
				{m.plain_polite_penguin_heading_account()}
			</h2>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{data.account_email}</p>
			<form method="post" action="?/sign_out" class="mt-3" use:enhance>
				<button
					type="submit"
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
				>
					{m.quiet_merry_lark_sign_out()}
				</button>
			</form>
		</div>
	{/if}

	<div class="mt-8">
		<Tabs bind:selected={selected_tab} tabStyle="underline" class="flex flex-wrap">
			<TabItem key="general" title={m.fresh_noble_otter_tab_general()}>
				<div class="space-y-8 pt-4">
					<div>
						<h2 class="text-sm font-medium text-gray-900 dark:text-white">
							{m.bright_social_raven_heading_language()}
						</h2>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
							{m.soft_slow_bison_say_settings_language_blurb()}
						</p>
						<label
							for="settings-paraglide-locale"
							class="mt-3 mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.such_neat_gecko_label_display_language()}
						</label>
						<select
							id="settings-paraglide-locale"
							class={app_form_field_class_max_w_md}
							value={data.paraglide_locale}
							onchange={on_paraglide_locale_change}
						>
							{#each locales as locale (locale)}
								<option value={locale}>{paraglide_locale_label(locale)}</option>
							{/each}
						</select>
					</div>
					<div>
						<h2 class="text-sm font-medium text-gray-900 dark:text-white">
							{m.cool_wood_mammoth_heading_appearance()}
						</h2>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
							{m.long_quiet_capybara_settings_appearance_blurb()}
						</p>
						<div class="mt-4 flex flex-wrap items-center gap-3">
							<ThemeToggle />
							<button
								type="button"
								class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
								onclick={() => use_system_color_scheme()}
							>
								{m.safe_sleek_herring_use_system_appearance()}
							</button>
						</div>
					</div>
					<div>
						<h2 class="text-sm font-medium text-gray-900 dark:text-white">
							{m.wise_calm_bison_heading_time()}
						</h2>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
							{m.brief_alert_otter_blurb_time_format()}
						</p>
						<label
							for="settings-time-format"
							class="mt-3 mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.clear_solid_bison_label_time_format()}
						</label>
						<select
							id="settings-time-format"
							class={app_form_field_class_max_w_md}
							bind:value={chosen_time_format}
						>
							<option value="24h">{m.keen_tidy_wren_time_format_24h()}</option>
							<option value="12h">{m.jolly_bold_eagle_time_format_12h()}</option>
						</select>
						<div class="mt-3 flex flex-wrap items-center gap-3">
							<button
								type="button"
								class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
								disabled={display_save_loading}
								onclick={() => void save_general_display_settings()}
							>
								{display_save_loading
									? m.fierce_small_goat_busy_saving_display()
									: m.noble_still_gecko_save_display_settings()}
							</button>
							{#if display_save_ok}
								<span class="text-sm text-green-600 dark:text-green-400"
									>{m.quiet_metal_moose_note_saved_display()}</span
								>
							{/if}
						</div>
						{#if display_save_error}
							<p class="mt-2 text-sm text-red-600 dark:text-red-400">{display_save_error}</p>
						{/if}
					</div>
				</div>
			</TabItem>
			<TabItem key="upload" title={m.warm_coastal_fruit_bat_tab_upload()}>
				<div class="space-y-6 pt-4">
					<div>
						<label
							for="set-thumb-max"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.crisp_sunny_owl_label_grid_thumb_max()}
						</label>
						<input
							id="set-thumb-max"
							type="number"
							min="64"
							max="4096"
							step="1"
							class={app_form_field_class_max_w_md}
							bind:value={thumb_max_edge_px}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m.caring_suave_wallaby_adore_longest_side_of_grid_thumbnail()}.
						</p>
					</div>
					<div>
						<label
							for="set-preview-format"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.raw_ago_mare_win_preview_image_format()}
						</label>
						<select
							id="set-preview-format"
							class={app_form_field_class_max_w_md}
							bind:value={chosen_upload_preview_format}
						>
							{#each upload_preview_format_choices as choice (choice.format_value)}
								<option value={choice.format_value}>{choice.label}</option>
							{/each}
						</select>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m.blue_bold_moth_note_preview_format_sharp()}
						</p>
					</div>
					<div>
						<label
							for="set-full-max"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.wide_wide_stingray_absorb_modal_full_preview_max_edge()}
						</label>
						<input
							id="set-full-max"
							type="number"
							min="256"
							max="16384"
							step="1"
							class={app_form_field_class_max_w_md}
							bind:value={max_full_edge_px}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m.dull_solid_bream_note_modal_preview_cap()}
						</p>
					</div>
					<div>
						<label
							for="set-q-thumb"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.tiny_proud_goose_label_quality_thumb()}
						</label>
						<input
							id="set-q-thumb"
							type="number"
							min="1"
							max="100"
							step="1"
							class={app_form_field_class_max_w_md}
							bind:value={jpeg_q_thumb}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m.soft_fine_duck_note_png_quality()}
						</p>
					</div>
					<div>
						<label
							for="set-q-full"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.round_bright_linnet_label_quality_full()}
						</label>
						<input
							id="set-q-full"
							type="number"
							min="1"
							max="100"
							step="1"
							class={app_form_field_class_max_w_md}
							bind:value={jpeg_q_full}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m.soft_fine_duck_note_png_quality()}
						</p>
					</div>
					<div>
						<label
							for="set-max-mb"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{m.best_curly_crow_label_max_upload_mb()}
						</label>
						<input
							id="set-max-mb"
							type="number"
							min="1"
							max="2048"
							step="1"
							class={app_form_field_class_max_w_md}
							bind:value={max_upload_mb}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m.slow_wide_crane_note_max_upload_mb()}
						</p>
					</div>

					{#if save_error}
						<InlineNotice variant="error" density="compact" message={save_error} />
					{/if}
					{#if save_ok}
						<InlineNotice
							variant="success"
							density="compact"
							message={m.kind_green_gull_note_saved_upload_pipeline()}
						/>
					{/if}

					<button
						type="button"
						disabled={save_loading}
						class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700"
						onclick={() => void save_upload_pipeline_settings()}
					>
						{save_loading
							? m.fierce_small_goat_busy_saving_display()
							: m.zesty_fresh_ibex_save_upload_settings()}
					</button>
				</div>
			</TabItem>
			<TabItem key="dashboard" title={m.tidy_best_bumblebee_feast_dashboard()}>
				<div class="space-y-6 pt-4">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{m.grand_polite_shrew_dashboard_criteria_intro_before()}
						<strong class="lowercase">{m.topical_front_vole_shine_any()}</strong>
						{m.grand_polite_shrew_dashboard_criteria_intro_after()}
					</p>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
							onclick={() => {
								dash_required_field_keys = [...dashboard_needs_attention_default_keys];
							}}
						>
							{m.noble_quick_frog_reset_dashboard_defaults()}
						</button>
						<button
							type="button"
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
							onclick={() => {
								dash_required_field_keys = [];
							}}
						>
							{m.raw_tiny_wren_clear_all()}
						</button>
					</div>
					<div
						class="max-h-[min(28rem,55vh)] space-y-5 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700"
					>
						{#each needs_attention_catalog_grouped as [group_name, entries] (group_name)}
							<div>
								<h2
									class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
								>
									{group_name}
								</h2>
								<ul class="space-y-2">
									{#each entries as entry (entry.key)}
										<li class="flex gap-3">
											<input
												id={`dash-field-${entry.key}`}
												type="checkbox"
												class={dash_checkbox_class}
												checked={dash_field_key_checked(entry.key)}
												onchange={(e) =>
													on_dash_field_key_change(entry.key, e.currentTarget.checked)}
											/>
											<label
												for={`dash-field-${entry.key}`}
												class="min-w-0 text-sm text-gray-800 dark:text-gray-200"
											>
												<span class="font-medium text-gray-900 dark:text-white">{entry.label}</span>
												<span
													class="mt-0.5 block font-mono text-[10px] text-gray-400 dark:text-gray-500"
												>
													{entry.key}
												</span>
											</label>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>

					{#if dash_save_error}
						<InlineNotice variant="error" density="compact" message={dash_save_error} />
					{/if}
					{#if dash_save_ok}
						<InlineNotice
							variant="success"
							density="compact"
							message={m.warm_tidy_eel_note_saved_dashboard()}
						/>
					{/if}

					<button
						type="button"
						disabled={dash_save_loading}
						class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700"
						onclick={() => void save_dashboard_attention_settings()}
					>
						{dash_save_loading
							? m.fierce_small_goat_busy_saving_display()
							: m.salty_bold_snipe_save_dashboard_criteria()}
					</button>
				</div>
			</TabItem>
			<TabItem key="backup" title={m.calm_steady_elk_tab_backup()}>
				<div class="space-y-6 pt-4">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{m.level_maroon_nurse_backup_intro_a()}<strong
							>{m.level_maroon_nurse_backup_intro_sqlite()}</strong
						>{m.level_maroon_nurse_backup_intro_b()}<code
							class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>database.sqlite</code
						>{m.level_maroon_nurse_backup_intro_c()}<code
							class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800">app_setting</code
						>,
						<code class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>hardware_item</code
						>,
						<code class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800">album</code>,
						<code class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>album_raw_upload</code
						>
						{m.level_maroon_nurse_backup_intro_d()}<code
							class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>LensLocker-backup-yyyy-mm-dd-hh-mm-&lt;n&gt;.zip</code
						>{m.level_maroon_nurse_backup_intro_e()}<strong>&lt;n&gt;</strong
						>{m.level_maroon_nurse_backup_intro_f()}
					</p>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							disabled={backup_create_loading}
							class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700"
							onclick={() => void create_settings_backup_zip()}
						>
							{backup_create_loading
								? m.short_kingly_tern_busy_creating()
								: m.quiet_green_nuthatch_create_backup_zip()}
						</button>
						<FilePickerButton
							input_id="settings-backup-import-input"
							accept=".zip,.llbak,application/zip,application/octet-stream"
							busy={backup_import_loading}
							busy_label={m.bold_pretty_finch_busy_importing()}
							idle_label={m.fresh_sharp_puma_import_backup_file()}
							on_change={on_settings_backup_import_change}
							bind:input_el={backup_import_input_el}
						/>
					</div>
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<label
								for="settings-backup-export-password"
								class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								{m.brisk_round_tern_backup_export_password_label()}
							</label>
							<input
								id="settings-backup-export-password"
								type="password"
								autocomplete="new-password"
								class={app_form_field_class_max_w_md}
								bind:value={backup_export_password}
							/>
						</div>
						<div>
							<label
								for="settings-backup-import-password"
								class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								{m.green_tidy_mink_backup_import_password_label()}
							</label>
							<input
								id="settings-backup-import-password"
								type="password"
								autocomplete="new-password"
								class={app_form_field_class_max_w_md}
								bind:value={backup_import_password}
							/>
						</div>
					</div>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{m.dull_upper_eel_backup_password_optional_note()}
					</p>
					{#if backup_create_error}
						<InlineNotice variant="error" density="compact" message={backup_create_error} />
					{/if}
					{#if backup_create_ok}
						<InlineNotice
							variant="success"
							density="compact"
							message={m.swift_calm_robin_backup_created_banner()}
						/>
					{/if}
					{#if backup_import_error}
						<InlineNotice variant="error" density="compact" message={backup_import_error} />
					{/if}
					{#if backup_import_ok}
						<InlineNotice variant="success" density="compact" message={backup_import_ok} />
					{/if}
					{#if backup_delete_error}
						<InlineNotice variant="error" density="compact" message={backup_delete_error} />
					{/if}

					<div>
						<h2 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
							{m.solid_wide_marten_heading_your_backups()}
						</h2>
						{#if data.settings_backups.length === 0}
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{m.flat_slow_goat_no_backups_yet()}
							</p>
						{:else}
							<ul
								class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700"
								role="list"
							>
								{#each data.settings_backups as b (b.filename)}
									<li
										class="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-2.5 dark:bg-gray-900"
									>
										<div class="min-w-0">
											<p class="truncate font-mono text-xs text-gray-900 dark:text-gray-100">
												{b.filename}
											</p>
											<p class="text-xs text-gray-500 dark:text-gray-400">
												{format_settings_backup_when(b.created_at_ms)} · {format_settings_backup_bytes(
													b.size_bytes
												)}
											</p>
										</div>
										<div class="flex shrink-0 flex-wrap items-center gap-2">
											<a
												href={resolve(`/api/settings/backups/${b.filename}`)}
												download={b.filename}
												class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
											>
												{m.gaudy_merry_dove_download_backup()}
											</a>
											<button
												type="button"
												disabled={backup_delete_busy_filename !== null}
												class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/40"
												onclick={() => void delete_settings_backup_row(b.filename)}
											>
												{backup_delete_busy_filename === b.filename
													? m.sour_older_sparrow_busy_deleting()
													: m.fit_brief_hedgehog_pout_delete()}
											</button>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</TabItem>
		</Tabs>
	</div>
</div>
