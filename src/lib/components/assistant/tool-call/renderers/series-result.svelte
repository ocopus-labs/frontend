<script lang="ts" module>
	import type { ToolResultEnvelope } from '$lib/api/agent';
	import type { FormatContext } from '../envelope';

	export interface SeriesResultProps {
		envelope: Extract<ToolResultEnvelope, { kind: 'series' }>;
		ctx: FormatContext;
	}
</script>

<script lang="ts">
	/**
	 * A metric over time.
	 *
	 * Ships its table alternative, per the `dataviz` conventions and because a
	 * chart in a chat thread is the *least* accessible thing on the page: it has
	 * no reading order, no values a screen reader can reach, and no way to tell
	 * 4,180 from 4,810. The toggle is a real control, not a disclosure — an
	 * operator checking a number wants the table first and should not have to
	 * hunt for it.
	 */
	import LazyBarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ChartIcon from '@lucide/svelte/icons/chart-column';
	import TableIcon from '@lucide/svelte/icons/table';
	import { formatValue } from '../envelope';

	let { envelope, ctx }: SeriesResultProps = $props();

	let view = $state<'chart' | 'table'>('chart');

	const valueFormat = $derived(envelope.unit === 'money' ? 'money' : 'number');
	const valueLabel = $derived(envelope.unit === 'money' ? 'Value' : 'Count');

	// `t` doubles as the axis label and the row key; it is unique per point
	// because the backend builds it from a date or an hour bucket.
	const data = $derived(envelope.points.map((p) => ({ label: p.t, value: p.v })));

	const series = $derived([{ key: 'value', label: valueLabel, color: 'var(--chart-1)' }]);
</script>

<div class="rounded-md border border-border p-3">
	<div class="mb-2 flex items-center justify-between gap-2">
		<p class="text-xs font-medium text-muted-foreground">
			{envelope.title ?? 'Trend'}
		</p>
		<Button variant="ghost" size="sm" onclick={() => (view = view === 'chart' ? 'table' : 'chart')}>
			{#if view === 'chart'}
				<TableIcon class="size-3.5" aria-hidden="true" />
				Show as table
			{:else}
				<ChartIcon class="size-3.5" aria-hidden="true" />
				Show as chart
			{/if}
		</Button>
	</div>

	{#if envelope.points.length === 0}
		<p class="py-3 text-sm text-muted-foreground">No data for this period.</p>
	{:else if view === 'chart'}
		<LazyBarChart {data} xKey="label" {series} />
	{:else}
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Period</Table.Head>
						<Table.Head class="text-right">{valueLabel}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each envelope.points as point (point.t)}
						<Table.Row>
							<Table.Cell>{point.t}</Table.Cell>
							<Table.Cell class="text-right tabular-nums">
								{formatValue(point.v, valueFormat, ctx)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
