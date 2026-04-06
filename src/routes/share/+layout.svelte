<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-svh bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
	{@render children()}
</div>
