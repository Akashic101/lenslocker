<script lang="ts">
	let {
		input_id,
		accept,
		disabled = false,
		busy = false,
		busy_label,
		idle_label,
		on_change,
		input_el = $bindable<HTMLInputElement | null>(null),
		class: class_name = ''
	}: {
		input_id: string;
		accept: string;
		disabled?: boolean;
		busy?: boolean;
		busy_label: string;
		idle_label: string;
		on_change: (ev: Event) => void;
		input_el?: HTMLInputElement | null;
		class?: string;
	} = $props();

	const input_disabled = $derived(disabled || busy);
</script>

<div class="relative {class_name}">
	<input
		id={input_id}
		bind:this={input_el}
		type="file"
		{accept}
		disabled={input_disabled}
		class="peer sr-only"
		onchange={on_change}
	/>
	<label
		for={input_id}
		class="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
	>
		{busy ? busy_label : idle_label}
	</label>
</div>
