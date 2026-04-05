<script lang="ts">
	import { Modal } from 'flowbite-svelte';
	import { untrack } from 'svelte';
	import InlineNotice from '$lib/components/inline_notice.svelte';
	import { m } from '$lib/paraglide/messages.js';

	type gallery_album_picker_row = { id: string; name: string };

	type album_add_body =
		| { upload_ids: string[]; album_id: string }
		| { upload_ids: string[]; new_album_name: string };

	let {
		open = $bindable(false),
		open_session,
		albums,
		form_field_class,
		selected_upload_ids,
		on_submit
	}: {
		open?: boolean;
		open_session: number;
		albums: gallery_album_picker_row[];
		form_field_class: string;
		selected_upload_ids: string[];
		on_submit: (body: album_add_body) => Promise<void>;
	} = $props();

	let target_mode = $state<'existing' | 'new'>('existing');
	let existing_id = $state('');
	let new_name = $state('');
	let busy = $state(false);
	let error_text = $state<string | null>(null);

	$effect(() => {
		if (!open) return;
		void open_session;
		untrack(() => {
			error_text = null;
			const list = albums;
			if (list.length > 0) {
				target_mode = 'existing';
				existing_id = list[0]!.id;
			} else {
				target_mode = 'new';
				existing_id = '';
			}
			new_name = '';
		});
	});

	const submit_disabled = $derived.by(() => {
		if (busy || selected_upload_ids.length === 0) return true;
		if (target_mode === 'existing' && (albums.length === 0 || existing_id.trim() === '')) {
			return true;
		}
		if (target_mode === 'new' && new_name.trim() === '') return true;
		return false;
	});

	async function on_submit_click(): Promise<void> {
		const ids = [...selected_upload_ids];
		if (ids.length === 0) return;
		if (target_mode === 'new' && new_name.trim() === '') return;
		if (target_mode === 'existing' && existing_id.trim() === '') return;

		busy = true;
		error_text = null;
		try {
			const body: album_add_body =
				target_mode === 'new'
					? { upload_ids: ids, new_album_name: new_name.trim() }
					: { upload_ids: ids, album_id: existing_id.trim() };
			await on_submit(body);
			open = false;
		} catch (e) {
			error_text = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<Modal
	bind:open
	size="md"
	autoclose={false}
	classes={{
		header: '!py-3 !px-4 !border-b !border-gray-200 dark:!border-gray-700',
		body: '!p-4'
	}}
>
	{#snippet header()}
		<p class="text-base font-semibold text-gray-900 dark:text-white">
			{m.jumpy_green_finch_album_add_modal_title()}
		</p>
	{/snippet}
	<div class="space-y-4">
		{#if error_text != null}
			<InlineNotice variant="error" density="compact" message={error_text} />
		{/if}
		<fieldset class="space-y-3">
			<legend class="sr-only">{m.jumpy_green_finch_album_add_modal_title()}</legend>
			<label
				class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
			>
				<input
					type="radio"
					name="gallery_add_album_target_mode"
					value="existing"
					class="border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
					bind:group={target_mode}
					disabled={albums.length === 0}
				/>
				{m.late_mild_crane_album_add_existing_label()}
			</label>
			{#if target_mode === 'existing' && albums.length > 0}
				<select
					class="{form_field_class} ms-6 max-w-md"
					bind:value={existing_id}
					aria-label={m.tight_proud_bass_album_add_select_placeholder()}
				>
					{#each albums as album_option (album_option.id)}
						<option value={album_option.id}>{album_option.name}</option>
					{/each}
				</select>
			{/if}
			<label
				class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
			>
				<input
					type="radio"
					name="gallery_add_album_target_mode"
					value="new"
					class="border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
					bind:group={target_mode}
				/>
				{m.fancy_quaint_newt_album_add_new_label()}
			</label>
			{#if target_mode === 'new'}
				<input
					type="text"
					class="{form_field_class} ms-6 max-w-md"
					placeholder={m.crisp_slow_lark_album_add_name_placeholder()}
					bind:value={new_name}
					maxlength={200}
					autocomplete="off"
				/>
			{/if}
		</fieldset>
		<div class="flex flex-wrap justify-end gap-2 pt-2">
			<button
				type="button"
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
				disabled={busy}
				onclick={() => {
					open = false;
				}}
			>
				{m.low_seemly_crow_slurp_cancel()}
			</button>
			<button
				type="button"
				class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
				disabled={submit_disabled}
				onclick={() => void on_submit_click()}
			>
				{busy ? m.fierce_small_goat_busy_saving() : m.noble_tidy_quail_album_add_submit()}
			</button>
		</div>
	</div>
</Modal>
