<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import {
		Sidebar,
		SidebarGroup,
		SidebarItem
	} from 'flowbite-svelte';
	import {
		ChartOutline,
		GridSolid,
		MailBoxSolid,
		UploadOutline,
		UserSolid
	} from 'flowbite-svelte-icons';

	let { children } = $props();

	let active_url = $derived(page.url.pathname);

	const span_class = 'flex-1 ms-3 whitespace-nowrap';

	const dashboard_url = $derived(localizeHref('/'));
	const demo_overview_url = $derived(localizeHref('/demo'));
	const demo_auth_url = $derived(localizeHref('/demo/better-auth'));
	const demo_login_url = $derived(localizeHref('/demo/better-auth/login'));
	const upload_url = $derived(localizeHref('/upload'));
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
			<SidebarItem label="Dashboard" href={dashboard_url}>
				{#snippet icon()}
					<ChartOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>
			<SidebarItem label="Upload" href={upload_url}>
				{#snippet icon()}
					<UploadOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>
			<SidebarItem label="Kanban" spanClass={span_class} href={demo_overview_url}>
				{#snippet icon()}
					<GridSolid
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
				{#snippet subtext()}
					<span
						class="ms-3 inline-flex items-center justify-center rounded-full bg-gray-200 px-2 text-sm font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
					>
						Pro
					</span>
				{/snippet}
			</SidebarItem>
			<SidebarItem label="Inbox" spanClass={span_class} href={demo_auth_url}>
				{#snippet icon()}
					<MailBoxSolid
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
				{#snippet subtext()}
					<span
						class="bg-primary-200 text-primary-600 dark:bg-primary-900 dark:text-primary-200 ms-3 inline-flex h-3 w-3 items-center justify-center rounded-full p-3 text-sm font-medium"
					>
						3
					</span>
				{/snippet}
			</SidebarItem>
			<SidebarItem label="Sidebar" href={demo_login_url}>
				{#snippet icon()}
					<UserSolid
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
