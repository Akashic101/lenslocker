<script lang="ts">
	import { localizeHref } from '$lib/paraglide/runtime';

	/* eslint-disable svelte/no-navigation-without-resolve -- localizeHref() for home pagination; /media/transformed/* URLs are dynamic and not in typed routes */

	let { data } = $props();

	function pagination_href(target_page: number): string {
		if (target_page <= 1) return localizeHref('/');
		return localizeHref(`/?page=${target_page}`);
	}
</script>

<svelte:head>
	<title>Transformed</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<header class="mb-8">
		<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Transformed</h1>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
			Media root: <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">{data.transformed_source}</code>
			— up to {data.pagination.images_per_page} files per page ({data.pagination.total_count} total). RAW and JPEG/PNG/WebP
			etc. are listed; many RAW formats will not preview in the browser until you add conversions or thumbnails.
		</p>
	</header>

	{#if data.images.length === 0}
		<p class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
			No media yet. Set <code class="text-xs">TRANSFORMED_MEDIA_ROOT</code> to an absolute path (Docker volume) or add files under
			<code class="text-xs">static/transformed/</code>.
		</p>
	{:else}
		<ul
			class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
			role="list"
		>
			{#each data.images as item (item.src)}
				<li class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
					<a
						href={item.src}
						class="block focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
						target="_blank"
						rel="noreferrer"
					>
						<img
							src={item.src}
							alt={item.alt}
							class="aspect-square w-full object-cover"
							loading="lazy"
							decoding="async"
						/>
					</a>
				</li>
			{/each}
		</ul>

		{#if data.pagination.total_pages > 1}
			<nav class="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
				{#if data.pagination.has_previous}
					<a
						href={pagination_href(data.pagination.current_page - 1)}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						Previous
					</a>
				{/if}

				<span class="px-3 text-sm text-gray-600 dark:text-gray-400">
					Page {data.pagination.current_page} of {data.pagination.total_pages}
				</span>

				{#if data.pagination.has_next}
					<a
						href={pagination_href(data.pagination.current_page + 1)}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						Next
					</a>
				{/if}
			</nav>
		{/if}
	{/if}
</div>
