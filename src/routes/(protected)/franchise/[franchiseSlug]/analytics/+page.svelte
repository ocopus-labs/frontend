<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import KpiCard from '$lib/components/global/kpi-card.svelte';
	import KpiGrid from '$lib/components/global/kpi-grid.svelte';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { getFranchiseAnalytics } from '$lib/api/franchise';
	import { formatCurrency, type CurrencyCode } from '$lib/utils/i18n';
	import { formatMoney } from '$lib/utils/money';
	import type { FranchiseAnalytics } from '$lib/api/types';

	import MapPin from '@lucide/svelte/icons/map-pin';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Store from '@lucide/svelte/icons/store';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);

	type Period = '7d' | '30d' | '90d' | 'ytd';

	const PERIOD_OPTIONS = [
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' },
		{ value: '90d', label: 'Last 90 days' },
		{ value: 'ytd', label: 'This year' }
	];

	const PERIOD_LABEL: Record<Period, string> = {
		'7d': 'Last 7 days',
		'30d': 'Last 30 days',
		'90d': 'Last 90 days',
		ytd: 'This year'
	};

	let period = $state<Period>('30d');

	/** The API takes startDate/endDate — translate the picker into an ISO range. */
	function rangeFor(p: Period): { startDate: string; endDate: string } {
		const end = new Date();
		const start = new Date(end);

		if (p === 'ytd') {
			start.setMonth(0, 1);
		} else {
			const days = p === '7d' ? 7 : p === '90d' ? 90 : 30;
			start.setDate(start.getDate() - (days - 1));
		}
		start.setHours(0, 0, 0, 0);

		return { startDate: start.toISOString(), endDate: end.toISOString() };
	}

	let analytics = $state<FranchiseAnalytics | null>(null);
	let loading = $state(true);
	let loadError = $state(false);

	// Re-runs whenever the franchise or the selected period changes.
	$effect(() => {
		const id = franchise?.id;
		if (!id) return;

		const range = rangeFor(period);

		loading = true;
		loadError = false;

		getFranchiseAnalytics(id, range)
			.then((res) => {
				analytics = res.analytics;
			})
			.catch(() => {
				analytics = null;
				loadError = true;
			})
			.finally(() => {
				loading = false;
			});
	});

	// Each location carries its own currency, so there is no single franchise
	// currency to format with. Location rows format in their own; network totals
	// render as per-currency buckets. This previously formatted every location's
	// combined revenue using location #1's currency.
	function money(amount: number, currency: string) {
		return formatCurrency(amount, currency as CurrencyCode);
	}

	const CHART_ACCENTS = [
		'chart-1',
		'chart-2',
		'chart-3',
		'chart-4',
		'chart-5',
		'chart-6',
		'chart-7',
		'chart-8'
	];

	/** Ranked by revenue, with each location's share of the franchise total. */
	const rankedLocations = $derived.by(() => {
		const rows = [...(analytics?.locationBreakdown ?? [])].sort((a, b) => b.revenue - a.revenue);

		// Share is computed against the total *in the same currency*. Dividing by
		// a cross-currency total would make a location's "% of network" depend on
		// the exchange-rate-free sum of unrelated amounts.
		const totalPerCurrency = new Map<string, number>();
		for (const row of rows) {
			totalPerCurrency.set(row.currency, (totalPerCurrency.get(row.currency) ?? 0) + row.revenue);
		}

		return rows.map((row, i) => ({
			...row,
			avgOrder: row.orders > 0 ? row.revenue / row.orders : 0,
			share: (totalPerCurrency.get(row.currency) ?? 0) > 0
				? row.revenue / (totalPerCurrency.get(row.currency) as number)
				: 0,
			accent: CHART_ACCENTS[i % CHART_ACCENTS.length]
		}));
	});

	const topLocation = $derived(rankedLocations[0] ?? null);

	/**
	 * Orders and revenue folded per currency, so an average is taken within one
	 * currency rather than dividing a mixed-currency total by a global count.
	 */
	const averageOrderValueByCurrency = $derived.by(() => {
		const totals = new Map<string, { revenue: number; orders: number }>();
		for (const row of analytics?.locationBreakdown ?? []) {
			const entry = totals.get(row.currency) ?? { revenue: 0, orders: 0 };
			entry.revenue += row.revenue;
			entry.orders += row.orders;
			totals.set(row.currency, entry);
		}
		return Object.fromEntries(
			[...totals].map(([currency, t]) => [currency, t.orders > 0 ? t.revenue / t.orders : 0])
		);
	});

	/**
	 * Bars from different currencies share an axis, which is only readable if
	 * each is labelled. A fully correct treatment would be one chart per
	 * currency; labelling at least stops ₹ and $ bars reading as comparable.
	 */
	const revenueByLocation = $derived.by(() => {
		const currencies = new Set(rankedLocations.map((r) => r.currency));
		const mixed = currencies.size > 1;
		return rankedLocations.map((row) => ({
			name: mixed ? `${row.businessName} (${row.currency})` : row.businessName,
			revenue: row.revenue
		}));
	});

	const periodLabel = $derived(PERIOD_LABEL[period]);
</script>

<svelte:head>
	<title>Analytics - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<SectionHeader
	title="Analytics"
	description="Aggregated performance across every location in this franchise."
>
	{#snippet actions()}
		<FilterSelect
			value={period}
			options={PERIOD_OPTIONS}
			onValueChange={(v) => (period = v as Period)}
		/>
	{/snippet}
</SectionHeader>

{#if loadError}
	<Alert.Root variant="destructive">
		<AlertTriangle class="size-4" />
		<Alert.Title>Couldn't load analytics</Alert.Title>
		<Alert.Description>
			Analytics for this franchise are unavailable right now. Try a different period or refresh the
			page.
		</Alert.Description>
	</Alert.Root>
{/if}

<!-- Headline KPIs -->
{#if loading}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each [1, 2, 3, 4] as i (i)}
			<Card.Root class="p-4">
				<div class="flex items-start justify-between">
					<Skeleton class="h-3 w-20" />
					<Skeleton class="size-8 rounded-lg" />
				</div>
				<Skeleton class="mt-3 h-7 w-24" />
				<Skeleton class="mt-3 h-3 w-28" />
			</Card.Root>
		{/each}
	</div>
{:else}
	<KpiGrid columns={4}>
		<KpiCard
			label="Network revenue"
			value={formatMoney(analytics?.totalRevenue)}
			description={periodLabel}
			icon={Wallet}
			accent="chart-1"
			emphasize
		/>
		<KpiCard
			label="Total orders"
			value={(analytics?.totalOrders ?? 0).toLocaleString('en-IN')}
			description={periodLabel}
			icon={ShoppingCart}
			accent="chart-3"
		/>
		<KpiCard
			label="Average order value"
			value={formatMoney(averageOrderValueByCurrency)}
			description="Across all locations"
			icon={Receipt}
			accent="chart-4"
		/>
		<KpiCard
			label="Locations"
			value={analytics?.totalLocations ?? 0}
			description="Reporting in this franchise"
			icon={MapPin}
			accent="chart-5"
			href="/franchise/{franchise?.slug}/locations"
		/>
	</KpiGrid>
{/if}

<!-- Revenue by location: absolute (bars) + share (pie) -->
<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
	{#if loading}
		<Card.Root class="lg:col-span-2">
			<Card.Header class="space-y-0">
				<Skeleton class="h-4 w-40" />
				<Skeleton class="mt-2 h-3 w-56" />
			</Card.Header>
			<Card.Content>
				<Skeleton class="h-[280px] w-full rounded-lg" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="items-center space-y-0">
				<Skeleton class="h-4 w-32" />
				<Skeleton class="mt-2 h-3 w-40" />
			</Card.Header>
			<Card.Content class="flex justify-center">
				<Skeleton class="aspect-square h-[220px] rounded-full" />
			</Card.Content>
		</Card.Root>
	{:else if rankedLocations.length === 0}
		<Card.Root class="lg:col-span-3">
			<Card.Content>
				<EmptyState
					type="no-data"
					icon={Store}
					title="No location data for this period"
					description="Revenue appears here once locations start taking orders in the selected range."
				/>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="lg:col-span-2">
			<BarChart
				title="Revenue by location"
				description="Total revenue per location · {periodLabel}"
				data={revenueByLocation}
				xKey="name"
				series={[{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' }]}
			/>
		</div>
		<PieChart
			title="Revenue share"
			description="Each location's slice of the network"
			data={revenueByLocation}
			labelKey="name"
			valueKey="revenue"
		/>
	{/if}
</div>

<!-- Full breakdown — the bar chart's axis truncates names, so the table is the
     authoritative read of which location is which. -->
{#if loading}
	<div class="space-y-3">
		<Skeleton class="h-5 w-48" />
		<Card.Root>
			<Card.Content class="space-y-4 py-6">
				{#each [1, 2, 3, 4, 5] as i (i)}
					<div class="flex items-center gap-4">
						<Skeleton class="size-7 rounded-md" />
						<Skeleton class="h-4 flex-1" />
						<Skeleton class="h-4 w-20" />
						<Skeleton class="h-4 w-16" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
{:else if rankedLocations.length > 0}
	<div class="space-y-3">
		<SectionHeader
			title="Location comparison"
			description={topLocation
				? `Top performer: ${topLocation.businessName} · ${money(topLocation.revenue, topLocation.currency)} (${Math.round(topLocation.share * 100)}% of ${topLocation.currency} revenue)`
				: 'Every location, ranked by revenue'}
		>
			{#snippet actions()}
				<Button variant="outline" size="sm" href="/franchise/{franchise?.slug}/locations">
					Manage locations
				</Button>
			{/snippet}
		</SectionHeader>

		<Card.Root>
			<Card.Content class="px-0 py-0">
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="w-12 pl-6">#</Table.Head>
							<Table.Head>Location</Table.Head>
							<Table.Head class="text-right">Revenue</Table.Head>
							<Table.Head class="hidden text-right sm:table-cell">Orders</Table.Head>
							<Table.Head class="hidden text-right md:table-cell">Avg order</Table.Head>
							<Table.Head class="w-40 pr-6 text-right">Share</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each rankedLocations as location, i (location.businessId)}
							<Table.Row>
								<Table.Cell class="pl-6">
									<span
										class="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground tabular-nums"
									>
										{i + 1}
									</span>
								</Table.Cell>
								<Table.Cell class="font-medium">
									<div class="flex items-center gap-2">
										<span
											class="flex size-7 shrink-0 items-center justify-center rounded-md"
											style="background-color: color-mix(in oklch, var(--{location.accent}) 12%, transparent); color: var(--{location.accent})"
										>
											<Store class="size-3.5" />
										</span>
										<span class="truncate">{location.businessName}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right font-semibold tabular-nums">
									{money(location.revenue, location.currency)}
								</Table.Cell>
								<Table.Cell class="hidden text-right tabular-nums sm:table-cell">
									{location.orders.toLocaleString('en-IN')}
								</Table.Cell>
								<Table.Cell
									class="hidden text-right text-muted-foreground tabular-nums md:table-cell"
								>
									{money(location.avgOrder, location.currency)}
								</Table.Cell>
								<Table.Cell class="pr-6">
									<div class="flex items-center justify-end gap-2">
										<div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full"
												style="width: {Math.max(
													location.share * 100,
													2
												)}%; background-color: var(--{location.accent})"
											></div>
										</div>
										<span class="w-10 text-right text-xs text-muted-foreground tabular-nums">
											{Math.round(location.share * 100)}%
										</span>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
