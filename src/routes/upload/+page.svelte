<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidate } from '$app/navigation';
	import { gallery_active_upload_count_depends_key } from '$lib/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/transformed_media_cache';
	import {
		raw_upload_extensions,
		is_allowed_raw_upload_extension
	} from '$lib/raw_upload_extensions';
	import { max_raw_upload_bytes } from '$lib/raw_upload_limits';

	let { data } = $props();

	const file_accept = [...raw_upload_extensions].join(',');
	const upload_api_url = resolve('/api/upload/raw');

	let file_input_el: HTMLInputElement | undefined = $state();

	let batch_busy = $state(false);
	let batch_done = $state(0);
	let batch_total = $state(0);
	let batch_current_name = $state('');
	let batch_current_index = $state(0);
	type batch_phase = 'idle' | 'uploading' | 'processing';
	let batch_phase = $state<batch_phase>('idle');
	let batch_upload_pct = $state(0);
	type batch_line = { name: string; ok: boolean; message?: string };
	let batch_log_lines = $state<batch_line[]>([]);
	let batch_last_error = $state<string | null>(null);

	const overall_batch_percent = $derived.by(() => {
		if (batch_total <= 0) return 0;
		const slice = 100 / batch_total;
		let sub = 0;
		if (batch_phase === 'uploading') {
			sub = 0.45 * (batch_upload_pct / 100);
		} else if (batch_phase === 'processing') {
			sub = 0.45 + 0.5;
		}
		return Math.min(100, slice * batch_done + slice * sub);
	});

	const batch_status_text = $derived.by(() => {
		if (!batch_busy && batch_total === 0) return '';
		if (!batch_busy && batch_total > 0) return 'Batch finished.';
		if (batch_phase === 'uploading') {
			return `Uploading ${batch_current_name} (${batch_current_index} of ${batch_total}) — ${batch_upload_pct}%`;
		}
		if (batch_phase === 'processing') {
			return `Processing ${batch_current_name} (${batch_current_index} of ${batch_total}) — metadata & JPEG previews`;
		}
		return `Preparing…`;
	});

	function post_raw_file_xhr(
		file: File,
		on_progress: (loaded: number, total: number) => void,
		on_upload_finished: () => void
	): Promise<{ ok: boolean; body: Record<string, unknown>; status: number }> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', upload_api_url);
			xhr.responseType = 'text';
			xhr.upload.addEventListener('progress', (e) => {
				if (e.lengthComputable) on_progress(e.loaded, e.total);
			});
			xhr.upload.addEventListener('loadend', () => {
				if (xhr.readyState !== XMLHttpRequest.DONE) {
					on_upload_finished();
				}
			});
			xhr.onload = () => {
				let body: Record<string, unknown>;
				try {
					body = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
				} catch {
					body = { message: xhr.responseText || 'Invalid response' };
				}
				resolve({ ok: xhr.status >= 200 && xhr.status < 300, body, status: xhr.status });
			};
			xhr.onerror = () => reject(new Error('Network error'));
			const fd = new FormData();
			fd.append('raw_file', file);
			xhr.send(fd);
		});
	}

	async function start_batch_upload(ev: SubmitEvent): Promise<void> {
		ev.preventDefault();
		batch_last_error = null;
		const input = file_input_el;
		if (input == null || input.files == null || input.files.length === 0) {
			batch_last_error = 'Choose one or more RAW or image files.';
			return;
		}

		const files = [...input.files];

		const valid_files: File[] = [];
		const invalid_lines: batch_line[] = [];

		for (const file of files) {
			if (file.size === 0) {
				invalid_lines.push({ name: file.name, ok: false, message: 'Empty file' });
				continue;
			}
			if (file.size > max_raw_upload_bytes) {
				invalid_lines.push({ name: file.name, ok: false, message: 'Too large (max 512 MB)' });
				continue;
			}
			if (!is_allowed_raw_upload_extension(file.name)) {
				invalid_lines.push({ name: file.name, ok: false, message: 'Unsupported extension' });
				continue;
			}
			valid_files.push(file);
		}

		batch_log_lines = invalid_lines;

		if (valid_files.length === 0) {
			batch_last_error = 'No valid files to upload.';
			batch_total = 0;
			batch_done = 0;
			return;
		}

		batch_busy = true;
		batch_done = 0;
		batch_total = valid_files.length;
		batch_phase = 'idle';
		batch_upload_pct = 0;

		for (let i = 0; i < valid_files.length; i++) {
			const file = valid_files[i];
			batch_current_index = i + 1;
			batch_current_name = file.name;
			batch_phase = 'uploading';
			batch_upload_pct = 0;

			try {
				const { ok, body, status } = await post_raw_file_xhr(
					file,
					(loaded, total) => {
						batch_upload_pct = total > 0 ? Math.round((100 * loaded) / total) : 0;
					},
					() => {
						batch_phase = 'processing';
					}
				);

				if (ok && body.ok === true) {
					const preview_ok = body.preview_ok !== false;
					batch_log_lines = [
						...batch_log_lines,
						{
							name: file.name,
							ok: true,
							message: preview_ok
								? undefined
								: String(body.preview_message ?? 'JPEG preview could not be created')
						}
					];
				} else {
					const msg =
						typeof body.message === 'string' ? body.message : `Request failed (${status})`;
					batch_log_lines = [...batch_log_lines, { name: file.name, ok: false, message: msg }];
				}
			} catch (e) {
				batch_log_lines = [
					...batch_log_lines,
					{
						name: file.name,
						ok: false,
						message: e instanceof Error ? e.message : String(e)
					}
				];
			}

			batch_done += 1;
		}

		batch_phase = 'idle';
		batch_current_name = '';
		batch_busy = false;
		batch_upload_pct = 0;
		await invalidate(transformed_media_depends_key);
		await invalidate(gallery_active_upload_count_depends_key);
	}
</script>

<svelte:head>
	<title>Upload RAW</title>
</svelte:head>

<div class="mx-auto max-w-xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Upload RAW</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		Select one or more files — each is uploaded in turn with a progress bar. Original files are
		stored under
		<code class="text-xs">RAW_UPLOAD_ROOT</code> (default
		<code class="text-xs">data/uploads/raw</code>). Metadata is parsed with exifr and saved to
		SQLite. Two JPEG previews — a grid thumbnail (~480px) and a larger modal image (up to ~4096px) —
		are written under your transformed media root (
		<code class="text-xs">TRANSFORMED_MEDIA_ROOT</code> or
		<code class="text-xs">static/transformed</code>) in
		<code class="text-xs">upload-previews/</code> and appear on the home page grid (newest first).
	</p>

	{#if data.just_uploaded}
		<p
			class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
			role="status"
		>
			Upload saved successfully. Open the home page to see the JPEG preview if conversion succeeded.
		</p>
	{/if}

	{#if batch_last_error}
		<p
			class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
			role="alert"
		>
			{batch_last_error}
		</p>
	{/if}

	<form class="mt-6 space-y-4" onsubmit={(e) => void start_batch_upload(e)}>
		<div>
			<label for="raw_files" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
				Files
			</label>
			<input
				bind:this={file_input_el}
				id="raw_files"
				name="raw_files"
				type="file"
				multiple
				accept={file_accept}
				disabled={batch_busy}
				class="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
			/>
		</div>

		{#if batch_busy || batch_total > 0 || batch_log_lines.length > 0}
			<div
				class="space-y-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
			>
				<div
					class="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400"
				>
					<span>Overall progress</span>
					<span class="font-mono tabular-nums">{Math.round(overall_batch_percent)}%</span>
				</div>
				<progress
					class="h-2.5 w-full overflow-hidden rounded-full accent-primary-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-200 dark:[&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary-600"
					max={100}
					value={overall_batch_percent}
				></progress>
				<p
					class="min-h-[2.5rem] text-sm text-gray-800 dark:text-gray-200"
					role="status"
					aria-live="polite"
				>
					{batch_status_text}
				</p>
				{#if batch_log_lines.length > 0}
					<ul class="max-h-40 space-y-1 overflow-y-auto text-xs text-gray-700 dark:text-gray-300">
						{#each batch_log_lines as line, line_i (line_i)}
							<li
								class="flex flex-wrap gap-x-2 border-t border-gray-100 pt-1 first:border-0 first:pt-0 dark:border-gray-700"
							>
								<span class="font-medium wrap-break-word">{line.name}</span>
								{#if line.ok}
									<span class="text-green-700 dark:text-green-400">Saved</span>
									{#if line.message}
										<span class="text-amber-700 dark:text-amber-400">({line.message})</span>
									{/if}
								{:else}
									<span class="text-red-700 dark:text-red-400">{line.message ?? 'Failed'}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<button
			type="submit"
			disabled={batch_busy}
			class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
		>
			{batch_busy ? 'Uploading…' : 'Upload'}
		</button>
	</form>
</div>
