import { beforeEach, describe, expect, it, vi } from 'vitest';

type batch_module = typeof import('./raw_upload_batch_activity.svelte');

async function import_batch_module(): Promise<batch_module> {
	// `raw_upload_batch_activity.svelte.ts` uses Svelte's `$state` rune at module init.
	// In unit tests, we stub it to behave like a plain object container.
	(globalThis as unknown as { $state?: (v: unknown) => unknown }).$state = (v: unknown) => v;
	return await import('./raw_upload_batch_activity.svelte');
}

describe('raw_upload_batch_activity', () => {
	beforeEach(async () => {
		const m = await import_batch_module();
		m.end_raw_upload_batch_success();
	});

	it('begin_raw_upload_batch initializes state and sets started_at_ms', async () => {
		const date_now_ms = 1_700_000_000_000;
		vi.spyOn(Date, 'now').mockReturnValue(date_now_ms);

		const m = await import_batch_module();
		m.begin_raw_upload_batch([], 3);

		expect(m.raw_upload_batch_activity.in_progress).toBe(true);
		expect(m.raw_upload_batch_activity.total).toBe(3);
		expect(m.raw_upload_batch_activity.done).toBe(0);
		expect(m.raw_upload_batch_activity.phase).toBe('idle');
		expect(m.raw_upload_batch_activity.overall_percent).toBe(0);
		expect(m.raw_upload_batch_activity.started_at_ms).toBe(date_now_ms);
	});

	it('patch_raw_upload_batch_fields recomputes overall_percent for uploading', async () => {
		const m = await import_batch_module();
		m.begin_raw_upload_batch([], 10);

		m.patch_raw_upload_batch_fields({ phase: 'uploading', done: 0, part_upload_pct: 100 });

		// slice = 10; sub = 0.45 -> overall = 10 * 0.45 = 4.5
		expect(m.raw_upload_batch_activity.overall_percent).toBe(4.5);
	});

	it('patch_raw_upload_batch_fields recomputes overall_percent for processing', async () => {
		const m = await import_batch_module();
		m.begin_raw_upload_batch([], 10);

		m.patch_raw_upload_batch_fields({ phase: 'processing', done: 0, part_upload_pct: 0 });

		// slice = 10; sub = 0.95 -> overall = 9.5
		expect(m.raw_upload_batch_activity.overall_percent).toBe(9.5);
	});

	it('patch_raw_upload_batch_fields keeps overall_percent at 0 when total <= 0', async () => {
		const m = await import_batch_module();
		m.begin_raw_upload_batch([], 0);

		m.patch_raw_upload_batch_fields({ phase: 'uploading', done: 0, part_upload_pct: 100 });

		expect(m.raw_upload_batch_activity.overall_percent).toBe(0);
	});

	describe('patch_raw_upload_batch_fields optional keys (lines 73–79)', () => {
		it('applies only phase when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 4);
			m.patch_raw_upload_batch_fields({
				done: 1,
				total: 4,
				current_name: 'before',
				current_index: 2,
				part_upload_pct: 40,
				log_lines: [{ name: 'x', ok: true }]
			});

			m.patch_raw_upload_batch_fields({ phase: 'uploading' });

			expect(m.raw_upload_batch_activity.phase).toBe('uploading');
			expect(m.raw_upload_batch_activity.done).toBe(1);
			expect(m.raw_upload_batch_activity.total).toBe(4);
			expect(m.raw_upload_batch_activity.current_name).toBe('before');
			expect(m.raw_upload_batch_activity.current_index).toBe(2);
			expect(m.raw_upload_batch_activity.part_upload_pct).toBe(40);
			expect(m.raw_upload_batch_activity.log_lines).toEqual([{ name: 'x', ok: true }]);
		});

		it('applies only done when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 10);
			m.patch_raw_upload_batch_fields({ phase: 'uploading', part_upload_pct: 100 });

			m.patch_raw_upload_batch_fields({ done: 7 });

			expect(m.raw_upload_batch_activity.done).toBe(7);
			expect(m.raw_upload_batch_activity.phase).toBe('uploading');
		});

		it('applies only total when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 10);
			m.patch_raw_upload_batch_fields({ done: 2 });

			m.patch_raw_upload_batch_fields({ total: 5 });

			expect(m.raw_upload_batch_activity.total).toBe(5);
			expect(m.raw_upload_batch_activity.done).toBe(2);
		});

		it('applies only current_name when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 3);

			m.patch_raw_upload_batch_fields({ current_name: 'DSC0001.RAW' });

			expect(m.raw_upload_batch_activity.current_name).toBe('DSC0001.RAW');
			expect(m.raw_upload_batch_activity.done).toBe(0);
		});

		it('applies only current_index when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 3);

			m.patch_raw_upload_batch_fields({ current_index: 2 });

			expect(m.raw_upload_batch_activity.current_index).toBe(2);
		});

		it('applies only part_upload_pct when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 10);
			m.patch_raw_upload_batch_fields({ phase: 'uploading', done: 0 });

			m.patch_raw_upload_batch_fields({ part_upload_pct: 33 });

			expect(m.raw_upload_batch_activity.part_upload_pct).toBe(33);
			expect(m.raw_upload_batch_activity.phase).toBe('uploading');
		});

		it('applies only log_lines when other keys omitted', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 2);
			const next_log = [{ name: 'a', ok: true, message: 'ok' }];

			m.patch_raw_upload_batch_fields({ log_lines: next_log });

			expect(m.raw_upload_batch_activity.log_lines).toBe(next_log);
		});

		it('does not overwrite when a key is explicitly undefined', async () => {
			const m = await import_batch_module();
			m.begin_raw_upload_batch([], 3);
			m.patch_raw_upload_batch_fields({ phase: 'processing', current_name: 'keep-me' });

			m.patch_raw_upload_batch_fields({
				phase: undefined,
				current_name: undefined
			});

			expect(m.raw_upload_batch_activity.phase).toBe('processing');
			expect(m.raw_upload_batch_activity.current_name).toBe('keep-me');
		});
	});

	it('request_cancel_raw_upload_batch sets cancel_requested and aborts active xhr', async () => {
		const m = await import_batch_module();

		const abort_spy = vi.fn();
		m.set_active_raw_upload_xhr({ abort: abort_spy } as unknown as XMLHttpRequest);

		m.request_cancel_raw_upload_batch();

		expect(m.raw_upload_batch_activity.cancel_requested).toBe(true);
		expect(abort_spy).toHaveBeenCalledTimes(1);
	});

	it('set_disk_import_abort_controller registers controller aborted by request_cancel_raw_upload_batch', async () => {
		const m = await import_batch_module();
		const controller = new AbortController();
		const abort_spy = vi.spyOn(controller, 'abort');

		m.set_disk_import_abort_controller(controller);
		m.request_cancel_raw_upload_batch();

		expect(m.raw_upload_batch_activity.cancel_requested).toBe(true);
		expect(abort_spy).toHaveBeenCalledTimes(1);
	});

	it('set_disk_import_abort_controller(null) clears so request_cancel does not abort a previous controller', async () => {
		const m = await import_batch_module();
		const stale = new AbortController();
		const stale_abort_spy = vi.spyOn(stale, 'abort');

		m.set_disk_import_abort_controller(stale);
		m.set_disk_import_abort_controller(null);

		const xhr_abort_spy = vi.fn();
		m.set_active_raw_upload_xhr({ abort: xhr_abort_spy } as unknown as XMLHttpRequest);
		m.request_cancel_raw_upload_batch();

		expect(stale_abort_spy).not.toHaveBeenCalled();
		expect(xhr_abort_spy).toHaveBeenCalledTimes(1);
	});

	it('request_cancel_raw_upload_batch aborts both xhr and disk import controller when both active', async () => {
		const m = await import_batch_module();
		const xhr_abort_spy = vi.fn();
		m.set_active_raw_upload_xhr({ abort: xhr_abort_spy } as unknown as XMLHttpRequest);

		const controller = new AbortController();
		const disk_abort_spy = vi.spyOn(controller, 'abort');
		m.set_disk_import_abort_controller(controller);

		m.request_cancel_raw_upload_batch();

		expect(xhr_abort_spy).toHaveBeenCalledTimes(1);
		expect(disk_abort_spy).toHaveBeenCalledTimes(1);
	});

	it('end_raw_upload_batch_success marks session finished and sets percent to 100', async () => {
		const m = await import_batch_module();
		m.begin_raw_upload_batch([], 2);
		m.patch_raw_upload_batch_fields({ done: 1, phase: 'uploading', part_upload_pct: 50 });

		m.end_raw_upload_batch_success();

		expect(m.raw_upload_batch_activity.in_progress).toBe(false);
		expect(m.raw_upload_batch_activity.session_finished).toBe(true);
		expect(m.raw_upload_batch_activity.session_cancelled).toBe(false);
		expect(m.raw_upload_batch_activity.done).toBe(2);
		expect(m.raw_upload_batch_activity.overall_percent).toBe(100);
		expect(m.raw_upload_batch_activity.started_at_ms).toBeNull();
	});

	it('end_raw_upload_batch_cancelled marks session cancelled', async () => {
		const m = await import_batch_module();
		m.begin_raw_upload_batch([], 2);
		m.patch_raw_upload_batch_fields({ done: 1, phase: 'uploading', part_upload_pct: 50 });

		m.end_raw_upload_batch_cancelled();

		expect(m.raw_upload_batch_activity.in_progress).toBe(false);
		expect(m.raw_upload_batch_activity.session_finished).toBe(true);
		expect(m.raw_upload_batch_activity.session_cancelled).toBe(true);
		expect(m.raw_upload_batch_activity.started_at_ms).toBeNull();
	});
});
