<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { ClockOutline, LinkBreakOutline } from 'flowbite-svelte-icons';
	type share_error_code = 'share_link_expired' | 'share_link_invalid';

	const error_code = $derived.by((): share_error_code | null => {
		const e = page.error;
		if (e != null && typeof e === 'object' && 'code' in e) {
			const c = (e as { code?: unknown }).code;
			if (c === 'share_link_expired' || c === 'share_link_invalid') return c;
		}
		return null;
	});

	const is_expired = $derived(error_code === 'share_link_expired');
</script>

<svelte:head>
	<title
		>{m.left_fresh_shrew_share_fail_document_title()} | {m.clever_quiet_eagle_brand_lenslocker()}</title
	>
</svelte:head>

<div class="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
	<div
		class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900"
	>
		<div class="flex flex-col items-center text-center">
			<div
				class="mb-5 flex h-14 w-14 items-center justify-center rounded-full {is_expired
					? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
					: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}"
				aria-hidden="true"
			>
				{#if is_expired}
					<ClockOutline class="h-8 w-8" />
				{:else}
					<LinkBreakOutline class="h-8 w-8" />
				{/if}
			</div>

			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				{#if is_expired}
					{m.game_polite_quail_share_deadline_passed_heading()}
				{:else if error_code === 'share_link_invalid'}
					{m.honest_fuzzy_lark_share_gone_heading()}
				{:else}
					{m.each_ornate_yak_share_oops_heading()}
				{/if}
			</h1>

			<p class="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
				{#if is_expired}
					{m.soft_tidy_bee_share_deadline_passed_body()}
				{:else if error_code === 'share_link_invalid'}
					{m.brave_round_mink_share_gone_body()}
				{:else}
					{typeof page.error === 'object' && page.error != null && 'message' in page.error
						? String((page.error as { message?: unknown }).message)
						: m.super_lazy_crow_share_generic_body()}
				{/if}
			</p>
		</div>
	</div>
</div>
