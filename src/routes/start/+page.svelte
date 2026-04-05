<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label } from 'flowbite-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let mode = $state<'sign_in' | 'sign_up'>('sign_up');
</script>

<div
	class="flex min-h-svh flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900"
>
	<div class="w-full max-w-md">
		<h1 class="mb-2 text-center text-2xl font-semibold text-gray-900 dark:text-white">
			LensLocker
		</h1>
		<p class="mb-8 text-center text-gray-600 dark:text-gray-400">
			Sign in to manage your library, or create an account to get started.
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
					Create account
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode ===
					'sign_in'
						? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white'
						: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}"
					onclick={() => (mode = 'sign_in')}
				>
					Sign in
				</button>
			</div>

			{#if mode === 'sign_up'}
				<form class="flex flex-col gap-4" method="post" action="?/sign_up_email" use:enhance>
					<input type="hidden" name="redirectTo" value={form?.redirect_to ?? data.redirect_to} />
					<div>
						<Label class="mb-2 block">Name</Label>
						<Input type="text" name="name" autocomplete="name" required placeholder="Your name" />
					</div>
					<div>
						<Label class="mb-2 block">Email</Label>
						<Input
							type="email"
							name="email"
							autocomplete="email"
							required
							placeholder="you@example.com"
						/>
					</div>
					<div>
						<Label class="mb-2 block">Password</Label>
						<Input
							type="password"
							name="password"
							autocomplete="new-password"
							required
							minlength={8}
							placeholder="At least 8 characters"
						/>
					</div>
					<Button type="submit" class="w-full" color="primary">Create account</Button>
				</form>
			{:else}
				<form class="flex flex-col gap-4" method="post" action="?/sign_in_email" use:enhance>
					<input type="hidden" name="redirectTo" value={form?.redirect_to ?? data.redirect_to} />
					<div>
						<Label class="mb-2 block">Email</Label>
						<Input
							type="email"
							name="email"
							autocomplete="email"
							required
							placeholder="you@example.com"
						/>
					</div>
					<div>
						<Label class="mb-2 block">Password</Label>
						<Input
							type="password"
							name="password"
							autocomplete="current-password"
							required
							placeholder="Password"
						/>
					</div>
					<Button type="submit" class="w-full" color="primary">Sign in</Button>
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
