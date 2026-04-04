<script lang="ts">
	import { afterNavigate, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { gallery_active_upload_count_depends_key } from '$lib/gallery_upload_count_cache';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Sidebar, SidebarGroup, SidebarItem } from 'flowbite-svelte';
	import { CameraPhotoOutline, ChartOutline, UploadOutline } from 'flowbite-svelte-icons';

	let { children, data } = $props();

	/** Refetch sidebar count on client navigations so it matches DB after uploads/archives on other routes. */
	afterNavigate(({ from }) => {
		if (from != null) {
			void invalidate(gallery_active_upload_count_depends_key);
		}
	});

	let active_url = $derived(page.url.pathname);

	const span_class = 'flex-1 ms-3 whitespace-nowrap';

	const dashboard_url = $derived(localizeHref('/'));
	const upload_url = $derived(localizeHref('/upload'));
	const hardware_url = $derived(localizeHref('/hardware'));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-svh w-full bg-gray-50 dark:bg-gray-900">
	<Sidebar
		activeUrl={active_url}
		alwaysOpen={true}
		backdrop={false}
		isOpen={true}
		activateClickOutside={false}
		closeSidebar={() => {}}
		position="static"
		params={{ x: -50, duration: 50 }}
		class="h-svh w-64 shrink-0 border-e border-gray-200 pt-6 dark:border-gray-700"
		classes={{ nonactive: 'p-2', active: 'p-2' }}
	>
		<SidebarGroup>
			<SidebarItem label="Dashboard" spanClass={span_class} href={dashboard_url}>
				{#snippet icon()}
					<ChartOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
				{#snippet subtext()}
					<span
						class="ms-3 inline-flex min-w-8 items-center justify-center rounded-full bg-primary-200 px-2 py-1 text-sm font-medium text-primary-900"
					>
						{data.gallery_active_upload_count}
					</span>
				{/snippet}
			</SidebarItem>
			<SidebarItem label="Upload" href={upload_url}>
				{#snippet icon()}
					<UploadOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>
			<SidebarItem label="Hardware" href={hardware_url}>
				{#snippet icon()}
					<CameraPhotoOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>
		</SidebarGroup>
	</Sidebar>

	<main class="min-h-svh min-w-0 flex-1 overflow-auto p-6 md:p-8">
		{@render children()}
	</main>
</div>

<div class="hidden" aria-hidden="true">
	{#each locales as locale (locale)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- paraglide locale switcher -->
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
