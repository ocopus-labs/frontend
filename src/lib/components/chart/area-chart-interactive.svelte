<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { scaleUtc } from 'd3-scale';
	import { Area, AreaChart, ChartClipPath } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import ChartContainer from '../ui/chart/chart-container.svelte';
	import { cubicInOut } from 'svelte/easing';

	let {
		data = [] as Record<string, any>[],
		xKey = 'date',
		series = [] as { key: string; label: string; color: string }[],
		title = 'Area Chart',
		description = '',
		chartConfig = {} as Chart.ChartConfig
	}: {
		data?: Record<string, any>[];
		xKey?: string;
		series?: { key: string; label: string; color: string }[];
		title?: string;
		description?: string;
		chartConfig?: Chart.ChartConfig;
	} = $props();

	let timeRange = $state('90d');

	const selectedLabel = $derived.by(() => {
		switch (timeRange) {
			case '90d':
				return 'Last 3 months';
			case '30d':
				return 'Last 30 days';
			case '7d':
				return 'Last 7 days';
			default:
				return 'Last 3 months';
		}
	});

	const filteredData = $derived(
		data.filter((item) => {
			const dateVal = item[xKey];
			if (!dateVal) return true;
			const itemDate = dateVal instanceof Date ? dateVal : new Date(dateVal);
			const now = new Date();
			let daysToSubtract = 90;
			if (timeRange === '30d') daysToSubtract = 30;
			else if (timeRange === '7d') daysToSubtract = 7;
			const cutoff = new Date(now);
			cutoff.setDate(cutoff.getDate() - daysToSubtract);
			return itemDate >= cutoff;
		})
	);

	// Ensure dates are Date objects for scaleUtc
	const processedData = $derived(
		filteredData.map((d) => ({
			...d,
			[xKey]: d[xKey] instanceof Date ? d[xKey] : new Date(d[xKey])
		}))
	);

	const resolvedConfig = $derived.by(() => {
		if (Object.keys(chartConfig).length > 0) return chartConfig;
		const config: Record<string, { label: string; color: string }> = {};
		for (const s of series) {
			config[s.key] = { label: s.label, color: s.color };
		}
		return config as Chart.ChartConfig;
	});
</script>

{#if data.length > 0 && series.length > 0}
	<Card.Root>
		<Card.Header class="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
			<div class="grid flex-1 gap-1 text-center sm:text-left">
				<Card.Title>{title}</Card.Title>
				{#if description}
					<Card.Description>{description}</Card.Description>
				{/if}
			</div>
			<Select.Root type="single" bind:value={timeRange}>
				<Select.Trigger class="w-[160px] rounded-lg sm:ml-auto" aria-label="Select a value">
					{selectedLabel}
				</Select.Trigger>
				<Select.Content class="rounded-xl">
					<Select.Item value="90d" class="rounded-lg">Last 3 months</Select.Item>
					<Select.Item value="30d" class="rounded-lg">Last 30 days</Select.Item>
					<Select.Item value="7d" class="rounded-lg">Last 7 days</Select.Item>
				</Select.Content>
			</Select.Root>
		</Card.Header>
		<Card.Content>
			<ChartContainer config={resolvedConfig} class="aspect-auto h-[250px] w-full">
				<AreaChart
					legend
					data={processedData}
					x={xKey}
					xScale={scaleUtc()}
					{series}
					seriesLayout="stack"
					props={{
						area: {
							curve: curveNatural,
							'fill-opacity': 0.4,
							line: { class: 'stroke-1' },
							motion: 'tween'
						},
						xAxis: {
							ticks: timeRange === '7d' ? 7 : undefined,
							format: (v: Date) => {
								return v.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric'
								});
							}
						},
						yAxis: { format: () => '' }
					}}
				>
					{#snippet marks({ series: chartSeries, getAreaProps })}
						<defs>
							{#each chartSeries as s (s.key)}
								<linearGradient id="fill-{s.key}" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stop-color="var(--color-{s.key})" stop-opacity={1.0} />
									<stop offset="95%" stop-color="var(--color-{s.key})" stop-opacity={0.1} />
								</linearGradient>
							{/each}
						</defs>
						<ChartClipPath
							initialWidth={0}
							motion={{
								width: { type: 'tween', duration: 1000, easing: cubicInOut }
							}}
						>
							{#each chartSeries as s, i (s.key)}
								<Area {...getAreaProps(s, i)} fill="url(#fill-{s.key})" />
							{/each}
						</ChartClipPath>
					{/snippet}
					{#snippet tooltip()}
						<Chart.Tooltip
							labelFormatter={(v: Date) => {
								return v.toLocaleDateString('en-US', {
									month: 'long',
									day: 'numeric'
								});
							}}
							indicator="line"
						/>
					{/snippet}
				</AreaChart>
			</ChartContainer>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center py-10 text-muted-foreground">
		<p class="text-sm">No data available</p>
	</div>
{/if}
