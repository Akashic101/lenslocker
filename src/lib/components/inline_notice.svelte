<script lang="ts">
	import type { Snippet } from 'svelte';

	type inline_notice_variant = 'error' | 'success' | 'info';
	type inline_notice_density = 'comfortable' | 'compact';
	type inline_notice_layout = 'box' | 'strip';

	let {
		variant,
		message = '',
		prefix,
		density = 'comfortable',
		layout = 'box',
		class: class_name = '',
		children
	}: {
		variant: inline_notice_variant;
		message?: string;
		prefix?: string;
		density?: inline_notice_density;
		layout?: inline_notice_layout;
		class?: string;
		children?: Snippet;
	} = $props();

	const display_text = $derived(prefix != null && prefix !== '' ? `${prefix} ${message}` : message);

	const box_padding_class = $derived(density === 'compact' ? 'px-3 py-2' : 'p-3');

	const variant_box_class = $derived.by(() => {
		const pad = box_padding_class;
		switch (variant) {
			case 'error':
				return `rounded-lg border border-red-200 bg-red-50 ${pad} text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200`;
			case 'success':
				return `rounded-lg border border-green-200 bg-green-50 ${pad} text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200`;
			case 'info':
				return `rounded-lg border border-blue-200 bg-blue-50 ${pad} text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200`;
		}
	});

	const strip_class =
		'shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200';

	const role_attr = $derived(variant === 'error' ? 'alert' : 'status');
</script>

{#if layout === 'strip'}
	<p class="{strip_class} {class_name}" role="alert">
		{#if children}
			{@render children()}
		{:else}
			{display_text}
		{/if}
	</p>
{:else}
	<p class="{variant_box_class} {class_name}" role={role_attr}>
		{#if children}
			{@render children()}
		{:else}
			{display_text}
		{/if}
	</p>
{/if}
