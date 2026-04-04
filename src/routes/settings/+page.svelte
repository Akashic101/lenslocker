<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidate } from '$app/navigation';
	import { dashboard_attention_settings_depends_key } from '$lib/dashboard_attention_settings_cache';
	import { dashboard_needs_attention_default_keys } from '$lib/dashboard_attention_defaults';
	import { needs_attention_catalog } from '$lib/needs_attention_catalog';
	import { upload_preview_pipeline_defaults } from '$lib/upload_pipeline_defaults';
	import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
	import type { upload_preview_format } from '$lib/upload_preview_format';
	import { Tabs, TabItem } from 'flowbite-svelte';
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
		</Tabs>
	</div>
</div>
