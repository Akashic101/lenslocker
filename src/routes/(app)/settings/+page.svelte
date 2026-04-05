<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { dashboard_attention_settings_depends_key } from '$lib/dashboard_attention_settings_cache';
	import { settings_backup_list_depends_key } from '$lib/settings_backup_list_cache';
	import { dashboard_needs_attention_default_keys } from '$lib/dashboard_attention_defaults';
	import { needs_attention_catalog } from '$lib/needs_attention_catalog';
	import { upload_preview_pipeline_defaults } from '$lib/upload_pipeline_defaults';
	import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
	import type { upload_preview_format } from '$lib/upload_preview_format';
	import { DarkMode, Tabs, TabItem } from 'flowbite-svelte';
	import { SvelteMap } from 'svelte/reactivity';

	const upload_preview_format_choices: { format_value: upload_preview_format; label: string }[] = [
		{ format_value: 'jpeg', label: 'JPEG (default)' },
		{ format_value: 'webp', label: 'WebP' },
		{ format_value: 'avif', label: 'AVIF' },
		{ format_value: 'png', label: 'PNG' }
	];

	let { data } = $props();

	let selected_tab = $state('upload');

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

	let backup_import_input_el = $state<HTMLInputElement | null>(null);
	let backup_import_loading = $state(false);
	let backup_import_error = $state<string | null>(null);
	let backup_import_ok = $state<string | null>(null);

	let backup_delete_busy_filename = $state<string | null>(null);
	let backup_delete_error = $state<string | null>(null);

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
		dash_required_field_keys = [...data.needs_attention_settings.required_field_keys];
	});

	const needs_attention_catalog_grouped = $derived.by(() => {
		const map = new SvelteMap<string, { key: string; label: string; group: string }[]>();
		for (const entry of needs_attention_catalog) {
			const list = map.get(entry.group) ?? [];
			list.push(entry);
			map.set(entry.group, list);
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

	const field_class =
		'w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

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
		try {
			return new Intl.DateTimeFormat(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(ms));
		} catch {
			return new Date(ms).toISOString();
		}
	}

	async function create_settings_backup_zip(): Promise<void> {
		backup_create_loading = true;
		backup_create_error = null;
		backup_create_ok = false;
		try {
			const response = await fetch(resolve('/api/settings/backups'), { method: 'POST' });
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
		if (
			!confirm(
				'Restore from this backup? New zips replace the entire SQLite database file (gallery metadata, settings, hardware, auth, etc.). Image files on disk are not inside the zip. Older zips without database.sqlite only replace settings and hardware rows. This cannot be undone.'
			)
		) {
			reset_settings_backup_import_input();
			return;
		}
		backup_import_loading = true;
		backup_import_error = null;
		backup_import_ok = null;
		try {
			const form = new FormData();
			form.append('file', file);
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
				date_stamp?: string;
				restored_full_database?: boolean;
			};
			const ac = parsed.app_settings_count ?? 0;
			const hc = parsed.hardware_items_count ?? 0;
			const stamp =
				typeof parsed.date_stamp === 'string' && parsed.date_stamp !== ''
					? ` (backup stamp ${parsed.date_stamp})`
					: '';
			const full = parsed.restored_full_database === true;
			backup_import_ok = full
				? `Restored full database from zip${stamp}. Reload or navigate to refresh all data.`
				: `Imported ${ac} setting row(s) and ${hc} hardware item(s)${stamp}.`;
			if (full) {
				await invalidateAll();
			} else {
				await invalidate(upload_pipeline_settings_depends_key);
				await invalidate(dashboard_attention_settings_depends_key);
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
		if (!confirm(`Delete backup "${filename}" from this server? This cannot be undone.`)) {
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
	<title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		Adjust behavior for uploads and previews. Changes apply to new uploads; existing previews are
		not regenerated automatically. The gallery resolves modal images by format when you change this
		setting.
	</p>

	<div
		class="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
	>
		<h2 class="text-sm font-medium text-gray-900 dark:text-white">Appearance</h2>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
			Choose light or dark mode for the dashboard.
		</p>
		<div class="mt-4">
			<DarkMode />
		</div>
	</div>

	{#if data.account_email}
		<div
			class="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="text-sm font-medium text-gray-900 dark:text-white">Account</h2>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{data.account_email}</p>
			<form method="post" action="?/sign_out" class="mt-3" use:enhance>
				<button
					type="submit"
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
				>
					Sign out
				</button>
			</form>
		</div>
	{/if}

	<div class="mt-8">
		<Tabs bind:selected={selected_tab} tabStyle="underline" class="flex flex-wrap">
			<TabItem key="upload" title="Upload">
				<div class="space-y-6 pt-4">
					<div>
						<label
							for="set-thumb-max"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Grid thumbnail max edge (px)
						</label>
						<input
							id="set-thumb-max"
							type="number"
							min="64"
							max="4096"
							step="1"
							class={field_class}
							bind:value={thumb_max_edge_px}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Longest side of the grid thumbnail (64–4096).
						</p>
					</div>
					<div>
						<label
							for="set-preview-format"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Preview image format
						</label>
						<select
							id="set-preview-format"
							class={field_class}
							bind:value={chosen_upload_preview_format}
						>
							{#each upload_preview_format_choices as choice (choice.format_value)}
								<option value={choice.format_value}>{choice.label}</option>
							{/each}
						</select>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Grid and lightbox previews use Sharp (JPEG, WebP, AVIF, or PNG). JPEG remains the
							default; AVIF/WebP need a Sharp build with those encoders.
						</p>
					</div>
					<div>
						<label
							for="set-full-max"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Modal / full preview max edge (px)
						</label>
						<input
							id="set-full-max"
							type="number"
							min="256"
							max="16384"
							step="1"
							class={field_class}
							bind:value={max_full_edge_px}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Cap for the large preview in the lightbox and for intermediate RAW decode (256–16384).
							Higher values use more RAM and disk.
						</p>
					</div>
					<div>
						<label
							for="set-q-thumb"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Quality — grid thumbnail (1–100; lossy formats)
						</label>
						<input
							id="set-q-thumb"
							type="number"
							min="1"
							max="100"
							step="1"
							class={field_class}
							bind:value={jpeg_q_thumb}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							For PNG, a higher number means less compression (larger files).
						</p>
					</div>
					<div>
						<label
							for="set-q-full"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Quality — full preview (1–100; lossy formats)
						</label>
						<input
							id="set-q-full"
							type="number"
							min="1"
							max="100"
							step="1"
							class={field_class}
							bind:value={jpeg_q_full}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							For PNG, a higher number means less compression (larger files).
						</p>
					</div>
					<div>
						<label
							for="set-max-mb"
							class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Max upload size (MB)
						</label>
						<input
							id="set-max-mb"
							type="number"
							min="1"
							max="2048"
							step="1"
							class={field_class}
							bind:value={max_upload_mb}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Per-file limit enforced on the server (1–2048 MB).
						</p>
					</div>

					{#if save_error}
						<p
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
							role="alert"
						>
							{save_error}
						</p>
					{/if}
					{#if save_ok}
						<p
							class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
							role="status"
						>
							Saved. New uploads will use these values.
						</p>
					{/if}

					<button
						type="button"
						disabled={save_loading}
						class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700"
						onclick={() => void save_upload_pipeline_settings()}
					>
						{save_loading ? 'Saving…' : 'Save upload settings'}
					</button>
				</div>
			</TabItem>
			<TabItem key="dashboard" title="Dashboard">
				<div class="space-y-6 pt-4">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Select any metadata fields or shortcuts. A photo appears under Needs attention if it
						fails <strong>any</strong> selected rule. All rules are equal — there is no priority order.
					</p>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
							onclick={() => {
								dash_required_field_keys = [...dashboard_needs_attention_default_keys];
							}}
						>
							Reset to defaults
						</button>
						<button
							type="button"
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
							onclick={() => {
								dash_required_field_keys = [];
							}}
						>
							Clear all
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
						<p
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
							role="alert"
						>
							{dash_save_error}
						</p>
					{/if}
					{#if dash_save_ok}
						<p
							class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
							role="status"
						>
							Saved. The Needs attention view updates when you open the Dashboard.
						</p>
					{/if}

					<button
						type="button"
						disabled={dash_save_loading}
						class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700"
						onclick={() => void save_dashboard_attention_settings()}
					>
						{dash_save_loading ? 'Saving…' : 'Save dashboard criteria'}
					</button>
				</div>
			</TabItem>
			<TabItem key="backup" title="Backup">
				<div class="space-y-6 pt-4">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Each zip includes a full
						<strong>SQLite database</strong> snapshot (<code
							class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>database.sqlite</code
						>) plus JSON copies of
						<code class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>app_setting</code
						>
						and hardware for readability. Backups are named
						<code class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800"
							>LensLocker-backup-yyyy-mm-dd-hh-mm-&lt;n&gt;.zip</code
						>
						where <strong>&lt;n&gt;</strong> is a running count. Importing restores the whole database
						file (gallery and upload records, settings, hardware, auth, etc.); originals and previews
						on disk are not in the zip.
					</p>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							disabled={backup_create_loading}
							class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700"
							onclick={() => void create_settings_backup_zip()}
						>
							{backup_create_loading ? 'Creating…' : 'Create backup zip'}
						</button>
						<div class="relative">
							<input
								id="settings-backup-import-input"
								bind:this={backup_import_input_el}
								type="file"
								accept=".zip,application/zip"
								disabled={backup_import_loading}
								class="peer sr-only"
								onchange={on_settings_backup_import_change}
							/>
							<label
								for="settings-backup-import-input"
								class="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
							>
								{backup_import_loading ? 'Importing…' : 'Import backup zip…'}
							</label>
						</div>
					</div>
					{#if backup_create_error}
						<p
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
							role="alert"
						>
							{backup_create_error}
						</p>
					{/if}
					{#if backup_create_ok}
						<p
							class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
							role="status"
						>
							Backup created. It appears in the list below — use Download to save a copy locally.
						</p>
					{/if}
					{#if backup_import_error}
						<p
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
							role="alert"
						>
							{backup_import_error}
						</p>
					{/if}
					{#if backup_import_ok}
						<p
							class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
							role="status"
						>
							{backup_import_ok}
						</p>
					{/if}
					{#if backup_delete_error}
						<p
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
							role="alert"
						>
							{backup_delete_error}
						</p>
					{/if}

					<div>
						<h2 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Your backups</h2>
						{#if data.settings_backups.length === 0}
							<p class="text-sm text-gray-500 dark:text-gray-400">No backups yet.</p>
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
												Download
											</a>
											<button
												type="button"
												disabled={backup_delete_busy_filename !== null}
												class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/40"
												onclick={() => void delete_settings_backup_row(b.filename)}
											>
												{backup_delete_busy_filename === b.filename ? 'Deleting…' : 'Delete'}
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
