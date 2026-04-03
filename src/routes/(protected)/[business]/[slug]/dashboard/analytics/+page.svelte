<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import RevenueHeatmap from '$lib/components/chart/revenue-heatmap.svelte';
	import {
		IconTrendingUp,
		IconShoppingCart,
		IconCash,
		IconXboxX,
		IconTrophy,
		IconCreditCard
	} from '@tabler/icons-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { TrendBadge } from '$lib/components/data-display';
	import PageHeader from '$lib/components/global/page-header.svelte';

	let { data } = $props();

	let dateRange = $state(data.dateRange || '7d');

	const currency = $derived(
		((data.business as any)?.settings?.currency || 'USD') as CurrencyCode
	);

	function formatCurrency(value: number): string {
		return i18nFormatCurrency(value, currency);
	}

	const dateRangeLabels: Record<string, string> = {
		'7d': 'Last 7 days',
		'30d': 'Last 30 days',
		'90d': 'Last 90 days',
		'1y': 'Last year'
	};

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
			const { orders, payments } = data.stats;
			return [
				{
					title: 'Total Revenue',
					value: formatCurrency(orders.totalRevenue),
					change: comparison?.revenueChange ?? 0,
					icon: IconCash,
					color: 'text-green-500',
					bgColor: 'bg-green-500/10'
				},
				{
					title: 'Total Orders',
					value: orders.totalOrders.toLocaleString(),
					change: comparison?.ordersChange ?? 0,
					icon: IconShoppingCart,
					color: 'text-blue-500',
					bgColor: 'bg-blue-500/10'
				},
				{
					title: 'Avg Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: comparison?.aovChange ?? 0,
					icon: IconTrendingUp,
					color: 'text-purple-500',
					bgColor: 'bg-purple-500/10'
				},
				{
					title: 'Cancellation Rate',
					value: `${cancellationRate()}%`,
					change: 0,
					icon: IconXboxX,
					color: cancellationRate() > 10 ? 'text-red-500' : 'text-amber-500',
					bgColor: cancellationRate() > 10 ? 'bg-red-500/10' : 'bg-amber-500/10',
					subtitle: `${orderStats?.cancelledOrders ?? 0} cancelled of ${orderStats?.totalOrders ?? 0}`
				}
			];
		}
		return [
			{
				title: 'Total Revenue',
				value: formatCurrency(0),
				change: 0,
				icon: IconCash,
				color: 'text-green-500',
				bgColor: 'bg-green-500/10'
			},
			{
				title: 'Total Orders',
				value: '0',
				change: 0,
				icon: IconShoppingCart,
				color: 'text-blue-500',
				bgColor: 'bg-blue-500/10'
			},
			{
				title: 'Avg Order Value',
				value: formatCurrency(0),
				change: 0,
				icon: IconTrendingUp,
				color: 'text-purple-500',
				bgColor: 'bg-purple-500/10'
			},
			{
				title: 'Cancellation Rate',
				value: '0%',
				change: 0,
				icon: IconXboxX,
				color: 'text-amber-500',
				bgColor: 'bg-amber-500/10'
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
	const rankColors = ['text-amber-500', 'text-slate-400', 'text-orange-600'];
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Analytics" description="Deep dive into your business performance">
				{#snippet actions()}
					<Select.Root
						type="single"
						value={dateRange}
						onValueChange={(v) => onDateRangeChange(v)}
					>
						<Select.Trigger
							class="w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{dateRangeLabels[dateRange] ?? dateRange}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="7d">Last 7 days</Select.Item>
							<Select.Item value="30d">Last 30 days</Select.Item>
							<Select.Item value="90d">Last 90 days</Select.Item>
							<Select.Item value="1y">Last year</Select.Item>
						</Select.Content>
					</Select.Root>
				{/snippet}
			</PageHeader>

			<!-- KPI Cards -->
			<div class="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
				{#each kpiData as kpi}
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								{kpi.title}
							</Card.Title>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg {kpi.bgColor}"
							>
								<kpi.icon class="h-4 w-4 {kpi.color}" />
							</div>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{kpi.value}</div>
							<div class="mt-1">
								{#if kpi.change !== 0}
									<TrendBadge
										value={kpi.change}
										changePercent={kpi.change}
										format="percent"
										size="sm"
									/>
									<span class="ml-1 text-xs text-muted-foreground">from last period</span>
								{:else if 'subtitle' in kpi && kpi.subtitle}
									<span class="text-xs text-muted-foreground">{kpi.subtitle}</span>
								{:else}
									<span class="text-xs text-muted-foreground">No comparison data</span>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Revenue Trends (Full Width) -->
			<div class="px-4 lg:px-6">
				{#if revenueTrendsData.length > 0}
					<BarChart
						title="Revenue Trends"
						description="Revenue and order volume over time"
						data={revenueTrendsData}
						xKey="date"
						series={[
							{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
							{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }
						]}
					/>
				{:else}
					<Card.Root>
						<Card.Header>
							<Card.Title>Revenue Trends</Card.Title>
							<Card.Description>Revenue and order volume over time</Card.Description>
						</Card.Header>
						<Card.Content>
							<div
								class="flex flex-col items-center justify-center py-16 text-muted-foreground"
							>
								<p class="text-sm">No revenue data for this period</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Peak Hours Histogram (Full Width) -->
			<div class="px-4 lg:px-6">
				{#if hourlyHistogramData.length > 0}
					<BarChart
						title="Peak Hours"
						description="Staffing demand — order volume by hour of day"
						data={hourlyHistogramData}
						xKey="hour"
						series={[
							{ key: 'orders', label: 'Orders', color: 'var(--chart-3)' },
							{ key: 'revenue', label: 'Revenue', color: 'var(--chart-4)' }
						]}
					/>
				{:else}
					<Card.Root>
						<Card.Header>
							<Card.Title>Peak Hours</Card.Title>
							<Card.Description>Order volume by hour of day</Card.Description>
						</Card.Header>
						<Card.Content>
							<div
								class="flex flex-col items-center justify-center py-16 text-muted-foreground"
							>
								<p class="text-sm">No hourly data for this period</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Revenue Heatmap (7-day grid) -->
			<div class="px-4 lg:px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Revenue Heatmap</Card.Title>
						<Card.Description>Revenue by hour across the last 7 days</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if data.revenueHeatmapData && data.revenueHeatmapData.length > 0}
							<RevenueHeatmap
								data={data.revenueHeatmapData}
								formatRevenue={formatCurrency}
							/>
						{:else}
							<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
								<p class="text-sm">No revenue data for the last 7 days</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Bottom Row: Top Selling Items + Payment Methods -->
			<div class="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<!-- Top Selling Items -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<IconTrophy class="h-4 w-4 text-amber-500" />
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
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold {i < 3
												? rankColors[i] + ' bg-current/10'
												: 'text-muted-foreground'}"
											style={i < 3
												? `background-color: color-mix(in srgb, currentColor 10%, transparent)`
												: ''}
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
												<span class="text-xs tabular-nums text-muted-foreground">
													{item.sold} sold
												</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="flex flex-col items-center justify-center py-10 text-muted-foreground"
							>
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
							<div
								class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
							>
								<IconCash class="h-10 w-10 text-primary" />
							</div>
							<div class="text-center">
								<p class="text-3xl font-bold tabular-nums">
									{formatCurrency(totalPaymentAmount)}
								</p>
								<p class="mt-1 text-sm text-muted-foreground">
									100% of payments via
									<span class="font-medium capitalize text-foreground">
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
		</div>
	</div>
</div>
