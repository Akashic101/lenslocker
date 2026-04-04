<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { transformed_media_depends_key } from '$lib/transformed_media_cache';

	let { form, data } = $props();
</script>

<svelte:head>
	<title>Upload RAW</title>
</svelte:head>

<div class="mx-auto max-w-xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Upload RAW</h1>
	<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
		Original files are stored under <code class="text-xs">RAW_UPLOAD_ROOT</code> (default
		<code class="text-xs">data/uploads/raw</code>). Metadata is parsed with exifr and saved to SQLite. 		Two JPEG previews — a grid thumbnail (~480px) and a larger modal image (up to ~4096px) — are written under your
		transformed media root (
		<code class="text-xs">TRANSFORMED_MEDIA_ROOT</code> or <code class="text-xs">static/transformed</code>) in
		<code class="text-xs">upload-previews/</code> and appears on the home page grid (newest first).
	</p>

	{#if data.just_uploaded}
		<p
			class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
			role="status"
		>
			Upload saved successfully. Open the home page to see the JPEG preview if conversion succeeded.
		</p>
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
			return async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'redirect' || result.type === 'success') {
					await invalidate(transformed_media_depends_key);
				}
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
