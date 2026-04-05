<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { beforeNavigate, invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/cache/transformed_media_cache';
	import {
		raw_upload_extensions,
		is_allowed_raw_upload_extension
	} from '$lib/gallery/raw_upload_extensions';
	import type { raw_upload_batch_log_line } from '$lib/gallery/raw_upload_batch_types';
	import InlineNotice from '$lib/components/inline_notice.svelte';
	import RawUploadBatchProgressPanel from '$lib/components/raw_upload_batch_progress_panel.svelte';
	import { m } from '$lib/paraglide/messages.js';

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
	let batch_log_lines = $state<raw_upload_batch_log_line[]>([]);
	let batch_last_error = $state<string | null>(null);

	let batch_log_list_el: HTMLUListElement | undefined = $state();

	$effect(() => {
		void batch_log_lines;
		if (batch_log_list_el == null || batch_log_lines.length === 0) return;
		void tick().then(() => {
			const el = batch_log_list_el;
			if (el != null) {
				el.scrollTop = el.scrollHeight;
			}
		});
	});

	beforeNavigate(({ cancel }) => {
		if (!batch_busy) return;
		if (!confirm(m.quiet_stale_gecko_warn_leave_during_upload())) cancel();
	});

	$effect(() => {
		if (!browser || !batch_busy) return;
		const on_beforeunload = (ev: BeforeUnloadEvent) => {
			ev.preventDefault();
			ev.returnValue = '';
		};
		window.addEventListener('beforeunload', on_beforeunload);
		return () => window.removeEventListener('beforeunload', on_beforeunload);
	});

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
		if (!batch_busy && batch_total > 0) return m.plain_antsy_sloth_rest_batch_finished();
		if (batch_phase === 'uploading') {
			return m.quick_noble_heron_push_status_uploading({
				current_name: batch_current_name,
				current_index: String(batch_current_index),
				total: String(batch_total),
				pct: String(batch_upload_pct)
			});
		}
		if (batch_phase === 'processing') {
			return m.lazy_fuzzy_badger_work_status_processing({
				current_name: batch_current_name,
				current_index: String(batch_current_index),
				total: String(batch_total)
			});
		}
		return m.small_proud_robin_wait_preparing();
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
					body = { message: xhr.responseText || m.cozy_livid_lark_note_invalid_response() };
				}
				resolve({ ok: xhr.status >= 200 && xhr.status < 300, body, status: xhr.status });
			};
			xhr.onerror = () => reject(new Error(m.large_proud_gull_fail_network_error()));
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
			batch_last_error = m.petty_alert_moth_urge_choose_raw_files();
			return;
		}

		const files = [...input.files];

		const valid_files: File[] = [];
		const invalid_lines: raw_upload_batch_log_line[] = [];

		for (const file of files) {
			if (file.size === 0) {
				invalid_lines.push({
					name: file.name,
					ok: false,
					message: m.drab_minor_crow_spot_empty_file()
				});
				continue;
			}
			if (file.size > data.upload_pipeline_settings.max_upload_bytes) {
				const mb = Math.round(data.upload_pipeline_settings.max_upload_bytes / (1024 * 1024));
				invalid_lines.push({
					name: file.name,
					ok: false,
					message: m.acidic_royal_moose_cap_too_large_mb({ mb: String(mb) })
				});
				continue;
			}
			if (!is_allowed_raw_upload_extension(file.name)) {
				invalid_lines.push({
					name: file.name,
					ok: false,
					message: m.flat_sleek_owl_deny_unsupported_extension()
				});
				continue;
			}
			valid_files.push(file);
		}

		batch_log_lines = invalid_lines;

		if (valid_files.length === 0) {
			batch_last_error = m.good_cuddly_badger_mend_no_valid_upload_files();
			batch_total = 0;
			batch_done = 0;
			return;
		}

		batch_busy = true;
		batch_done = 0;
		batch_total = valid_files.length;
		batch_phase = 'idle';
		batch_upload_pct = 0;
		let batch_had_new_upload = false;

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
					const is_duplicate = body.duplicate === true;
					const preview_ok = body.preview_ok !== false;
					batch_log_lines = [
						...batch_log_lines,
						{
							name: file.name,
							ok: true,
							message: is_duplicate
								? m.soft_quiet_snail_mark_already_in_library()
								: preview_ok
									? undefined
									: String(body.preview_message ?? m.blue_still_finch_fail_jpeg_preview())
						}
					];
					if (!is_duplicate) {
						batch_had_new_upload = true;
						void invalidate(transformed_media_depends_key);
						void invalidate(gallery_active_upload_count_depends_key);
					}
				} else {
					const msg =
						typeof body.message === 'string'
							? body.message
							: m.icy_mellow_carp_fail_request_status({ status: String(status) });
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
		if (batch_had_new_upload) {
			await invalidate(transformed_media_depends_key);
			await invalidate(gallery_active_upload_count_depends_key);
		}
	}
</script>

<svelte:head>
	<title>{m.true_zippy_finch_title_upload_raw()}</title>
</svelte:head>

<div class="mx-auto max-w-xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
		{m.true_zippy_finch_title_upload_raw()}
	</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		{m.vivid_merry_quail_say_upload_raw_intro()}
	</p>

	{#if data.just_uploaded}
		<InlineNotice
			class="mt-4"
			variant="success"
			message={m.warm_civil_bison_note_upload_saved_banner()}
		/>
	{/if}

	{#if batch_last_error}
		<InlineNotice class="mt-4" variant="error" message={batch_last_error} />
	{/if}

	<form class="mt-6 space-y-4" onsubmit={(e) => void start_batch_upload(e)}>
		<div>
			<label for="raw_files" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
				{m.dear_sunny_crow_tag_files_label()}
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

		<RawUploadBatchProgressPanel
			visible={batch_busy || batch_total > 0 || batch_log_lines.length > 0}
			{overall_batch_percent}
			{batch_status_text}
			{batch_log_lines}
			bind:log_list_el={batch_log_list_el}
		/>

		<button
			type="submit"
			disabled={batch_busy}
			class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
		>
			{batch_busy
				? m.next_merry_falcon_busy_uploading_ellipsis()
				: m.quaint_grand_snail_amaze_upload()}
		</button>
	</form>
</div>
