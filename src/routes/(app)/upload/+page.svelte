<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
	import { transformed_media_depends_key } from '$lib/cache/transformed_media_cache';
	import {
		raw_upload_extensions,
		is_allowed_raw_upload_extension
	} from '$lib/gallery/raw_upload_extensions';
	import type { raw_upload_batch_log_line } from '$lib/gallery/raw_upload_batch_types';
	import {
		begin_raw_upload_batch,
		end_raw_upload_batch_cancelled,
		end_raw_upload_batch_success,
		patch_raw_upload_batch_fields,
		raw_upload_batch_activity,
		request_cancel_raw_upload_batch,
		set_active_raw_upload_xhr,
		set_disk_import_abort_controller
	} from '$lib/gallery/raw_upload_batch_activity.svelte';
	import InlineNotice from '$lib/components/inline_notice.svelte';
	import RawUploadBatchProgressPanel from '$lib/components/raw_upload_batch_progress_panel.svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		estimate_upload_remaining_seconds,
		format_upload_eta_duration
	} from '$lib/gallery/upload_eta';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	const file_accept = [...raw_upload_extensions].join(',');
	const upload_api_url = resolve('/api/upload/raw');
	const disk_import_api_url = resolve('/api/upload/raw/import-disk');

	let file_input_el: HTMLInputElement | undefined = $state();

	let batch_last_error = $state<string | null>(null);

	let batch_log_list_el: HTMLUListElement | undefined = $state();

	/** Re-tick once per second while uploading so the ETA line updates. */
	let upload_eta_clock = $state(0);

	$effect(() => {
		if (!browser || !raw_upload_batch_activity.in_progress) return;
		const id = window.setInterval(() => {
			upload_eta_clock += 1;
		}, 1000);
		return () => window.clearInterval(id);
	});

	$effect(() => {
		void raw_upload_batch_activity.log_lines;
		if (batch_log_list_el == null || raw_upload_batch_activity.log_lines.length === 0) return;
		void tick().then(() => {
			const el = batch_log_list_el;
			if (el != null) {
				el.scrollTop = el.scrollHeight;
			}
		});
	});

	$effect(() => {
		if (!browser || !raw_upload_batch_activity.in_progress) return;
		const on_beforeunload = (ev: BeforeUnloadEvent) => {
			ev.preventDefault();
			ev.returnValue = '';
		};
		window.addEventListener('beforeunload', on_beforeunload);
		return () => window.removeEventListener('beforeunload', on_beforeunload);
	});

	const overall_batch_percent = $derived(raw_upload_batch_activity.overall_percent);

	const upload_eta_line = $derived.by((): string | null => {
		void upload_eta_clock;
		const a = raw_upload_batch_activity;
		if (!a.in_progress || a.started_at_ms == null) return null;
		const elapsed_ms = Date.now() - a.started_at_ms;
		const rem_sec = estimate_upload_remaining_seconds(elapsed_ms, a.overall_percent);
		if (rem_sec == null) return null;
		const time = format_upload_eta_duration(rem_sec, getLocale());
		return m.bold_calm_newt_upload_eta_about({ time });
	});

	const batch_status_text = $derived.by(() => {
		const a = raw_upload_batch_activity;
		if (a.in_progress) {
			if (a.phase === 'uploading') {
				return m.quick_noble_heron_push_status_uploading({
					current_name: a.current_name,
					current_index: String(a.current_index),
					total: String(a.total),
					pct: String(a.part_upload_pct)
				});
			}
			if (a.phase === 'processing') {
				return m.lazy_fuzzy_badger_work_status_processing({
					current_name: a.current_name,
					current_index: String(a.current_index),
					total: String(a.total)
				});
			}
			return m.small_proud_robin_wait_preparing();
		}
		if (a.session_finished && !a.session_cancelled) {
			return m.plain_antsy_sloth_rest_batch_finished();
		}
		if (a.session_cancelled) {
			return m.cool_quiet_finch_upload_cancelled();
		}
		return '';
	});

	function post_raw_file_xhr(
		file: File,
		on_progress: (loaded: number, total: number) => void,
		on_upload_finished: () => void
	): Promise<{ ok: boolean; body: Record<string, unknown>; status: number }> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			set_active_raw_upload_xhr(xhr);
			xhr.open('POST', upload_api_url);
			xhr.responseType = 'text';
			xhr.upload.addEventListener('progress', (e) => {
				if (raw_upload_batch_activity.cancel_requested) return;
				if (e.lengthComputable) on_progress(e.loaded, e.total);
			});
			xhr.upload.addEventListener('loadend', () => {
				if (xhr.readyState !== XMLHttpRequest.DONE) {
					on_upload_finished();
				}
			});
			xhr.onload = () => {
				set_active_raw_upload_xhr(null);
				let body: Record<string, unknown>;
				try {
					body = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
				} catch {
					body = { message: xhr.responseText || m.cozy_livid_lark_note_invalid_response() };
				}
				resolve({ ok: xhr.status >= 200 && xhr.status < 300, body, status: xhr.status });
			};
			xhr.onerror = () => {
				set_active_raw_upload_xhr(null);
				reject(new Error(m.large_proud_gull_fail_network_error()));
			};
			xhr.onabort = () => {
				set_active_raw_upload_xhr(null);
				reject(new DOMException('Aborted', 'AbortError'));
			};
			const fd = new FormData();
			fd.append('raw_file', file);
			xhr.send(fd);
		});
	}

	async function start_batch_upload(ev: SubmitEvent): Promise<void> {
		ev.preventDefault();
		batch_last_error = null;
		if (raw_upload_batch_activity.in_progress) {
			batch_last_error = m.muddy_warm_otter_upload_batch_still_running();
			return;
		}

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

		if (valid_files.length === 0) {
			batch_last_error = m.good_cuddly_badger_mend_no_valid_upload_files();
			return;
		}

		begin_raw_upload_batch(invalid_lines, valid_files.length);
		let batch_had_new_upload = false;

		for (let i = 0; i < valid_files.length; i++) {
			if (raw_upload_batch_activity.cancel_requested) {
				end_raw_upload_batch_cancelled();
				return;
			}

			const file = valid_files[i];
			patch_raw_upload_batch_fields({
				current_index: i + 1,
				current_name: file.name,
				phase: 'uploading',
				part_upload_pct: 0
			});

			try {
				const { ok, body, status } = await post_raw_file_xhr(
					file,
					(loaded, total) => {
						patch_raw_upload_batch_fields({
							part_upload_pct: total > 0 ? Math.round((100 * loaded) / total) : 0
						});
					},
					() => {
						patch_raw_upload_batch_fields({ phase: 'processing' });
					}
				);

				if (ok && body.ok === true) {
					const is_duplicate = body.duplicate === true;
					const preview_ok = body.preview_ok !== false;
					const next_lines = [
						...raw_upload_batch_activity.log_lines,
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
					patch_raw_upload_batch_fields({ log_lines: next_lines });
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
					patch_raw_upload_batch_fields({
						log_lines: [
							...raw_upload_batch_activity.log_lines,
							{ name: file.name, ok: false, message: msg }
						]
					});
				}
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') {
					end_raw_upload_batch_cancelled();
					return;
				}
				patch_raw_upload_batch_fields({
					log_lines: [
						...raw_upload_batch_activity.log_lines,
						{
							name: file.name,
							ok: false,
							message: e instanceof Error ? e.message : String(e)
						}
					]
				});
			}

			patch_raw_upload_batch_fields({ done: i + 1 });
		}

		end_raw_upload_batch_success();
		if (batch_had_new_upload) {
			await invalidate(transformed_media_depends_key);
			await invalidate(gallery_active_upload_count_depends_key);
		}
	}

	function on_cancel_upload_click(): void {
		request_cancel_raw_upload_batch();
	}

	const progress_panel_visible = $derived(
		raw_upload_batch_activity.in_progress ||
			raw_upload_batch_activity.session_finished ||
			raw_upload_batch_activity.log_lines.length > 0
	);

	const form_locked = $derived(raw_upload_batch_activity.in_progress);

	async function start_disk_import(): Promise<void> {
		batch_last_error = null;
		if (raw_upload_batch_activity.in_progress) {
			batch_last_error = m.muddy_warm_otter_upload_batch_still_running();
			return;
		}

		let paths: string[];
		try {
			const list_response = await fetch(disk_import_api_url);
			const list_json = (await list_response.json().catch(() => ({}))) as {
				ok?: unknown;
				paths?: unknown;
			};
			if (
				!list_response.ok ||
				list_json.ok !== true ||
				!Array.isArray(list_json.paths) ||
				!list_json.paths.every((p) => typeof p === 'string')
			) {
				batch_last_error = m.sour_merry_fly_disk_import_list_failed();
				return;
			}
			paths = list_json.paths as string[];
		} catch {
			batch_last_error = m.large_proud_gull_fail_network_error();
			return;
		}

		if (paths.length === 0) {
			batch_last_error = m.mild_suave_gecko_disk_import_none();
			return;
		}

		begin_raw_upload_batch([], paths.length);
		let batch_had_new_upload = false;

		for (let i = 0; i < paths.length; i++) {
			if (raw_upload_batch_activity.cancel_requested) {
				end_raw_upload_batch_cancelled();
				return;
			}

			const relative_path = paths[i];
			patch_raw_upload_batch_fields({
				current_index: i + 1,
				current_name: relative_path,
				phase: 'processing',
				part_upload_pct: 0
			});

			const abort_controller = new AbortController();
			set_disk_import_abort_controller(abort_controller);

			try {
				const import_response = await fetch(disk_import_api_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ relative_path }),
					signal: abort_controller.signal
				});
				const import_json = (await import_response.json().catch(() => ({}))) as Record<
					string,
					unknown
				>;

				if (import_response.ok && import_json.ok === true) {
					const is_duplicate = import_json.duplicate === true;
					const preview_ok = import_json.preview_ok !== false;
					const next_lines = [
						...raw_upload_batch_activity.log_lines,
						{
							name: relative_path,
							ok: true,
							message: is_duplicate
								? m.soft_quiet_snail_mark_already_in_library()
								: preview_ok
									? undefined
									: String(import_json.preview_message ?? m.blue_still_finch_fail_jpeg_preview())
						}
					];
					patch_raw_upload_batch_fields({ log_lines: next_lines });
					if (!is_duplicate) {
						batch_had_new_upload = true;
						void invalidate(transformed_media_depends_key);
						void invalidate(gallery_active_upload_count_depends_key);
					}
				} else {
					const msg =
						typeof import_json.message === 'string'
							? import_json.message
							: m.icy_mellow_carp_fail_request_status({ status: String(import_response.status) });
					patch_raw_upload_batch_fields({
						log_lines: [
							...raw_upload_batch_activity.log_lines,
							{ name: relative_path, ok: false, message: msg }
						]
					});
				}
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') {
					end_raw_upload_batch_cancelled();
					return;
				}
				patch_raw_upload_batch_fields({
					log_lines: [
						...raw_upload_batch_activity.log_lines,
						{
							name: relative_path,
							ok: false,
							message: e instanceof Error ? e.message : String(e)
						}
					]
				});
			} finally {
				set_disk_import_abort_controller(null);
			}

			patch_raw_upload_batch_fields({ done: i + 1 });
		}

		end_raw_upload_batch_success();
		if (batch_had_new_upload) {
			await invalidate(transformed_media_depends_key);
			await invalidate(gallery_active_upload_count_depends_key);
		}
	}
</script>

<svelte:head>
	<title>{m.true_zippy_finch_title_upload_raw()} | {m.clever_quiet_eagle_brand_lenslocker()}</title>
</svelte:head>

<div class="mx-auto max-w-xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
		{m.true_zippy_finch_title_upload_raw()}
	</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		{m.vivid_merry_quail_say_upload_raw_intro()}
	</p>

	<div
		class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50"
	>
		<p class="text-sm text-gray-700 dark:text-gray-300">
			{m.plain_bright_shark_disk_import_help()}
		</p>
		<button
			type="button"
			disabled={form_locked}
			onclick={() => void start_disk_import()}
			class="mt-3 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-700"
		>
			{m.swift_neat_loris_disk_import_button()}
		</button>
	</div>

	{#if data.just_uploaded}
		<InlineNotice
			class="mt-4"
			variant="success"
			message={m.warm_civil_bison_note_upload_saved_banner()}
		/>
	{/if}

	{#if raw_upload_batch_activity.in_progress}
		<InlineNotice
			class="mt-4"
			variant="info"
			message={m.muddy_warm_otter_upload_batch_still_running()}
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
				disabled={form_locked}
				class="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
			/>
		</div>

		<RawUploadBatchProgressPanel
			visible={progress_panel_visible}
			{overall_batch_percent}
			{batch_status_text}
			eta_line={upload_eta_line}
			batch_log_lines={raw_upload_batch_activity.log_lines}
			show_cancel={raw_upload_batch_activity.in_progress}
			label_cancel={m.petty_bright_lark_upload_cancel()}
			on_cancel={on_cancel_upload_click}
			bind:log_list_el={batch_log_list_el}
		/>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="submit"
				disabled={form_locked}
				class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
			>
				{form_locked
					? m.next_merry_falcon_busy_uploading_ellipsis()
					: m.quaint_grand_snail_amaze_upload()}
			</button>
		</div>
	</form>
</div>
