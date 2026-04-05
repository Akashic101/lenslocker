<script lang="ts">
	import { StarSolid } from 'flowbite-svelte-icons';

	const tile_button_class =
		'relative block w-full shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none';

	let {
		src,
		alt,
		starred = false,
		on_tile_click
	}: {
		src: string;
		alt: string;
		starred?: boolean;
		on_tile_click: (e: MouseEvent) => void;
	} = $props();
</script>

<button type="button" class={tile_button_class} onclick={on_tile_click}>
	<img {src} {alt} class="aspect-square w-full object-cover" loading="lazy" decoding="async" />
	{#if starred}
		<span
			class="pointer-events-none absolute top-1 right-1 rounded bg-black/55 p-0.5 text-amber-300"
			aria-hidden="true"
		>
			<StarSolid class="h-3.5 w-3.5" />
		</span>
	{/if}
</button>
