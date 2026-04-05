<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- sidebar hrefs use localizeHref(resolve(...)) */
	import { browser } from '$app/environment';
	import { afterNavigate, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Avatar, Sidebar, SidebarGroup, SidebarItem } from 'flowbite-svelte';
	import {
		ArchiveOutline,
		CameraPhotoOutline,
		ChartMixedOutline,
		CogOutline,
		ExclamationCircleOutline,
		SearchOutline,
		ChevronDoubleLeftOutline,
		ChevronDownOutline,
		UploadOutline
	} from 'flowbite-svelte-icons';
	import { m } from '$lib/paraglide/messages.js';

	let { children, data } = $props();

	/** Refetch sidebar count on client navigations so it matches DB after uploads/archives on other routes. */
	afterNavigate(({ from }) => {
		if (from != null) {
			void invalidate(gallery_active_upload_count_depends_key);
		}
	});

	let active_url = $derived(page.url.pathname);

	const span_class = 'flex-1 ms-3 whitespace-nowrap';

	const dashboard_all_href = $derived(localizeHref(resolve('/')));
	const dashboard_needs_attention_href = $derived(localizeHref('/?gallery_focus=needs_attention'));
	const dashboard_archived_href = $derived(localizeHref('/?gallery_focus=archived'));
	const upload_url = $derived(localizeHref('/upload'));
	const hardware_url = $derived(localizeHref('/hardware'));
	const statistics_url = $derived(localizeHref('/statistics'));
	const settings_url = $derived(localizeHref('/settings'));

	const sidebar_collapsed_storage_key = 'lenslocker_sidebar_collapsed';

	let sidebar_collapsed = $state(false);

	/** After sidebar width transition (~200ms), nudge ApexCharts / layout that depends on `resize`. */
	let sidebar_layout_resize_timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if (!browser) return;
		if (localStorage.getItem(sidebar_collapsed_storage_key) === '1') sidebar_collapsed = true;
		return () => {
			if (sidebar_layout_resize_timer != null) clearTimeout(sidebar_layout_resize_timer);
		};
	});

	function toggle_sidebar_collapsed(): void {
		sidebar_collapsed = !sidebar_collapsed;
		if (browser) {
			localStorage.setItem(sidebar_collapsed_storage_key, sidebar_collapsed ? '1' : '0');
			if (sidebar_layout_resize_timer != null) clearTimeout(sidebar_layout_resize_timer);
			sidebar_layout_resize_timer = setTimeout(() => {
				window.dispatchEvent(new Event('resize'));
				sidebar_layout_resize_timer = undefined;
			}, 220);
		}
	}

	const sidebar_item_label_class = $derived(sidebar_collapsed ? 'sr-only' : span_class);

	const sidebar_item_anchor_class = $derived(
		sidebar_collapsed ? '!min-h-10 !justify-center' : '!min-h-10'
	);

	/** Fills the app shell (`h-svh`); main column scrolls independently so the rail stays pinned. */
	const sidebar_shell_class = $derived(
		sidebar_collapsed
			? 'flex h-full min-h-0 !w-[3.5rem] min-w-[3.5rem] shrink-0 grow-0 flex-col self-stretch border-e border-gray-200 pt-6 transition-[width] duration-200 ease-out dark:border-gray-700'
			: 'flex h-full min-h-0 !w-64 shrink-0 grow-0 flex-col self-stretch border-e border-gray-200 pt-6 transition-[width] duration-200 ease-out dark:border-gray-700'
	);

	const sidebar_inner_div_class = $derived(
		sidebar_collapsed
			? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden !px-1 py-4 bg-gray-50 dark:bg-gray-800'
			: 'flex h-full min-h-0 flex-1 flex-col overflow-hidden px-3 py-4 bg-gray-50 dark:bg-gray-800'
	);

	const gallery_focus_param = $derived.by(() => {
		if (active_url !== '/') return '';
		const v = page.url.searchParams.get('gallery_focus')?.trim() ?? '';
		if (v === 'needs_attention' || v === 'archived') return v;
		return '';
	});

	let dashboard_menu_open = $state(false);

	$effect(() => {
		if (gallery_focus_param === 'needs_attention' || gallery_focus_param === 'archived') {
			dashboard_menu_open = true;
		}
	});

	const dashboard_all_active = $derived(active_url === '/' && gallery_focus_param === '');
	const dashboard_attention_active = $derived(gallery_focus_param === 'needs_attention');
	const dashboard_archived_active = $derived(gallery_focus_param === 'archived');
</script>

<div class="flex h-svh min-h-0 w-full items-stretch overflow-hidden bg-gray-50 dark:bg-gray-900">
	<Sidebar
		id="app-sidebar"
		activeUrl={active_url}
		alwaysOpen={true}
		backdrop={false}
		isOpen={true}
		isSingle={false}
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
						class="flex min-h-10 w-full items-center gap-2 px-0.5"
						class:justify-center={sidebar_collapsed}
						class:justify-between={!sidebar_collapsed}
					>
						{#if !sidebar_collapsed}
							<a
								href={localizeHref(resolve('/'))}
								class="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900 no-underline hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
							>
								{m.hello_world({ name: 'David' })}
							</a>
						{/if}
						<button
							type="button"
							class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-primary-300 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-primary-800"
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
				{#if sidebar_collapsed}
					<SidebarItem
						label="Dashboard"
						spanClass={sidebar_item_label_class}
						aClass={sidebar_item_anchor_class}
						href={dashboard_all_href}
						title="All photos — expand sidebar for Needs attention and Archived"
					>
						{#snippet icon()}
							<SearchOutline
								class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
							/>
						{/snippet}
					</SidebarItem>
				{:else}
					<li class="list-none">
						<div
							class="flex w-full items-stretch overflow-hidden rounded-sm transition duration-75 hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<a
								href={localizeHref(resolve('/'))}
								aria-current={dashboard_all_active ? 'page' : undefined}
								class="group flex min-h-10 min-w-0 flex-1 items-center p-2 text-base font-normal text-gray-900 transition duration-75 dark:text-white {dashboard_all_active
									? 'bg-gray-100 dark:bg-gray-700'
									: ''}"
							>
								<SearchOutline
									class="h-5 w-5 shrink-0 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
								/>
								<span class={span_class}>Dashboard</span>
								<span
									class="ms-3 inline-flex min-w-8 shrink-0 items-center justify-center rounded-full bg-primary-200 px-2 py-1 text-sm font-medium text-primary-900 dark:bg-primary-200 dark:text-primary-900"
								>
									{data.gallery_active_upload_count}
								</span>
							</a>
							<button
								type="button"
								class="inline-flex min-h-10 w-9 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent p-0 text-gray-800 hover:bg-gray-200/50 dark:text-white dark:hover:bg-gray-600/40"
								aria-expanded={dashboard_menu_open}
								aria-controls="dashboard-submenu"
								aria-label={dashboard_menu_open
									? 'Hide Needs attention and Archived'
									: 'Show Needs attention and Archived'}
								onclick={() => (dashboard_menu_open = !dashboard_menu_open)}
							>
								<ChevronDownOutline
									class="h-3 w-3 transition-transform duration-200 {dashboard_menu_open
										? 'rotate-180'
										: ''}"
									aria-hidden="true"
								/>
							</button>
						</div>
						{#if dashboard_menu_open}
							<ul
								id="dashboard-submenu"
								class="space-y-0 py-2"
								transition:slide={{ duration: 150 }}
							>
								<SidebarItem
									label="Needs attention"
									spanClass={span_class}
									aClass={sidebar_item_anchor_class}
									href={dashboard_needs_attention_href}
									active={dashboard_attention_active}
									title="Missing GPS, camera or lens metadata, or shot date"
								>
									{#snippet icon()}
										<ExclamationCircleOutline
											class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
										/>
									{/snippet}
								</SidebarItem>
								<SidebarItem
									label="Archived only"
									spanClass={span_class}
									aClass={sidebar_item_anchor_class}
									href={dashboard_archived_href}
									active={dashboard_archived_active}
								>
									{#snippet icon()}
										<ArchiveOutline
											class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
										/>
									{/snippet}
								</SidebarItem>
							</ul>
						{/if}
					</li>
				{/if}
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
		<div class="mt-auto shrink-0">
			<SidebarGroup border={true}>
				<li class="list-none">
					<div
						class="flex flex-col gap-2 px-0.5 pt-1 pb-3"
						class:items-center={sidebar_collapsed}
						class:items-start={!sidebar_collapsed}
						class:ps-2={!sidebar_collapsed}
					>
						<Avatar
							cornerStyle="rounded"
							size="sm"
							title={data.user_label}
							aria-label={data.user_label}
						>
							<span class="text-xs font-semibold tracking-wide uppercase select-none">
								{data.user_initials}
							</span>
						</Avatar>
					</div>
				</li>
			</SidebarGroup>
		</div>
	</Sidebar>

	<main class="min-h-0 min-w-0 flex-1 overflow-auto p-6 md:p-8">
		{@render children()}
	</main>
</div>

<div class="hidden" aria-hidden="true">
	{#each locales as locale (locale)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- paraglide locale switcher -->
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
