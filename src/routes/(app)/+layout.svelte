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
		BarsFromLeftOutline,
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

	/** Slide-over drawer on narrow viewports; desktop keeps the persistent rail. */
	let mobile_nav_open = $state(false);

	/** Used for mobile overlay vs rail and for `nav_rail_collapsed` (0 = unknown / assume desktop). */
	let shell_inner_width = $state(0);

	const is_shell_mobile = $derived(shell_inner_width > 0 && shell_inner_width < 768);

	/** On mobile the drawer is always full labels, not the icon-only rail. */
	const nav_rail_collapsed = $derived(is_shell_mobile ? false : sidebar_collapsed);

	const mobile_drawer_transform_class = $derived(
		is_shell_mobile
			? mobile_nav_open
				? 'max-md:translate-x-0'
				: 'max-md:pointer-events-none max-md:-translate-x-full'
			: ''
	);

	/** After sidebar width transition (~200ms), nudge ApexCharts / layout that depends on `resize`. */
	let sidebar_layout_resize_timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if (!browser) return;
		if (localStorage.getItem(sidebar_collapsed_storage_key) === '1') sidebar_collapsed = true;
		return () => {
			if (sidebar_layout_resize_timer != null) clearTimeout(sidebar_layout_resize_timer);
		};
	});

	$effect(() => {
		if (!is_shell_mobile) mobile_nav_open = false;
	});

	function toggle_sidebar_collapsed(): void {
		if (is_shell_mobile) {
			mobile_nav_open = false;
			return;
		}
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

	const sidebar_item_label_class = $derived(nav_rail_collapsed ? 'sr-only' : span_class);

	const sidebar_item_anchor_class = $derived(
		nav_rail_collapsed ? '!min-h-10 !justify-center' : '!min-h-10'
	);

	/** Fills the app shell (`h-svh`); main column scrolls independently so the rail stays pinned. */
	const sidebar_shell_class = $derived(
		(nav_rail_collapsed
			? 'flex h-full min-h-0 !w-[3.5rem] min-w-[3.5rem] shrink-0 grow-0 flex-col self-stretch border-e border-gray-200 pt-6 transition-[width] duration-200 ease-out dark:border-gray-700'
			: 'flex h-full min-h-0 !w-64 shrink-0 grow-0 flex-col self-stretch border-e border-gray-200 pt-6 transition-[width] duration-200 ease-out dark:border-gray-700') +
			' max-md:!fixed max-md:inset-y-0 max-md:start-0 max-md:z-50 max-md:h-svh max-md:max-h-svh max-md:!w-64 max-md:min-w-64 max-md:shrink-0 max-md:transition-[transform] max-md:duration-200 max-md:ease-out md:!static md:max-h-none md:translate-x-0 ' +
			mobile_drawer_transform_class
	);

	const sidebar_inner_div_class = $derived(
		nav_rail_collapsed
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

	/** Refetch sidebar count on client navigations so it matches DB after uploads/archives on other routes. */
	afterNavigate(({ from }) => {
		if (from != null) {
			void invalidate(gallery_active_upload_count_depends_key);
		}
		if (is_shell_mobile) mobile_nav_open = false;
	});
</script>

<svelte:window bind:innerWidth={shell_inner_width} />

<div class="flex h-svh min-h-0 w-full items-stretch overflow-hidden bg-gray-50 dark:bg-gray-900">
	{#if mobile_nav_open}
		<div
			role="presentation"
			class="fixed inset-0 z-40 bg-gray-900/60 md:hidden dark:bg-gray-950/70"
			onclick={() => (mobile_nav_open = false)}
		></div>
	{/if}
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
						class:justify-center={nav_rail_collapsed}
						class:justify-between={!nav_rail_collapsed}
					>
						{#if !nav_rail_collapsed}
							<a
								href={localizeHref(resolve('/'))}
								class="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900 no-underline hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
							>
								{m.clever_quiet_eagle_brand_lenslocker()}
							</a>
						{/if}
						<button
							type="button"
							class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-primary-300 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-primary-800"
							aria-expanded={!nav_rail_collapsed}
							aria-controls="app-sidebar"
							aria-label={nav_rail_collapsed
								? m.royal_tidy_lark_layout_aria_expand_sidebar()
								: m.royal_tidy_lark_layout_aria_collapse_sidebar()}
							onclick={toggle_sidebar_collapsed}
						>
							<ChevronDoubleLeftOutline
								class="h-5 w-5 transition-transform duration-200 {nav_rail_collapsed
									? 'rotate-180'
									: ''}"
								aria-hidden="true"
							/>
						</button>
					</div>
				</li>
				{#if nav_rail_collapsed}
					<SidebarItem
						label={m.tidy_best_bumblebee_feast_dashboard()}
						spanClass={sidebar_item_label_class}
						aClass={sidebar_item_anchor_class}
						href={dashboard_all_href}
						title={m.royal_tidy_lark_layout_title_dashboard_collapsed()}
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
								<span class={span_class}>{m.tidy_best_bumblebee_feast_dashboard()}</span>
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
									? m.royal_tidy_lark_layout_aria_hide_dashboard_views()
									: m.royal_tidy_lark_layout_aria_show_dashboard_views()}
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
									label={m.funny_grand_mink_coax_review()}
									spanClass={span_class}
									aClass={sidebar_item_anchor_class}
									href={dashboard_needs_attention_href}
									active={dashboard_attention_active}
									title={m.royal_tidy_lark_layout_title_review_needs_attention()}
								>
									{#snippet icon()}
										<ExclamationCircleOutline
											class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
										/>
									{/snippet}
								</SidebarItem>
								<SidebarItem
									label={m.safe_home_moose_sing_archived_only()}
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
					label={m.quaint_grand_snail_amaze_upload()}
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={upload_url}
					title={nav_rail_collapsed ? m.quaint_grand_snail_amaze_upload() : undefined}
				>
					{#snippet icon()}
						<UploadOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label={m.such_tangy_mare_conquer_hardware()}
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={hardware_url}
					title={nav_rail_collapsed ? m.such_tangy_mare_conquer_hardware() : undefined}
				>
					{#snippet icon()}
						<CameraPhotoOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label={m.proud_tough_oryx_dare_statistics()}
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={statistics_url}
					title={nav_rail_collapsed ? m.proud_tough_oryx_dare_statistics() : undefined}
				>
					{#snippet icon()}
						<ChartMixedOutline
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem
					label={m.fuzzy_dull_alpaca_achieve_settings()}
					spanClass={sidebar_item_label_class}
					aClass={sidebar_item_anchor_class}
					href={settings_url}
					title={nav_rail_collapsed ? m.fuzzy_dull_alpaca_achieve_settings() : undefined}
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
						class:items-center={nav_rail_collapsed}
						class:items-start={!nav_rail_collapsed}
						class:ps-2={!nav_rail_collapsed}
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
		<header
			class="-mx-6 -mt-6 mb-4 flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 md:hidden dark:border-gray-700 dark:bg-gray-900"
		>
			<button
				type="button"
				class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus:ring-2 focus:ring-primary-300 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:ring-primary-800"
				aria-expanded={mobile_nav_open}
				aria-controls="app-sidebar"
				aria-label={m.royal_tidy_lark_layout_aria_expand_sidebar()}
				onclick={() => (mobile_nav_open = true)}
			>
				<BarsFromLeftOutline class="h-6 w-6 shrink-0" aria-hidden="true" />
			</button>
			<a
				href={localizeHref(resolve('/'))}
				class="min-w-0 truncate text-lg font-semibold text-gray-900 no-underline hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
			>
				{m.clever_quiet_eagle_brand_lenslocker()}
			</a>
		</header>
		{@render children()}
	</main>
</div>

<div class="hidden" aria-hidden="true">
	{#each locales as locale (locale)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- paraglide locale switcher -->
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
