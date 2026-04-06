<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Modal } from 'flowbite-svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { app_form_field_class } from '$lib/ui/form_classes';

	type share_link_row = {
		id: string;
		token: string;
		expires_at_ms: number | null;
		created_at_ms: number;
		expired: boolean;
	};

	let {
		open = $bindable(false),
		kind,
		album_id = null,
		raw_upload_id = null
	}: {
		open: boolean;
		kind: 'album' | 'raw_upload';
		album_id?: string | null;
		raw_upload_id?: string | null;
	} = $props();

	let expires_local = $state('');
	let create_loading = $state(false);
	let create_error = $state<string | null>(null);
	let copy_feedback = $state<string | null>(null);

	let existing_links = $state<share_link_row[]>([]);
	let list_loading = $state(false);
	let panel_error = $state<string | null>(null);
	let deleting_id = $state<string | null>(null);
	let list_request_generation = 0;

	function full_share_url(token: string): string {
		if (!browser) return '';
		const href = resolve(`/share/${token}`);
		return `${window.location.origin}${href}`;
	}

	function format_expires(row: share_link_row): string {
		if (row.expires_at_ms == null) return m.next_stout_alpaca_share_no_deadline();
		return new Date(row.expires_at_ms).toLocaleString();
	}

	function format_created_at(row: share_link_row): string {
		return new Date(row.created_at_ms).toLocaleString();
	}

	async function load_existing_links(): Promise<void> {
		if (kind === 'album' && (album_id == null || album_id === '')) {
			existing_links = [];
			return;
		}
		if (kind === 'raw_upload' && (raw_upload_id == null || raw_upload_id === '')) {
			existing_links = [];
			return;
		}

		const gen = list_request_generation;
		list_loading = true;
		panel_error = null;
		try {
			const q =
				kind === 'album'
					? `album_id=${encodeURIComponent(album_id!)}`
					: `raw_upload_id=${encodeURIComponent(raw_upload_id!)}`;
			const response = await fetch(resolve(`/api/share/list?${q}`));
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const payload = (await response.json()) as { links: share_link_row[] };
			if (gen !== list_request_generation) return;
			existing_links = payload.links;
		} catch (e) {
			if (gen !== list_request_generation) return;
			panel_error = e instanceof Error ? e.message : String(e);
			existing_links = [];
		} finally {
			if (gen === list_request_generation) {
				list_loading = false;
			}
		}
	}

	async function copy_link_token(token: string): Promise<void> {
		if (!browser) return;
		copy_feedback = null;
		try {
			await navigator.clipboard.writeText(full_share_url(token));
			copy_feedback = m.teal_grassy_boar_share_clipboard_ok();
		} catch {
			copy_feedback = m.icy_proof_eagle_share_clipboard_fail();
		}
	}

	async function delete_link(link_id: string): Promise<void> {
		deleting_id = link_id;
		panel_error = null;
		try {
			const response = await fetch(resolve(`/api/share/link/${link_id}`), { method: 'DELETE' });
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			await load_existing_links();
		} catch (e) {
			panel_error = e instanceof Error ? e.message : String(e);
		} finally {
			deleting_id = null;
		}
	}

	function reset_share_panel_state(): void {
		list_request_generation += 1;
		expires_local = '';
		create_error = null;
		copy_feedback = null;
		panel_error = null;
		existing_links = [];
		list_loading = false;
		deleting_id = null;
	}

	function on_share_modal_toggle(ev: ToggleEvent): void {
		if (ev.newState === 'closed') {
			reset_share_panel_state();
		}
	}

	async function create_link(): Promise<void> {
		create_loading = true;
		create_error = null;
		copy_feedback = null;
		try {
			let expires_at_ms: number | null = null;
			if (expires_local.trim() !== '') {
				const ms = new Date(expires_local).getTime();
				if (!Number.isFinite(ms) || ms <= Date.now()) {
					create_error = m.round_steep_hare_share_bad_end_date();
					return;
				}
				expires_at_ms = ms;
			}
			const body =
				kind === 'album'
					? { kind: 'album' as const, album_id, raw_upload_id: null, expires_at_ms }
					: { kind: 'raw_upload' as const, album_id: null, raw_upload_id, expires_at_ms };
			const response = await fetch(resolve('/api/share'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || response.statusText);
			}
			const payload = (await response.json()) as { token: string };
			expires_local = '';
			await load_existing_links();
			if (browser) {
				try {
					await navigator.clipboard.writeText(full_share_url(payload.token));
					copy_feedback = m.teal_grassy_boar_share_clipboard_ok();
				} catch {
					copy_feedback = m.icy_proof_eagle_share_clipboard_fail();
				}
			}
		} catch (e) {
			create_error = e instanceof Error ? e.message : String(e);
		} finally {
			create_loading = false;
		}
	}

	$effect(() => {
		if (!open) return;
		void load_existing_links();
	});
</script>

<Modal
	bind:open
	size="lg"
	autoclose={false}
	outsideclose
	ontoggle={on_share_modal_toggle}
	classes={{
		header: '!py-3 !px-4 !border-b !border-gray-200 dark:!border-gray-700',
		body: '!p-4'
	}}
>
	{#snippet header()}
		<p class="text-base font-semibold text-gray-900 dark:text-white">
			{m.vivid_flat_marten_share_sheet_title()}
		</p>
	{/snippet}
	<div class="space-y-5 text-sm text-gray-700 dark:text-gray-300">
		<p class="text-xs text-gray-500 dark:text-gray-400">
			{m.ornate_merry_quail_share_reader_note()}
		</p>

		<div>
			<p
				class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
			>
				{m.beefy_small_yak_share_prior_urls()}
			</p>
			{#if list_loading}
				<p class="text-xs text-gray-500 dark:text-gray-400">
					{m.proof_grand_duck_share_fetching()}
				</p>
			{:else if panel_error != null}
				<p class="text-sm text-red-600 dark:text-red-400" role="alert">{panel_error}</p>
			{:else if existing_links.length === 0}
				<p class="text-xs text-gray-500 dark:text-gray-400">
					{m.gaudy_short_bison_share_empty_list()}
				</p>
			{:else}
				<ul class="max-h-56 space-y-2 overflow-y-auto pr-1">
					{#each existing_links as row (row.id)}
						<li
							class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
						>
							<div class="flex flex-wrap items-start justify-between gap-2">
								<div class="min-w-0 flex-1 space-y-1">
									<p class="font-mono text-[11px] break-all text-gray-800 dark:text-gray-100">
										{full_share_url(row.token)}
									</p>
									<p class="text-[11px] text-gray-500 dark:text-gray-400">
										{m.wide_quiet_cow_share_birth_heading()}: {format_created_at(row)}
									</p>
									<p class="text-[11px] text-gray-500 dark:text-gray-400">
										{m.fancy_royal_gibbon_share_deadline_heading()}: {format_expires(row)}
										{#if row.expired}
											<span
												class="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
											>
												{m.cool_sunny_mink_share_late_badge()}
											</span>
										{/if}
									</p>
								</div>
								<div class="flex shrink-0 flex-col gap-1 sm:flex-row">
									<button
										type="button"
										class="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
										onclick={() => void copy_link_token(row.token)}
									>
										{m.chunky_cuddly_bat_share_clipboard()}
									</button>
									<button
										type="button"
										class="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/40"
										disabled={deleting_id === row.id}
										onclick={() => void delete_link(row.id)}
										aria-label={m.wild_khaki_ibex_share_remove_hint()}
									>
										{deleting_id === row.id
											? m.main_mellow_pika_share_removing()
											: m.flat_wacky_otter_share_remove()}
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
			<p
				class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
			>
				{m.best_antsy_ray_share_fresh_section()}
			</p>
			<div>
				<label
					for="share-expires"
					class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
				>
					{m.dry_quaint_sloth_share_end_date_label()}
				</label>
				<input
					id="share-expires"
					type="datetime-local"
					class={app_form_field_class}
					bind:value={expires_local}
				/>
				<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
					{m.pink_bold_wren_share_end_date_hint()}
				</p>
			</div>

			{#if create_error != null}
				<p class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{create_error}</p>
			{/if}

			<button
				type="button"
				class="mt-3 w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
				disabled={create_loading}
				onclick={() => void create_link()}
			>
				{create_loading ? m.moody_wide_lark_share_making() : m.sour_tidy_gecko_share_make_button()}
			</button>
			{#if copy_feedback != null}
				<p class="mt-2 text-center text-xs text-gray-600 dark:text-gray-400">{copy_feedback}</p>
			{/if}
		</div>
	</div>
</Modal>
