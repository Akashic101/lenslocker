<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- paraglide localizeHref */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ApexOptions } from 'apexcharts';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import type { PageData } from './$types';

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
			chart: { type: 'donut', height: 300, fontFamily: 'inherit', toolbar: { show: false } },
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
								label: 'Total',
								formatter: () => String(s.kpis.total)
							}
						}
					}
				}
			},
			stroke: { width: 0 },
			tooltip: { y: { formatter: (val: number) => `${val} photos` } }
		};
	}

	function build_gps_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: { type: 'donut', height: 300, fontFamily: 'inherit', toolbar: { show: false } },
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
								label: 'Total',
								formatter: () => String(s.kpis.total)
							}
						}
					}
				}
			},
			stroke: { width: 0 },
			tooltip: { y: { formatter: (val: number) => `${val} photos` } }
		};
	}

	function build_uploads_by_month_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: { type: 'bar', height: 320, fontFamily: 'inherit', toolbar: { show: false } },
			plotOptions: { bar: { borderRadius: 4, columnWidth: '72%' } },
			series: [{ name: 'Uploads', data: s.uploads_by_month.series }],
			xaxis: {
				categories: s.uploads_by_month.labels,
				labels: { style: { colors: '#6b7280' } }
			},
			yaxis: { labels: { style: { colors: '#6b7280' } } },
			colors: ['#0ea5e9'],
			dataLabels: { enabled: false },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: { y: { formatter: (val: number) => `${val} uploads` } }
		};
	}

	function build_top_cameras_chart_options(s: gallery_stats): ApexOptions {
		const n = Math.max(s.top_cameras.labels.length, 1);
		return {
			chart: {
				type: 'bar',
				height: Math.min(520, 80 + n * 40),
				fontFamily: 'inherit',
				toolbar: { show: false }
			},
			plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '78%' } },
			series: [{ name: 'Photos', data: s.top_cameras.series }],
			xaxis: {
				categories: s.top_cameras.labels,
				labels: { style: { colors: '#6b7280' } }
			},
			yaxis: { labels: { maxWidth: 220, style: { colors: '#6b7280' } } },
			colors: ['#fe795d'],
			dataLabels: { enabled: true, style: { colors: ['#fff'] } },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: { y: { formatter: (val: number) => `${val} photos` } }
		};
	}

	function build_iso_chart_options(s: gallery_stats): ApexOptions {
		return {
			chart: { type: 'bar', height: 320, fontFamily: 'inherit', toolbar: { show: false } },
			plotOptions: { bar: { borderRadius: 4, columnWidth: '72%' } },
			series: [{ name: 'Photos', data: s.iso_buckets.series }],
			xaxis: {
				categories: s.iso_buckets.labels,
				labels: { style: { colors: '#6b7280' } }
			},
			yaxis: { labels: { style: { colors: '#6b7280' } } },
			colors: ['#8b5cf6'],
			dataLabels: { enabled: false },
			grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
			tooltip: { y: { formatter: (val: number) => `${val} photos` } }
		};
	}

	const gallery_archived_starred_chart_options = $derived.by(
		(): ApexOptions => build_gallery_archived_starred_chart_options(stats)
	);
	const gps_chart_options = $derived.by((): ApexOptions => build_gps_chart_options(stats));
	const uploads_by_month_chart_options = $derived.by(
		(): ApexOptions => build_uploads_by_month_chart_options(stats)
	);
	const top_cameras_chart_options = $derived.by(
		(): ApexOptions => build_top_cameras_chart_options(stats)
	);
	const iso_chart_options = $derived.by((): ApexOptions => build_iso_chart_options(stats));

	const show_charts = $derived(stats.kpis.total > 0);
	const show_camera_chart = $derived(stats.top_cameras.labels.length > 0);
	const show_month_chart = $derived(stats.uploads_by_month.labels.length > 0);

	const kpi_card_class =
		'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800';
	const chart_card_class =
		'rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';
	const chart_title_class = 'mb-1 text-lg font-semibold text-gray-900 dark:text-white';
	const chart_subtitle_class = 'mb-4 text-sm text-gray-500 dark:text-gray-400';
</script>

<svelte:head>
	<title>Statistics</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Statistics</h1>
	<p class="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
		Library insights from your uploads: storage, gallery vs archive vs starred, upload history,
		cameras, ISO, and GPS coverage.
	</p>

	{#if !show_charts}
		<div
			class="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800/50"
			role="status"
		>
			<p class="text-gray-700 dark:text-gray-300">No photos yet. Upload some to see charts here.</p>
			<button
				type="button"
				class="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700"
				onclick={go_to_upload}
			>
				Go to upload
			</button>
		</div>
	{:else}
		<div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Total photos
				</p>
				<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
					{stats.kpis.total.toLocaleString()}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Storage
				</p>
				<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
					{format_bytes_human(stats.kpis.total_bytes)}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					In gallery
				</p>
				<p class="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
					{stats.kpis.active.toLocaleString()}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Archived
				</p>
				<p class="mt-1 text-2xl font-bold text-slate-600 dark:text-slate-300">
					{stats.kpis.archived.toLocaleString()}
				</p>
			</div>
			<div class={kpi_card_class}>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Starred
				</p>
				<p class="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
					{stats.kpis.starred.toLocaleString()}
				</p>
			</div>
		</div>

		<div class="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
			<div class={chart_card_class}>
				<h2 class={chart_title_class}>Gallery vs archived vs starred</h2>
				<Chart options={gallery_archived_starred_chart_options} class="min-h-[300px] w-full" />
			</div>

			<div class={chart_card_class}>
				<h2 class={chart_title_class}>Geotagging</h2>
				<p class={chart_subtitle_class}>Photos with both latitude and longitude in metadata.</p>
				<Chart options={gps_chart_options} class="min-h-[300px] w-full" />
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>Uploads by month</h2>
				<p class={chart_subtitle_class}>
					When files were added (last ~36 months, or full history if none in that window). Times are
					UTC.
				</p>
				{#if show_month_chart}
					<Chart options={uploads_by_month_chart_options} class="min-h-[320px] w-full" />
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">No monthly upload data to plot.</p>
				{/if}
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>Top camera bodies</h2>
				<p class={chart_subtitle_class}>Most common make + model from EXIF (top 10).</p>
				{#if show_camera_chart}
					<Chart options={top_cameras_chart_options} class="w-full" />
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">No camera make/model metadata yet.</p>
				{/if}
			</div>

			<div class={chart_card_class + ' lg:col-span-2'}>
				<h2 class={chart_title_class}>ISO speed</h2>
				<p class={chart_subtitle_class}>Distribution of ISO values (or unknown when missing).</p>
				<Chart options={iso_chart_options} class="min-h-[320px] w-full" />
			</div>
		</div>
	{/if}
</div>
