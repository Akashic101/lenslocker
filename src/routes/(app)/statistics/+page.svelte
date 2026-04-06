<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- paraglide localizeHref */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ApexOptions } from 'apexcharts';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	type gallery_stats = PageData['stats'];

	let { data } = $props();

	const stats = $derived(data.stats);

	function go_to_upload(): void {
		void goto(localizeHref(resolve('/upload')));
	}

	function format_bytes_human(byte_size: number): string {
		if (byte_size < 1024) return `${byte_size} B`;
		if (byte_size < 1024 ** 2) return `${(byte_size / 1024).toFixed(1)} KB`;
		if (byte_size < 1024 ** 3) return `${(byte_size / 1024 ** 2).toFixed(1)} MB`;
		return `${(byte_size / 1024 ** 3).toFixed(2)} GB`;
	}

	function build_gallery_archived_starred_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: {
				type: 'donut',
				width: '100%',
				height: 300,
				fontFamily: 'inherit',
				toolbar: { show: false },
				redrawOnWindowResize: true,
				redrawOnParentResize: true
			},
			labels: s.gallery_archived_starred.labels,
			series: s.gallery_archived_starred.series,
			legend: { position: 'bottom' },
			colors: ['#10b981', '#f59e0b', '#94a3b8'],
			dataLabels: { enabled: true },
			plotOptions: {
				pie: {
					donut: {
						size: '70%',
						labels: {
							show: true,
							name: { show: true },
							value: { show: true },
							total: {
								show: true,
								label: m.zesty_polite_goat_chart_sum_label(),
								formatter: () => String(s.kpis.total)
							}
						}
					}
				}
			},
			stroke: { width: 0 },
			tooltip: {
				y: {
					formatter: (val: number) => m.weary_stout_robin_chart_tip_photos({ val: String(val) })
				}
			}
		};
	}

	function build_gps_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: {
				type: 'donut',
				width: '100%',
				height: 300,
				fontFamily: 'inherit',
				toolbar: { show: false },
				redrawOnWindowResize: true,
				redrawOnParentResize: true
			},
			labels: s.gps.labels,
			series: s.gps.series,
			legend: { position: 'bottom' },
			colors: ['#6366f1', '#cbd5e1'],
			dataLabels: { enabled: true },
			plotOptions: {
				pie: {
					donut: {
						size: '70%',
						labels: {
							show: true,
							total: {
								show: true,
								label: m.zesty_polite_goat_chart_sum_label(),
								formatter: () => String(s.kpis.total)
							}
						}
					}
				}
			},
			stroke: { width: 0 },
			tooltip: {
				y: {
					formatter: (val: number) => m.weary_stout_robin_chart_tip_photos({ val: String(val) })
				}
			}
		};
	}

	function build_uploads_by_month_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: {
				type: 'bar',
				width: '100%',
				height: 320,
				fontFamily: 'inherit',
				toolbar: { show: false },
				redrawOnWindowResize: true,
				redrawOnParentResize: true
			},
			plotOptions: { bar: { borderRadius: 4, columnWidth: '72%' } },
			series: [
				{ name: m.bumpy_mellow_octopus_monthly_uploads_caption(), data: s.uploads_by_month.series }
			],
			xaxis: {
				categories: s.uploads_by_month.labels,
				labels: { style: { colors: '#6b7280' } }
			},
			yaxis: { labels: { style: { colors: '#6b7280' } } },
			colors: ['#0ea5e9'],
			dataLabels: { enabled: false },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: {
				y: {
					formatter: (val: number) => m.proof_grassy_swan_chart_tip_uploads({ val: String(val) })
				}
			}
		};
	}

	function build_shots_by_capture_week_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: {
				type: 'bar',
				width: '100%',
				height: 360,
				fontFamily: 'inherit',
				toolbar: { show: false },
				redrawOnWindowResize: true,
				redrawOnParentResize: true
			},
			plotOptions: { bar: { borderRadius: 4, columnWidth: '72%' } },
			series: [
				{
					name: m.bold_misty_crow_ring_photos_per_capture_week(),
					data: s.shots_by_capture_week.series
				}
			],
			xaxis: {
				categories: s.shots_by_capture_week.labels,
				labels: {
					rotate: -45,
					hideOverlappingLabels: true,
					style: { colors: '#6b7280' }
				}
			},
			yaxis: { labels: { style: { colors: '#6b7280' } } },
			colors: ['#14b8a6'],
			dataLabels: { enabled: false },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: {
				y: {
					formatter: (val: number) => m.weary_stout_robin_chart_tip_photos({ val: String(val) })
				}
			}
		};
	}

	function build_top_cameras_chart_options(s: gallery_stats): ApexOptions {
		const n = Math.max(s.top_cameras.labels.length, 1);
		return {
			chart: {
				type: 'bar',
				width: '100%',
				height: Math.min(520, 80 + n * 40),
				fontFamily: 'inherit',
				toolbar: { show: false },
				redrawOnWindowResize: true,
				redrawOnParentResize: true
			},
			plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '78%' } },
			series: [{ name: m.funky_quaint_dune_camera_series_caption(), data: s.top_cameras.series }],
			xaxis: {
				categories: s.top_cameras.labels,
				labels: { style: { colors: '#6b7280' } }
			},
			yaxis: { labels: { maxWidth: 220, style: { colors: '#6b7280' } } },
			colors: ['#fe795d'],
			dataLabels: { enabled: true, style: { colors: ['#fff'] } },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: {
				y: {
					formatter: (val: number) => m.weary_stout_robin_chart_tip_photos({ val: String(val) })
				}
			}
		};
	}

	function build_iso_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: {
				type: 'bar',
				width: '100%',
				height: 320,
				fontFamily: 'inherit',
				toolbar: { show: false },
				redrawOnWindowResize: true,
				redrawOnParentResize: true
			},
			plotOptions: { bar: { borderRadius: 4, columnWidth: '72%' } },
			series: [{ name: m.funky_quaint_dune_camera_series_caption(), data: s.iso_buckets.series }],
			xaxis: {
				categories: s.iso_buckets.labels,
				labels: { style: { colors: '#6b7280' } }
			},
			yaxis: { labels: { style: { colors: '#6b7280' } } },
			colors: ['#8b5cf6'],
			dataLabels: { enabled: false },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: {
				y: {
					formatter: (val: number) => m.weary_stout_robin_chart_tip_photos({ val: String(val) })
				}
			}
		};
	}

	const gallery_archived_starred_chart_options = $derived.by(
		(): ApexOptions => build_gallery_archived_starred_chart_options(stats)
	);
	const gps_chart_options = $derived.by((): ApexOptions => build_gps_chart_options(stats));
	const uploads_by_month_chart_options = $derived.by(
		(): ApexOptions => build_uploads_by_month_chart_options(stats)
	);
	const shots_by_capture_week_chart_options = $derived.by(
		(): ApexOptions => build_shots_by_capture_week_chart_options(stats)
	);
	const top_cameras_chart_options = $derived.by(
		(): ApexOptions => build_top_cameras_chart_options(stats)
	);
	const iso_chart_options = $derived.by((): ApexOptions => build_iso_chart_options(stats));

	const show_charts = $derived(stats.kpis.total > 0);
	const show_camera_chart = $derived(stats.top_cameras.labels.length > 0);
	const show_month_chart = $derived(stats.uploads_by_month.labels.length > 0);
	const show_shot_week_chart = $derived(stats.shots_by_capture_week.labels.length > 0);

	const kpi_card_class =
		'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800';
	const chart_card_class =
		'min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';
	const chart_host_class = 'min-w-0 max-w-full';
	const chart_title_class = 'mb-1 text-lg font-semibold text-gray-900 dark:text-white';
	const chart_subtitle_class = 'mb-4 text-sm text-gray-500 dark:text-gray-400';
</script>

<svelte:head>
	<title>{m.proud_tough_oryx_dare_statistics()}</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
		{m.proud_tough_oryx_dare_statistics()}
	</h1>
	<p class="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
		{m.wild_crisp_sheep_renew_library_insights_from_uploads()}
	</p>

	{#if !show_charts}
		<div
			class="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800/50"
			role="status"
		>
			<p class="text-gray-700 dark:text-gray-300">
				{m.proof_new_vole_hint_no_photos_yet_charts()}.
			</p>
			<button
				type="button"
				class="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700"
				onclick={go_to_upload}
			>
				{m.curly_sunny_spider_enrich_to_go_upload()}
			</button>
		</div>
	{:else}
		<div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					{m.lime_flaky_cat_create_total_photos()}
				</p>
				<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
					{stats.kpis.total.toLocaleString()}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					{m.big_round_squid_savor_storage()}
				</p>
				<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
					{format_bytes_human(stats.kpis.total_bytes)}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					{m.cozy_quaint_squid_list_in_gallery()}
				</p>
				<p class="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
					{stats.kpis.active.toLocaleString()}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					{m.safe_home_moose_sing_archived_only()}
				</p>
				<p class="mt-1 text-2xl font-bold text-slate-600 dark:text-slate-300">
					{stats.kpis.archived.toLocaleString()}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					{m.quaint_lazy_gadfly_hike_starred()}
				</p>
				<p class="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
					{stats.kpis.starred.toLocaleString()}
				</p>
			</div>
		</div>

		<div class="mt-10 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
			<div class={chart_card_class}>
				<h2 class={chart_title_class}>
					{m.stale_grand_mantis_glow_gallery_vs_archived_vs_starred()}
				</h2>
				<div class={chart_host_class}>
					<Chart
						options={gallery_archived_starred_chart_options}
						class="min-h-[300px] w-full max-w-full"
					/>
				</div>
			</div>

			<div class={chart_card_class}>
				<h2 class={chart_title_class}>{m.cool_sunny_bat_imagine_geotagging()}</h2>
				<p class={chart_subtitle_class}>
					{m.jumpy_calm_bee_feast_photos_with_both_latitude_and_longitude()}.
				</p>
				<div class={chart_host_class}>
					<Chart options={gps_chart_options} class="min-h-[300px] w-full max-w-full" />
				</div>
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>{m.wacky_male_sloth_slide_uploads_by_month()}</h2>
				<p class={chart_subtitle_class}>
					{m.extra_grassy_mouse_wish_when_files_were_added()}
				</p>
				{#if show_month_chart}
					<div class={chart_host_class}>
						<Chart
							options={uploads_by_month_chart_options}
							class="min-h-[320px] w-full max-w-full"
						/>
					</div>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{m.chunky_least_pig_persist_no_monthly_upload_data_to_plot()}.
					</p>
				{/if}
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>{m.swift_kind_goose_lift_photos_by_capture_week()}</h2>
				<p class={chart_subtitle_class}>{m.tidy_bright_hawk_nest_iso_week_from_exif()}</p>
				{#if show_shot_week_chart}
					<div class={chart_host_class}>
						<Chart
							options={shots_by_capture_week_chart_options}
							class="min-h-[360px] w-full max-w-full"
						/>
					</div>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{m.empty_wise_eagle_skip_no_shot_week_chart()}.
					</p>
				{/if}
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>{m.weird_bright_tiger_splash_top_camera_bodies()}</h2>
				<p class={chart_subtitle_class}>{m.bad_antsy_eagle_kick_most_common_make_model()}.</p>
				{#if show_camera_chart}
					<div class={chart_host_class}>
						<Chart options={top_cameras_chart_options} class="w-full max-w-full" />
					</div>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{m.weird_short_moth_gasp_no_camera_make_model_metadata()}.
					</p>
				{/if}
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>{m.game_vexed_jackal_assure_iso_speed()}</h2>
				<p class={chart_subtitle_class}>{m.free_round_hound_yell_distribution_of_iso_values()}.</p>
				<div class={chart_host_class}>
					<Chart options={iso_chart_options} class="min-h-[320px] w-full max-w-full" />
				</div>
			</div>
		</div>
	{/if}
</div>
