<script lang="ts">
	import { scaleBand } from 'd3-scale';
	import { BarChart, type ChartContextValue } from 'layerchart';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cubicInOut } from 'svelte/easing';

	let {
		data = [] as Record<string, any>[],
		xKey = 'month',
		series = [] as { key: string; label: string; color: string }[],
		title = '',
		description = '',
		footerText = '',
		chartConfig = {} as Chart.ChartConfig
	}: {
		data?: Record<string, any>[];
		xKey?: string;
		series?: { key: string; label: string; color: string }[];
		title?: string;
		description?: string;
		footerText?: string;
		chartConfig?: Chart.ChartConfig;
	} = $props();

	// Build chartConfig from series if not explicitly provided
	const resolvedConfig = $derived.by(() => {
		if (Object.keys(chartConfig).length > 0) return chartConfig;
		const config: Record<string, { label: string; color: string }> = {};
		for (const s of series) {
			config[s.key] = { label: s.label, color: s.color };
		}
		return config as Chart.ChartConfig;
	});

	let context = $state<ChartContextValue>();
</script>

{#if data.length > 0 && series.length > 0}
	{#if title}
		<Card.Root>
			<Card.Header>
				<Card.Title>{title}</Card.Title>
				{#if description}
					<Card.Description>{description}</Card.Description>
				{/if}
			</Card.Header>
			<Card.Content>
				<Chart.Container class="max-h-96 w-full" config={resolvedConfig}>
					<BarChart
						bind:context
						{data}
						xScale={scaleBand().padding(0.25)}
						x={xKey}
						axis="x"
						{series}
						x1Scale={scaleBand().paddingInner(0.2)}
						seriesLayout="group"
						rule={false}
						props={{
							bars: {
								stroke: 'none',
								strokeWidth: 0,
								rounded: 'all',
								initialY: context?.height,
								initialHeight: 0,
								motion: {
									y: { type: 'tween', duration: 500, easing: cubicInOut },
									height: { type: 'tween', duration: 500, easing: cubicInOut }
								}
							},
							highlight: { area: { fill: 'none' } },
							xAxis: {
								format: (d) => (typeof d === 'string' && d.length > 3 ? d.slice(0, 3) : String(d))
							}
						}}
					>
						{#snippet tooltip()}
							<Chart.Tooltip indicator="dashed" />
						{/snippet}
					</BarChart>
				</Chart.Container>
			</Card.Content>
			{#if footerText}
				<Card.Footer>
					<div class="flex w-full items-start gap-2 text-sm">
						<div class="grid gap-2">
							<div class="flex items-center gap-2 leading-none text-muted-foreground">
								{footerText}
							</div>
						</div>
					</div>
				</Card.Footer>
			{/if}
		</Card.Root>
	{:else}
		<Chart.Container config={resolvedConfig}>
			<BarChart
				bind:context
				{data}
				xScale={scaleBand().padding(0.25)}
				x={xKey}
				axis="x"
				{series}
				x1Scale={scaleBand().paddingInner(0.2)}
				seriesLayout="group"
				rule={false}
				props={{
					bars: {
						stroke: 'none',
						strokeWidth: 0,
						rounded: 'all',
						initialY: context?.height,
						initialHeight: 0,
						motion: {
							y: { type: 'tween', duration: 500, easing: cubicInOut },
							height: { type: 'tween', duration: 500, easing: cubicInOut }
						}
					},
					highlight: { area: { fill: 'none' } },
					xAxis: {
						format: (d) => (typeof d === 'string' && d.length > 3 ? d.slice(0, 3) : String(d))
					}
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip indicator="dashed" />
				{/snippet}
			</BarChart>
		</Chart.Container>
	{/if}
{:else}
	<div class="flex flex-col items-center justify-center py-10 text-muted-foreground">
		<p class="text-sm">No data available</p>
	</div>
{/if}
