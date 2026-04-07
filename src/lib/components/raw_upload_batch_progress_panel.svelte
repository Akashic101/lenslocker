<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { raw_upload_batch_log_line } from '$lib/gallery/raw_upload_batch_types';

	let {
		visible,
		overall_batch_percent,
		batch_status_text,
		eta_line = null,
		batch_log_lines,
		log_list_el = $bindable<HTMLUListElement | undefined>(undefined),
		show_cancel = false,
		label_cancel = '',
		on_cancel
	}: {
		visible: boolean;
		overall_batch_percent: number;
		batch_status_text: string;
		eta_line?: string | null;
		batch_log_lines: raw_upload_batch_log_line[];
		log_list_el?: HTMLUListElement | undefined;
		show_cancel?: boolean;
		label_cancel?: string;
		on_cancel?: () => void;
	} = $props();
</script>

{#if visible}
	<div
		class="space-y-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
			<span>{m.super_quiet_gecko_gauge_overall_progress()}</span>
			<div class="flex shrink-0 items-center gap-2">
				<span class="font-mono tabular-nums">{Math.round(overall_batch_percent)}%</span>
				{#if show_cancel && on_cancel != null && label_cancel !== ''}
					<button
						type="button"
						class="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
						onclick={on_cancel}
					>
						{label_cancel}
					</button>
				{/if}
			</div>
		</div>
		<progress
			class="h-2.5 w-full overflow-hidden rounded-full accent-primary-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-200 dark:[&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary-600"
			max={100}
			value={overall_batch_percent}
		></progress>
		{#if eta_line != null && eta_line !== ''}
			<p class="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">{eta_line}</p>
		{/if}
		<p class="min-h-10 text-sm text-gray-800 dark:text-gray-200" role="status" aria-live="polite">
			{batch_status_text}
		</p>
		{#if batch_log_lines.length > 0}
			<ul
				bind:this={log_list_el}
				class="max-h-40 space-y-1 overflow-y-auto text-xs text-gray-700 dark:text-gray-300"
			>
				{#each batch_log_lines as line, line_i (line_i)}
					<li
						class="flex flex-wrap gap-x-2 border-t border-gray-100 pt-1 first:border-0 first:pt-0 dark:border-gray-700"
					>
						<span class="font-medium wrap-break-word">{line.name}</span>
						{#if line.ok}
							<span class="text-green-700 dark:text-green-400">{m.green_low_moose_ok_saved()}</span>
							{#if line.message}
								<span class="text-amber-700 dark:text-amber-400">({line.message})</span>
							{/if}
						{:else}
							<span class="text-red-700 dark:text-red-400"
								>{line.message ?? m.red_flat_newt_fail_line_failed()}</span
							>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
