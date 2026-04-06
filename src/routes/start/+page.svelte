<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label } from 'flowbite-svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let mode = $state<'sign_in' | 'sign_up'>('sign_up');
</script>

<div
	class="flex min-h-svh flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900"
>
	<div class="w-full max-w-md">
		<h1 class="mb-2 text-center text-2xl font-semibold text-gray-900 dark:text-white">
			{m.clever_quiet_eagle_brand_lenslocker()}
		</h1>
		<p class="mb-8 text-center text-gray-600 dark:text-gray-400">
			{m.swift_royal_starling_start_intro()}
		</p>

		<Card class="w-full max-w-md shadow-md" size="lg">
			<div class="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode ===
					'sign_up'
						? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white'
						: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}"
					onclick={() => (mode = 'sign_up')}
				>
					{m.warm_kind_swallow_start_tab_create_account()}
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode ===
					'sign_in'
						? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white'
						: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}"
					onclick={() => (mode = 'sign_in')}
				>
					{m.cool_brisk_nuthatch_start_tab_sign_in()}
				</button>
			</div>

			{#if mode === 'sign_up'}
				<form class="flex flex-col gap-4" method="post" action="?/sign_up_email" use:enhance>
					<input type="hidden" name="redirectTo" value={form?.redirect_to ?? data.redirect_to} />
					<div>
						<Label class="mb-2 block">{m.foggy_keen_mink_auth_field_name()}</Label>
						<Input
							type="text"
							name="name"
							autocomplete="name"
							required
							placeholder={m.warm_soft_carp_auth_ph_name()}
						/>
					</div>
					<div>
						<Label class="mb-2 block">{m.crisp_sunny_ant_auth_field_email()}</Label>
						<Input
							type="email"
							name="email"
							autocomplete="email"
							required
							placeholder={m.sour_grassy_elk_auth_ph_email()}
						/>
					</div>
					<div>
						<Label class="mb-2 block">{m.bold_stale_cod_auth_field_password()}</Label>
						<Input
							type="password"
							name="password"
							autocomplete="new-password"
							required
							minlength={8}
							placeholder={m.vast_odd_mink_auth_ph_pw_new()}
						/>
					</div>
					<Button type="submit" class="w-full" color="primary"
						>{m.jolly_tiny_newt_auth_submit_register()}</Button
					>
				</form>
			{:else}
				<form class="flex flex-col gap-4" method="post" action="?/sign_in_email" use:enhance>
					<input type="hidden" name="redirectTo" value={form?.redirect_to ?? data.redirect_to} />
					<div>
						<Label class="mb-2 block">{m.crisp_sunny_ant_auth_field_email()}</Label>
						<Input
							type="email"
							name="email"
							autocomplete="email"
							required
							placeholder={m.sour_grassy_elk_auth_ph_email()}
						/>
					</div>
					<div>
						<Label class="mb-2 block">{m.bold_stale_cod_auth_field_password()}</Label>
						<Input
							type="password"
							name="password"
							autocomplete="current-password"
							required
							placeholder={m.deep_lofty_hare_auth_ph_pw_in()}
						/>
					</div>
					<Button type="submit" class="w-full" color="primary"
						>{m.calm_proof_gull_auth_submit_login()}</Button
					>
				</form>
			{/if}

			{#if form?.message}
				<p class="mt-4 text-center text-sm text-red-600 dark:text-red-400" role="alert">
					{form.message}
				</p>
			{/if}
		</Card>
	</div>
</div>
