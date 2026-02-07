<script lang="ts">
	import { Arc, PieChart, Text } from 'layerchart';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let {
		data = [] as Record<string, any>[],
		labelKey = 'label',
		valueKey = 'value',
		title = '',
		description = '',
		chartConfig = {} as Chart.ChartConfig
	}: {
		data?: Record<string, any>[];
		labelKey?: string;
		valueKey?: string;
		title?: string;
		description?: string;
		chartConfig?: Chart.ChartConfig;
	} = $props();

	// Assign chart colors to data and build config
	const chartColors = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)'
	];

	const coloredData = $derived(
		data.map((d, i) => ({
			...d,
			_color: chartColors[i % chartColors.length]
		}))
	);

	const resolvedConfig = $derived.by(() => {
		if (Object.keys(chartConfig).length > 0) return chartConfig;
		const config: Record<string, { label: string; color: string }> = {
			[valueKey]: { label: valueKey, color: '' }
		};
		for (let i = 0; i < data.length; i++) {
			const key = String(data[i][labelKey]).toLowerCase().replace(/\s+/g, '_');
			config[key] = {
				label: String(data[i][labelKey]),
				color: chartColors[i % chartColors.length]
			};
		}
		return config as Chart.ChartConfig;
	});
</script>

{#if data.length > 0}
	{#if title}
		<Card.Root class="flex flex-col">
			<Card.Header class="items-center">
				<Card.Title>{title}</Card.Title>
				{#if description}
					<Card.Description>{description}</Card.Description>
				{/if}
			</Card.Header>
			<Card.Content class="flex-1">
				<Chart.Container config={resolvedConfig} class="mx-auto aspect-square max-h-[250px]">
					<PieChart
						data={coloredData}
						key={labelKey}
						value={valueKey}
						cRange={coloredData.map((d) => d._color)}
						c="_color"
						props={{
							pie: {
								motion: 'tween'
							}
						}}
					>
						{#snippet tooltip()}
							<Chart.Tooltip hideLabel />
						{/snippet}
						{#snippet arc({ props: arcProps, visibleData, index })}
							{@const label = (visibleData[index] as Record<string, any>)[labelKey]}
							<Arc {...arcProps}>
								{#snippet children({ getArcTextProps })}
									<Text
										value={label}
										{...getArcTextProps('centroid')}
										font-size="12"
										class="fill-background capitalize"
									/>
								{/snippet}
							</Arc>
						{/snippet}
					</PieChart>
				</Chart.Container>
			</Card.Content>
		</Card.Root>
	{:else}
		<Chart.Container config={resolvedConfig} class="mx-auto aspect-square max-h-[250px]">
			<PieChart
				data={coloredData}
				key={labelKey}
				value={valueKey}
				cRange={coloredData.map((d) => d._color)}
				c="_color"
				props={{
					pie: {
						motion: 'tween'
					}
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip hideLabel />
				{/snippet}
				{#snippet arc({ props: arcProps, visibleData, index })}
					{@const label = (visibleData[index] as Record<string, any>)[labelKey]}
					<Arc {...arcProps}>
						{#snippet children({ getArcTextProps })}
							<Text
								value={label}
								{...getArcTextProps('centroid')}
								font-size="12"
								class="fill-background capitalize"
							/>
						{/snippet}
					</Arc>
				{/snippet}
			</PieChart>
		</Chart.Container>
	{/if}
{:else}
	<div class="flex flex-col items-center justify-center py-10 text-muted-foreground">
		<p class="text-sm">No data available</p>
	</div>
{/if}
