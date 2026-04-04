<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { gallery_active_upload_count_depends_key } from '$lib/gallery_upload_count_cache';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { DarkMode, Sidebar, SidebarGroup, SidebarItem } from 'flowbite-svelte';
	import {
		CameraPhotoOutline,
		ChartMixedOutline,
		CogOutline,
		SearchOutline,
		ChevronDoubleLeftOutline,
		UploadOutline
	} from 'flowbite-svelte-icons';

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
	const statistics_url = $derived(localizeHref('/statistics'));
	const settings_url = $derived(localizeHref('/settings'));

	const sidebar_collapsed_storage_key = 'lenslocker_sidebar_collapsed';

	let sidebar_collapsed = $state(false);

	onMount(() => {
		if (!browser) return;
		if (localStorage.getItem(sidebar_collapsed_storage_key) === '1') sidebar_collapsed = true;
	});

	function toggle_sidebar_collapsed(): void {
		sidebar_collapsed = !sidebar_collapsed;
		if (browser) {
			localStorage.setItem(sidebar_collapsed_storage_key, sidebar_collapsed ? '1' : '0');
		}
	}

	const sidebar_item_label_class = $derived(sidebar_collapsed ? 'sr-only' : span_class);

	const sidebar_item_anchor_class = $derived(
		sidebar_collapsed ? '!min-h-10 !justify-center' : '!min-h-10'
	);

	const sidebar_shell_class = $derived(
		sidebar_collapsed
			? 'flex h-svh min-h-0 !w-[3.5rem] min-w-[3.5rem] shrink-0 flex-col border-e border-gray-200 pt-6 transition-[width] duration-200 ease-out dark:border-gray-700'
			: 'flex h-svh min-h-0 !w-64 shrink-0 flex-col border-e border-gray-200 pt-6 transition-[width] duration-200 ease-out dark:border-gray-700'
	);

	const sidebar_inner_div_class = $derived(
		sidebar_collapsed
			? 'flex min-h-0 flex-1 flex-col !px-1 py-4 bg-gray-50 dark:bg-gray-800'
			: 'flex min-h-0 flex-1 flex-col px-3 py-4 bg-gray-50 dark:bg-gray-800'
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-svh w-full bg-gray-50 dark:bg-gray-900">
	<Sidebar
		id="app-sidebar"
		activeUrl={active_url}
		alwaysOpen={true}
		backdrop={false}
		isOpen={true}
		activateClickOutside={false}
		closeSidebar={() => {}}
		position="static"
		params={{ x: -50, duration: 50 }}
		class={sidebar_shell_class}
		classes={{
			nonactive: 'p-2',
			active: 'p-2',
			div: sidebar_inner_div_class
		}}
	>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<SidebarGroup>
				<li class="mb-2 list-none">
					<div
						class="flex min-h-10 items-center px-0.5"
						class:justify-center={sidebar_collapsed}
						class:justify-end={!sidebar_collapsed}
					>
						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-primary-300 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-primary-800"
							aria-expanded={!sidebar_collapsed}
							aria-controls="app-sidebar"
							aria-label={sidebar_collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
							onclick={toggle_sidebar_collapsed}
						>
							<ChevronDoubleLeftOutline
								class="h-5 w-5 transition-transform duration-200 {sidebar_collapsed
									? 'rotate-180'
									: ''}"
								aria-hidden="true"
							/>
						</button>
					</div>
				</li>
				<SidebarItem
					label="Dashboard"
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={dashboard_url}
					title={sidebar_collapsed
						? `Dashboard — ${data.gallery_active_upload_count} photos`
						: undefined}
				>
					{#snippet icon()}
						<SearchOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
					{#snippet subtext()}
						{#if !sidebar_collapsed}
							<span
								class="ms-3 inline-flex min-w-8 items-center justify-center rounded-full bg-primary-200 px-2 py-1 text-sm font-medium text-primary-900"
							>
								{data.gallery_active_upload_count}
							</span>
						{/if}
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label="Upload"
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={upload_url}
					title={sidebar_collapsed ? 'Upload' : undefined}
				>
					{#snippet icon()}
						<UploadOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label="Hardware"
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={hardware_url}
					title={sidebar_collapsed ? 'Hardware' : undefined}
				>
					{#snippet icon()}
						<CameraPhotoOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label="Statistics"
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={statistics_url}
					title={sidebar_collapsed ? 'Statistics' : undefined}
				>
					{#snippet icon()}
						<ChartMixedOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label="Settings"
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={settings_url}
					title={sidebar_collapsed ? 'Settings' : undefined}
				>
					{#snippet icon()}
						<CogOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
			</SidebarGroup>
		</div>
		<div class="shrink-0">
			<SidebarGroup border={true}>
				<li class="list-none">
					<div
						class="flex min-h-10 items-center px-0.5"
						class:justify-center={sidebar_collapsed}
						class:ps-2={!sidebar_collapsed}
					>
						<DarkMode />
					</div>
				</li>
			</SidebarGroup>
		</div>
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
