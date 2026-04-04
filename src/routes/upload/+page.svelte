<script lang="ts">
	import { enhance } from '$app/forms';

	let { form, data } = $props();

	const exifr_full_json_column = 'exifr_full_json';

	function prettify_exifr_dump(raw: unknown): string {
		if (raw == null || raw === '') return '(empty)';
		if (typeof raw !== 'string') return String(raw);
		try {
			return JSON.stringify(JSON.parse(raw), null, 2);
		} catch {
			return raw;
		}
	}

	function display_value(value: unknown): string {
		if (value === null || value === undefined) return '—';
		return String(value);
	}

	const sorted_columns = $derived.by(() => {
		const row = data.latest_upload;
		if (!row) return [];
		return Object.keys(row)
			.filter((k) => k !== exifr_full_json_column)
			.sort((a, b) => a.localeCompare(b));
	});

	const latest_row_record = $derived(
		data.latest_upload ? (data.latest_upload as Record<string, unknown>) : null
	);
</script>

<svelte:head>
	<title>Upload RAW</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Upload RAW</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		Files are stored under <code class="text-xs">RAW_UPLOAD_ROOT</code> (default
		<code class="text-xs">data/uploads/raw</code>). Metadata is parsed with exifr and stored in SQLite (table
		<code class="text-xs">raw_image_upload</code>), including a full JSON dump.
	</p>

	{#if data.just_uploaded}
		<p
			class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
			role="status"
		>
			Upload saved successfully.
		</p>
	{/if}

	{#if data.latest_upload}
		<section class="mt-8" aria-labelledby="upload-debug-heading">
			<h2 id="upload-debug-heading" class="text-lg font-semibold text-gray-900 dark:text-white">
				Latest upload (all DB columns)
			</h2>
			{#if data.total_uploads > 1}
				<p class="mt-1 text-sm text-amber-800 dark:text-amber-200">
					There are {data.total_uploads} rows in <code class="text-xs">raw_image_upload</code>; this is the
					most recent by <code class="text-xs">uploaded_at_ms</code>.
				</p>
			{/if}
			<dl
				class="mt-4 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700"
			>
				{#each sorted_columns as column (column)}
					<div class="grid gap-1 bg-white px-3 py-2 sm:grid-cols-[minmax(0,14rem)_1fr] dark:bg-gray-900">
						<dt class="break-all text-xs font-medium text-gray-500 dark:text-gray-400">{column}</dt>
						<dd class="break-all font-mono text-xs text-gray-900 dark:text-gray-100">
							{display_value(latest_row_record?.[column])}
						</dd>
					</div>
				{/each}
			</dl>
			<h3 class="mt-6 text-base font-semibold text-gray-900 dark:text-white">
				<code class="text-sm">{exifr_full_json_column}</code> (pretty-printed)
			</h3>
			<pre
				class="mt-2 max-h-[min(70vh,40rem)] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
			><code>{prettify_exifr_dump(latest_row_record?.[exifr_full_json_column])}</code></pre>
		</section>
	{/if}

	{#if form?.message}
		<p
			class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
			role="alert"
		>
			{form.message}
		</p>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
		class="mt-6 space-y-4"
	>
		<div>
			<label for="raw_file" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
				File
			</label>
			<input
				id="raw_file"
				name="raw_file"
				type="file"
				required
				accept="image/*,.cr2,.cr3,.nef,.nrw,.arw,.raw,.raf,.orf,.rw2,.pef,.srw,.sr2,.dng,.kdc,.3fr,.x3f,.erf,.mef,.mos,.iiq,.fff,.srf"
				class="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
			/>
		</div>
		<button
			type="submit"
			class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 focus:outline-none dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
		>
			Upload
		</button>
	</form>
</div>
