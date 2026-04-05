<script lang="ts">
	import InlineNotice from '$lib/components/inline_notice.svelte';

	let {
		message,
		prefix
	}: {
		message: string;
		prefix?: string;
	} = $props();
</script>

<InlineNotice variant="error" layout="strip" {message} {prefix} />
