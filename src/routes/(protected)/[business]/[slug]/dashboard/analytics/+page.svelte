<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import RevenueHeatmap from '$lib/components/chart/revenue-heatmap.svelte';
	import {
		IconTrendingUp,
		IconShoppingCart,
		IconCash,
		IconXboxX,
		IconTrophy,
		IconCreditCard,
		IconChartLine,
		IconTargetArrow
	} from '@tabler/icons-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import KpiCard from '$lib/components/global/kpi-card.svelte';
	import KpiGrid from '$lib/components/global/kpi-grid.svelte';
	import FilterSelect from '$lib/components/global/filter-select.svelte';

	let { data } = $props();

	let dateRange = $state(data.dateRange || '7d');

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(value: number): string {
		return i18nFormatCurrency(value, currency);
	}

	function onDateRangeChange(value: string) {
		dateRange = value;
		const url = new URL($page.url);
		url.searchParams.set('range', dateRange);
		goto(url.toString(), { replaceState: true });
	}

	// Cancellation rate from order stats
	const orderStats = $derived((data as any).orderStats);
	const cancellationRate = $derived(() => {
		if (!orderStats || !orderStats.totalOrders) return 0;
		return Math.round((orderStats.cancelledOrders / orderStats.totalOrders) * 100 * 10) / 10;
	});

	// KPI data — replaced Active Orders with Cancellation Rate
	let kpiData = $derived.by(() => {
		const comparison = data.analyticsComparison?.comparison;
		if (data.stats) {
			const { orders } = data.stats;
			const rate = cancellationRate();
			return [
				{
					label: 'Total Revenue',
					value: formatCurrency(orders.totalRevenue),
					change: comparison?.revenueChange ?? 0,
					icon: IconCash,
					accent: 'chart-5' as const,
					description: 'vs last period'
				},
				{
					label: 'Total Orders',
					value: orders.totalOrders.toLocaleString(),
					change: comparison?.ordersChange ?? 0,
					icon: IconShoppingCart,
					accent: 'chart-3' as const,
					description: 'vs last period'
				},
				{
					label: 'Avg Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: comparison?.aovChange ?? 0,
					icon: IconTrendingUp,
					accent: 'chart-4' as const,
					description: 'vs last period'
				},
				{
					label: 'Cancellation Rate',
					value: `${rate}%`,
					change: 0,
					icon: IconXboxX,
					accent: rate > 10 ? ('destructive' as const) : ('warning' as const),
					invertTrend: true,
					description: `${orderStats?.cancelledOrders ?? 0} cancelled of ${orderStats?.totalOrders ?? 0}`
				}
			];
		}
		return [
			{
				label: 'Total Revenue',
				value: formatCurrency(0),
				change: 0,
				icon: IconCash,
				accent: 'chart-5' as const,
				description: 'No data yet'
			},
			{
				label: 'Total Orders',
				value: '0',
				change: 0,
				icon: IconShoppingCart,
				accent: 'chart-3' as const,
				description: 'No data yet'
			},
			{
				label: 'Avg Order Value',
				value: formatCurrency(0),
				change: 0,
				icon: IconTrendingUp,
				accent: 'chart-4' as const,
				description: 'No data yet'
			},
			{
				label: 'Cancellation Rate',
				value: '0%',
				change: 0,
				icon: IconXboxX,
				accent: 'warning' as const,
				invertTrend: true,
				description: 'No data yet'
			}
		];
	});

	// Top selling items
	let topSellingItems = $derived.by(() => {
		if (data.topItems && data.topItems.length > 0) {
			const maxSold = Math.max(...data.topItems.map((i: any) => i.quantitySold));
			return data.topItems.map((item: any) => ({
				name: item.name,
				category: item.category,
				sold: item.quantitySold,
				revenue: item.revenue,
				percentage: maxSold > 0 ? (item.quantitySold / maxSold) * 100 : 0
			}));
		}
		return [];
	});

	// Format revenue trend dates for readable x-axis labels
	const revenueTrendsData = $derived(
		(data.revenueTrends || []).map((d: any) => {
			const dateStr = d.date;
			let label = dateStr;
			if (typeof dateStr === 'string' && dateStr.includes('-')) {
				const parts = dateStr.split('-');
				const month = parseInt(parts[1], 10);
				const day = parseInt(parts[2], 10);
				const monthNames = [
					'Jan',
					'Feb',
					'Mar',
					'Apr',
					'May',
					'Jun',
					'Jul',
					'Aug',
					'Sep',
					'Oct',
					'Nov',
					'Dec'
				];
				label = `${monthNames[month - 1]} ${day}`;
			}
			return { ...d, date: label };
		})
	);

	// Hourly breakdown for peak hours histogram (short labels for chart axis)
	const hourlyHistogramData = $derived(
		(data.hourlyBreakdown || []).map((h: any) => {
			const hr = h.hour;
			const suffix = hr >= 12 ? 'p' : 'a';
			const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
			return {
				...h,
				hour: `${hr12}${suffix}`
			};
		})
	);

	// Payment breakdown for pie chart
	const paymentChartData = $derived(
		(data.paymentBreakdown || []).map((p: any) => ({
			method: p.method.replace('_', ' '),
			amount: p.amount
		}))
	);

	// Check if payment data is single-method (100% pie edge case)
	const isSinglePaymentMethod = $derived(paymentChartData.length === 1);
	const totalPaymentAmount = $derived(
		paymentChartData.reduce((sum: number, p: any) => sum + p.amount, 0)
	);

	// Rank medal colors
	// Medal ranks (gold / silver / bronze) mapped to semantic + chart tokens.
	const rankChip = [
		'bg-warning/10 text-warning',
		'bg-muted text-muted-foreground',
		'bg-chart-1/10 text-chart-1'
	];

	// Forecast overlay data: merge actual revenue trends with predicted forecasts
	const forecastChartData = $derived.by(() => {
		const actuals = (data.revenueTrends || []).map((d: any) => {
			const dateStr = d.date;
			let label = dateStr;
			if (typeof dateStr === 'string' && dateStr.includes('-')) {
				const parts = dateStr.split('-');
				const month = parseInt(parts[1], 10);
				const day = parseInt(parts[2], 10);
				const monthNames = [
					'Jan',
					'Feb',
					'Mar',
					'Apr',
					'May',
					'Jun',
					'Jul',
					'Aug',
					'Sep',
					'Oct',
					'Nov',
					'Dec'
				];
				label = `${monthNames[month - 1]} ${day}`;
			}
			return {
				date: label,
				actualRevenue: d.revenue ?? 0,
				predictedRevenue: null as number | null
			};
		});

		const forecasts = ((data as any).forecastData || []).map((f: any) => {
			const dateStr = f.date;
			let label = dateStr;
			if (typeof dateStr === 'string' && dateStr.includes('-')) {
				const parts = dateStr.split('-');
				const month = parseInt(parts[1], 10);
				const day = parseInt(parts[2], 10);
				const monthNames = [
					'Jan',
					'Feb',
					'Mar',
					'Apr',
					'May',
					'Jun',
					'Jul',
					'Aug',
					'Sep',
					'Oct',
					'Nov',
					'Dec'
				];
				label = `${monthNames[month - 1]} ${day}`;
			}
			return {
				date: label,
				actualRevenue: null as number | null,
				predictedRevenue: f.predictedRevenue ?? 0
			};
		});

		// Bridge: last actual point also appears as first prediction
		if (actuals.length > 0 && forecasts.length > 0) {
			const lastActual = actuals[actuals.length - 1];
			forecasts.unshift({
				date: lastActual.date,
				actualRevenue: null,
				predictedRevenue: lastActual.actualRevenue
			});
		}

		return [...actuals, ...forecasts];
	});

	// Average confidence from forecast data
	const forecastConfidence = $derived.by(() => {
		const forecasts = (data as any).forecastData || [];
		if (forecasts.length === 0) return 0;
		const avg =
			forecasts.reduce((s: number, f: any) => s + (f.confidence ?? 0), 0) / forecasts.length;
		return Math.round(avg * 100);
	});
</script>

<PageShell title="Analytics" description="Deep dive into your business performance">
	{#snippet actions()}
		<FilterSelect
			value={dateRange}
			onValueChange={onDateRangeChange}
			options={[
				{ value: '7d', label: 'Last 7 days' },
				{ value: '30d', label: 'Last 30 days' },
				{ value: '90d', label: 'Last 90 days' },
				{ value: '1y', label: 'Last year' }
			]}
		/>
	{/snippet}

	<!-- KPI Cards -->
	<KpiGrid>
		{#each kpiData as kpi (kpi.label)}
			<KpiCard
				label={kpi.label}
				value={kpi.value}
				change={kpi.change}
				icon={kpi.icon}
				accent={kpi.accent}
				description={kpi.description}
				invertTrend={'invertTrend' in kpi ? kpi.invertTrend : false}
			/>
		{/each}
	</KpiGrid>

	<!-- Revenue Trends (Full Width) -->
	<div>
		{#if revenueTrendsData.length > 0}
			<BarChart
				title="Revenue Trends"
				description="Daily revenue over time"
				data={revenueTrendsData}
				xKey="date"
				series={[{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' }]}
			/>
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title>Revenue Trends</Card.Title>
					<Card.Description>Revenue and order volume over time</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<p class="text-sm">No revenue data for this period</p>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Revenue Forecast: Actual vs Predicted -->
	<div>
		{#if forecastChartData.length > 0 && ((data as any).forecastData || []).length > 0}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="flex items-center gap-2">
								<IconChartLine class="h-4 w-4 text-chart-4" />
								Revenue Forecast
							</Card.Title>
							<Card.Description>Actual revenue vs predicted (next 7 days)</Card.Description>
						</div>
						{#if forecastConfidence > 0}
							<div class="flex items-center gap-2">
								<IconTargetArrow class="h-4 w-4 text-muted-foreground" />
								<span class="text-sm text-muted-foreground">
									{forecastConfidence}% confidence
								</span>
							</div>
						{/if}
					</div>
				</Card.Header>
				<Card.Content>
					<BarChart
						data={forecastChartData}
						xKey="date"
						series={[
							{ key: 'actualRevenue', label: 'Actual Revenue', color: 'var(--chart-1)' },
							{
								key: 'predictedRevenue',
								label: 'Predicted Revenue',
								color: 'var(--chart-5)'
							}
						]}
					/>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<IconChartLine class="h-4 w-4 text-chart-4" />
						Revenue Forecast
					</Card.Title>
					<Card.Description>Actual revenue vs predicted (next 7 days)</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<p class="text-sm">
							Not enough historical data to generate forecasts. Analytics data from at least 2 weeks
							is needed.
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Peak Hours Histogram (Full Width) -->
	<div>
		{#if hourlyHistogramData.length > 0}
			<BarChart
				title="Peak Hours"
				description="Staffing demand — order volume by hour of day"
				data={hourlyHistogramData}
				xKey="hour"
				series={[{ key: 'orders', label: 'Orders', color: 'var(--chart-3)' }]}
			/>
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title>Peak Hours</Card.Title>
					<Card.Description>Order volume by hour of day</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<p class="text-sm">No hourly data for this period</p>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Revenue Heatmap (7-day grid) -->
	<div>
		<Card.Root>
			<Card.Header>
				<Card.Title>Revenue Heatmap</Card.Title>
				<Card.Description>Revenue by hour across the last 7 days</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.revenueHeatmapData && data.revenueHeatmapData.length > 0}
					<RevenueHeatmap data={data.revenueHeatmapData} formatRevenue={formatCurrency} />
				{:else}
					<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<p class="text-sm">No revenue data for the last 7 days</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Bottom Row: Top Selling Items + Payment Methods -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<!-- Top Selling Items -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<IconTrophy class="h-4 w-4 text-chart-6" />
					Top Selling Items
				</Card.Title>
				<Card.Description>Best performers by volume this period</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if topSellingItems.length > 0}
					<div class="space-y-3">
						{#each topSellingItems as item, i}
							<div class="flex items-center gap-3">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold {i <
									3
										? rankChip[i]
										: 'bg-muted text-muted-foreground'}"
								>
									{i + 1}
								</span>
								<div class="min-w-0 flex-1">
									<div class="flex items-baseline justify-between">
										<p class="truncate text-sm font-medium">{item.name}</p>
										<span class="ml-2 shrink-0 text-sm font-semibold tabular-nums">
											{formatCurrency(item.revenue)}
										</span>
									</div>
									<div class="mt-1 flex items-center gap-2">
										<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full bg-primary/60 transition-all duration-500"
												style="width: {item.percentage}%"
											></div>
										</div>
										<span class="text-xs text-muted-foreground tabular-nums">
											{item.sold} sold
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-10 text-muted-foreground">
						<p class="text-sm">No data for this period</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Payment Methods -->
		{#if isSinglePaymentMethod && paymentChartData.length === 1}
			<!-- Single payment method — show summary card instead of pie -->
			<Card.Root class="flex flex-col">
				<Card.Header class="items-center">
					<Card.Title class="flex items-center gap-2">
						<IconCreditCard class="h-4 w-4" />
						Payment Methods
					</Card.Title>
					<Card.Description>Revenue by payment type</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-1 flex-col items-center justify-center gap-4 py-8">
					<div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
						<IconCash class="h-10 w-10 text-primary" />
					</div>
					<div class="text-center">
						<p class="text-3xl font-bold tabular-nums">
							{formatCurrency(totalPaymentAmount)}
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							100% of payments via
							<span class="font-medium text-foreground capitalize">
								{paymentChartData[0].method}
							</span>
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<PieChart
				title="Payment Methods"
				description="Revenue by payment type"
				data={paymentChartData}
				labelKey="method"
				valueKey="amount"
			/>
		{/if}
	</div>
</PageShell>
