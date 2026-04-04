<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidate } from '$app/navigation';
	import { upload_preview_pipeline_defaults } from '$lib/upload_pipeline_defaults';
	import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
	import type { upload_preview_format } from '$lib/upload_preview_format';
	import { Tabs, TabItem } from 'flowbite-svelte';

	const upload_preview_format_choices: { format_value: upload_preview_format; label: string }[] = [
		{ format_value: 'jpeg', label: 'JPEG (default)' },
		{ format_value: 'webp', label: 'WebP' },
		{ format_value: 'avif', label: 'AVIF' },
		{ format_value: 'png', label: 'PNG' }
	];

	let { data } = $props();

	let selected_tab = $state('uploads');

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

	$effect(() => {
		const s = data.upload_pipeline_settings;
		thumb_max_edge_px = s.thumb_max_edge_px;
		max_full_edge_px = s.max_full_edge_px;
		jpeg_q_thumb = s.jpeg_q_thumb;
		jpeg_q_full = s.jpeg_q_full;
		max_upload_mb = Math.round(s.max_upload_bytes / (1024 * 1024));
		chosen_upload_preview_format = s.upload_preview_format;
	});

	const field_class =
		'w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

	async function save_upload_pipeline_settings(): Promise<void> {
		save_loading = true;
		save_error = null;
		save_ok = false;
		try {
			const max_upload_bytes = Math.round(max_upload_mb) * 1024 * 1024;
			const response = await fetch(resolve('/api/settings/uploads'), {
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
			<TabItem key="uploads" title="Uploads">
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
		</Tabs>
	</div>
</div>
