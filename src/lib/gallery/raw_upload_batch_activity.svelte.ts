import type { raw_upload_batch_log_line } from '$lib/gallery/raw_upload_batch_types';

type raw_upload_batch_phase = 'idle' | 'uploading' | 'processing';

export const raw_upload_batch_activity = $state({
	in_progress: false,
	/** 0–100 overall batch progress */
	overall_percent: 0,
	phase: 'idle' as raw_upload_batch_phase,
	done: 0,
	total: 0,
	current_name: '',
	current_index: 0,
	part_upload_pct: 0,
	log_lines: [] as raw_upload_batch_log_line[],
	cancel_requested: false,
	/** After a batch ends successfully; keeps log until a new batch begins */
	session_finished: false,
	session_cancelled: false,
	/** Wall-clock start of the current batch (client); null when idle */
	started_at_ms: null as number | null
});

let active_raw_upload_xhr: XMLHttpRequest | null = null;
let active_disk_import_abort: AbortController | null = null;

function recompute_overall_percent(): void {
	const a = raw_upload_batch_activity;
	const t = a.total;
	if (t <= 0) {
		a.overall_percent = 0;
		return;
	}
	const slice = 100 / t;
	let sub = 0;
	if (a.phase === 'uploading') {
		sub = 0.45 * (a.part_upload_pct / 100);
	} else if (a.phase === 'processing') {
		sub = 0.45 + 0.5;
	}
	a.overall_percent = Math.min(100, slice * a.done + slice * sub);
}

export function begin_raw_upload_batch(
	initial_log: raw_upload_batch_log_line[],
	total: number
): void {
	const a = raw_upload_batch_activity;
	active_raw_upload_xhr = null;
	active_disk_import_abort = null;
	a.cancel_requested = false;
	a.session_finished = false;
	a.session_cancelled = false;
	a.in_progress = true;
	a.done = 0;
	a.total = total;
	a.phase = 'idle';
	a.part_upload_pct = 0;
	a.current_name = '';
	a.current_index = 0;
	a.log_lines = initial_log;
	a.started_at_ms = Date.now();
	recompute_overall_percent();
}

export function patch_raw_upload_batch_fields(p: {
	phase?: raw_upload_batch_phase;
	done?: number;
	total?: number;
	current_name?: string;
	current_index?: number;
	part_upload_pct?: number;
	log_lines?: raw_upload_batch_log_line[];
}): void {
	const a = raw_upload_batch_activity;
	if (p.phase !== undefined) a.phase = p.phase;
	if (p.done !== undefined) a.done = p.done;
	if (p.total !== undefined) a.total = p.total;
	if (p.current_name !== undefined) a.current_name = p.current_name;
	if (p.current_index !== undefined) a.current_index = p.current_index;
	if (p.part_upload_pct !== undefined) a.part_upload_pct = p.part_upload_pct;
	if (p.log_lines !== undefined) a.log_lines = p.log_lines;
	recompute_overall_percent();
}

export function end_raw_upload_batch_success(): void {
	const a = raw_upload_batch_activity;
	active_raw_upload_xhr = null;
	active_disk_import_abort = null;
	a.cancel_requested = false;
	a.in_progress = false;
	a.part_upload_pct = 0;
	a.phase = 'idle';
	a.current_name = '';
	a.done = a.total;
	a.overall_percent = 100;
	a.session_finished = true;
	a.session_cancelled = false;
	a.started_at_ms = null;
}

export function end_raw_upload_batch_cancelled(): void {
	const a = raw_upload_batch_activity;
	active_raw_upload_xhr = null;
	active_disk_import_abort = null;
	a.cancel_requested = false;
	a.in_progress = false;
	a.phase = 'idle';
	a.part_upload_pct = 0;
	a.current_name = '';
	a.session_finished = true;
	a.session_cancelled = true;
	a.started_at_ms = null;
	recompute_overall_percent();
}

export function request_cancel_raw_upload_batch(): void {
	raw_upload_batch_activity.cancel_requested = true;
	active_raw_upload_xhr?.abort();
	active_disk_import_abort?.abort();
}

export function set_disk_import_abort_controller(controller: AbortController | null): void {
	active_disk_import_abort = controller;
}

export function set_active_raw_upload_xhr(xhr: XMLHttpRequest | null): void {
	active_raw_upload_xhr = xhr;
}
