<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '$lib/paraglide/messages.js';

	let { form, data } = $props();

	type hardware_row = (typeof data.items)[number];

	function hardware_category_label(category: string): string {
		switch (category) {
			case 'camera':
				return m.orange_hour_ant_surge_camera();
			case 'lens':
				return m.any_misty_mallard_commend_lens();
			case 'accessory':
				return m.inclusive_front_florian_tap_accessory();
			case 'other':
				return m.whole_main_beaver_dart_other();
			default:
				return category;
		}
	}

	let editing_item = $state<hardware_row | null>(null);

	/** Bound fields so model dropdown options can narrow by make (EXIF pairs from uploads). */
	let form_category = $state('camera');
	let form_make = $state('');
	let form_model = $state('');

	$effect(() => {
		const row = editing_item;
		if (row) {
			form_category = row.category;
			form_make = row.make ?? '';
			form_model = row.model ?? '';
		} else {
			form_category = 'camera';
			form_make = '';
			form_model = '';
		}
	});

	const suggested_camera_models = $derived.by(() => {
		const all = data.from_photos.camera_models;
		if (form_category !== 'camera') return all;
		const make_lc = form_make.trim().toLowerCase();
		if (make_lc === '') return all;
		const narrowed = [
			...new Set(
				data.from_photos.camera_pairs
					.filter((p) => (p.make ?? '').trim().toLowerCase() === make_lc)
					.map((p) => p.model)
			)
		].sort((a, b) => a.localeCompare(b));
		return narrowed.length > 0 ? narrowed : all;
	});

	const suggested_lens_models = $derived.by(() => {
		const all = data.from_photos.lens_models;
		if (form_category !== 'lens') return all;
		const make_lc = form_make.trim().toLowerCase();
		if (make_lc === '') return all;
		const narrowed = [
			...new Set(
				data.from_photos.lens_pairs
					.filter((p) => (p.make ?? '').trim().toLowerCase() === make_lc)
					.map((p) => p.model)
			)
		].sort((a, b) => a.localeCompare(b));
		return narrowed.length > 0 ? narrowed : all;
	});

	const camera_make_choices = $derived.by(() => {
		const base = [...data.from_photos.camera_makes];
		const f = form_make.trim();
		if (form_category === 'camera' && f !== '' && !base.includes(f)) base.push(f);
		return base.sort((a, b) => a.localeCompare(b));
	});

	const camera_model_choices = $derived.by(() => {
		const base = [...suggested_camera_models];
		const f = form_model.trim();
		if (form_category === 'camera' && f !== '' && !base.includes(f)) base.push(f);
		return base.sort((a, b) => a.localeCompare(b));
	});

	const lens_make_choices = $derived.by(() => {
		const base = [...data.from_photos.lens_makes];
		const f = form_make.trim();
		if (form_category === 'lens' && f !== '' && !base.includes(f)) base.push(f);
		return base.sort((a, b) => a.localeCompare(b));
	});

	const lens_model_choices = $derived.by(() => {
		const base = [...suggested_lens_models];
		const f = form_model.trim();
		if (form_category === 'lens' && f !== '' && !base.includes(f)) base.push(f);
		return base.sort((a, b) => a.localeCompare(b));
	});

	const field_control_class =
		'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

	function on_category_change() {
		if (editing_item == null) {
			form_make = '';
			form_model = '';
		}
	}

	function start_edit(item: hardware_row) {
		editing_item = item;
	}

	function clear_edit() {
		editing_item = null;
	}

	function acquired_date_input_value(item: hardware_row): string {
		if (item.acquired_at_ms == null) return '';
		const d = new Date(item.acquired_at_ms);
		return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
	}
</script>

<svelte:head>
	<title>{m.wise_keen_beaver_savor_hardware()}</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
		{m.wise_keen_beaver_savor_hardware()}
	</h1>
	<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
		{m.proud_novel_octopus_zap_track_cameras_lenses_gear()}
	</p>

	{#if form?.message}
		<p
			class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
			role="alert"
		>
			{form.message}
		</p>
	{/if}

	<section
		class="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<h2 class="text-sm font-semibold text-gray-900 dark:text-white">
			{editing_item
				? m.calm_quick_heron_name_hardware_edit_item()
				: m.still_fresh_bison_label_hardware_add_item()}
		</h2>
		<form
			method="POST"
			action="?/save"
			class="mt-4 space-y-3"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') clear_edit();
				};
			}}
		>
			<input type="hidden" name="id" value={editing_item?.id ?? ''} />
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label
						for="hw-category"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
						>{m.every_green_thrush_tag_category()}</label
					>
					<select
						id="hw-category"
						name="category"
						required
						class={field_control_class}
						bind:value={form_category}
						onchange={on_category_change}
					>
						<option value="camera">{m.orange_hour_ant_surge_camera()}</option>
						<option value="lens">{m.any_misty_mallard_commend_lens()}</option>
						<option value="accessory">{m.inclusive_front_florian_tap_accessory()}</option>
						<option value="other">{m.whole_main_beaver_dart_other()}</option>
					</select>
				</div>
				<div>
					<label
						for="hw-make"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
						>{m.loud_pretty_moose_tag_make()}</label
					>
					{#if form_category === 'camera' && data.from_photos.camera_makes.length > 0}
						<select id="hw-make" name="make" class={field_control_class} bind:value={form_make}>
							<option value="" placeholder={m.home_crazy_cow_endure_optional()}></option>
							{#each camera_make_choices as make_option (make_option)}
								<option value={make_option}>{make_option}</option>
							{/each}
						</select>
					{:else if form_category === 'lens' && data.from_photos.lens_makes.length > 0}
						<select id="hw-make" name="make" class={field_control_class} bind:value={form_make}>
							<option value="" placeholder={m.home_crazy_cow_endure_optional()}></option>
							{#each lens_make_choices as make_option (make_option)}
								<option value={make_option}>{make_option}</option>
							{/each}
						</select>
					{:else}
						<input
							id="hw-make"
							name="make"
							type="text"
							autocomplete="off"
							class={field_control_class}
							bind:value={form_make}
						/>
					{/if}
				</div>
				<div>
					<label
						for="hw-model"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
						>{m.crisp_key_owl_tag_model()}</label
					>
					{#if form_category === 'camera' && data.from_photos.camera_models.length > 0}
						<select
							id="hw-model"
							name="model"
							required
							class={field_control_class}
							bind:value={form_model}
						>
							<option value="" disabled>— {m.basic_noble_marten_pride_choose_model()} —</option>
							{#each camera_model_choices as model_option (model_option)}
								<option value={model_option}>{model_option}</option>
							{/each}
						</select>
					{:else if form_category === 'lens' && data.from_photos.lens_models.length > 0}
						<select
							id="hw-model"
							name="model"
							required
							class={field_control_class}
							bind:value={form_model}
						>
							<option value="" disabled>— {m.basic_noble_marten_pride_choose_model()} —</option>
							{#each lens_model_choices as model_option (model_option)}
								<option value={model_option}>{model_option}</option>
							{/each}
						</select>
					{:else}
						<input
							id="hw-model"
							name="model"
							type="text"
							required
							autocomplete="off"
							class={field_control_class}
							bind:value={form_model}
						/>
					{/if}
				</div>
				<div>
					<label
						for="hw-mount"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
						>{m.slimy_sad_firefox_stop_mount_type()}</label
					>
					<input
						id="hw-mount"
						name="mount"
						type="text"
						autocomplete="off"
						placeholder={m.mild_tidy_raven_placeholder_mount()}
						class="{field_control_class} placeholder:text-gray-400 dark:placeholder:text-gray-500"
						value={editing_item?.mount ?? ''}
					/>
				</div>
				<div>
					<label
						for="hw-serial"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
						>{m.big_topical_scallop_build_serial_number()}</label
					>
					<input
						id="hw-serial"
						name="serial_number"
						type="text"
						autocomplete="off"
						class={field_control_class}
						value={editing_item?.serial_number ?? ''}
					/>
				</div>
				<div>
					<label
						for="hw-acquired"
						class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
						>{m.neat_sleek_puffin_pride_acuired()}</label
					>
					<input
						id="hw-acquired"
						name="acquired_at"
						type="date"
						class={field_control_class}
						value={editing_item ? acquired_date_input_value(editing_item) : ''}
					/>
				</div>
			</div>
			<div>
				<label
					for="hw-notes"
					class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
					>{m.soft_gray_cat_tag_notes()}</label
				>
				<textarea
					id="hw-notes"
					name="notes"
					rows="2"
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
					>{editing_item?.notes ?? ''}</textarea
				>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					type="submit"
					class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
				>
					{editing_item
						? m.bold_calm_koala_save_changes()
						: m.still_fresh_bison_label_hardware_add_item()}
				</button>
				{#if editing_item}
					<button
						type="button"
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
						onclick={() => clear_edit()}
					>
						{m.mellow_livid_jaguar_read_cancel_edit()}
					</button>
				{/if}
			</div>
		</form>
	</section>

	<section class="mt-10">
		<h2 class="text-sm font-semibold text-gray-900 dark:text-white">
			{m.away_green_martin_advise_your_gear()}
		</h2>
		{#if data.items.length === 0}
			<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
				{m.royal_long_gibbon_exhale_no_items_yet()}
			</p>
		{:else}
			<div class="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
				<table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-800/80">
						<tr>
							<th
								class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
								>{m.broad_maroon_shrimp_roam_type()}</th
							>
							<th
								class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
								>{m.honest_jumpy_polecat_scold_make_mode()}</th
							>
							<th
								class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
								>{m.close_ornate_ostrich_ask_mount()}</th
							>
							<th
								class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
								>{m.game_that_skate_blend_serial()}</th
							>
							<th
								class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
								>{m.tasty_sad_alligator_pull_actions()}</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.items as item (item.id)}
							<tr>
								<td class="px-3 py-2 text-gray-800 dark:text-gray-200">
									{hardware_category_label(item.category)}
								</td>
								<td class="px-3 py-2 text-gray-800 dark:text-gray-200">
									<span class="font-medium"
										>{item.make ?? m.flat_moody_gull_detail_empty_dash()}</span
									>
									<span class="text-gray-500 dark:text-gray-400"> · {item.model}</span>
									{#if item.notes}
										<p class="mt-0.5 text-xs wrap-break-word text-gray-500 dark:text-gray-400">
											{item.notes}
										</p>
									{/if}
								</td>
								<td class="px-3 py-2 text-gray-600 dark:text-gray-300">
									{item.mount ?? m.flat_moody_gull_detail_empty_dash()}
								</td>
								<td class="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
									{item.serial_number ?? m.flat_moody_gull_detail_empty_dash()}
								</td>
								<td class="px-3 py-2 text-right">
									<div class="flex items-center justify-end gap-2">
										<button
											type="button"
											class="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
											onclick={() => start_edit(item)}
										>
											{m.long_tense_ray_read_edit()}
										</button>
										<form
											method="POST"
											action="?/delete"
											use:enhance
											class="m-0 inline-flex items-center p-0"
										>
											<input type="hidden" name="id" value={item.id} />
											<button
												type="submit"
												class="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
											>
												{m.fit_brief_hedgehog_pout_delete()}
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
