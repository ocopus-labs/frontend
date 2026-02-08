<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import {
		IconTrendingUp,
		IconTrendingDown,
		IconUsers,
		IconShoppingCart,
		IconCash,
		IconCalendar
	} from '@tabler/icons-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';

	let { data }: { data: PageData } = $props();

	let dateRange = $state(data.dateRange || '7d');

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

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

	// KPI data from API — no dummy fallback
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
					trend: (comparison?.revenueChange ?? 0) >= 0 ? 'up' as const : 'down' as const
				},
				{
					title: 'Total Orders',
					value: orders.totalOrders.toLocaleString(),
					change: comparison?.ordersChange ?? 0,
					icon: IconShoppingCart,
					trend: (comparison?.ordersChange ?? 0) >= 0 ? 'up' as const : 'down' as const
				},
				{
					title: 'Average Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: comparison?.aovChange ?? 0,
					icon: IconTrendingUp,
					trend: (comparison?.aovChange ?? 0) >= 0 ? 'up' as const : 'down' as const
				},
				{
					title: 'Active Orders',
					value: orders.activeOrders.toString(),
					change: 0,
					icon: IconUsers,
					trend: 'up' as const
				}
			];
		}
		return [
			{ title: 'Total Revenue', value: formatCurrency(0), change: 0, icon: IconCash, trend: 'up' as const },
			{ title: 'Total Orders', value: '0', change: 0, icon: IconShoppingCart, trend: 'up' as const },
			{ title: 'Average Order Value', value: formatCurrency(0), change: 0, icon: IconTrendingUp, trend: 'up' as const },
			{ title: 'Active Orders', value: '0', change: 0, icon: IconUsers, trend: 'up' as const }
		];
	});

	// Top selling items from API — no dummy fallback
	let topSellingItems = $derived.by(() => {
		if (data.topItems && data.topItems.length > 0) {
			return data.topItems.map((item) => ({
				name: item.name,
				category: item.category,
				sold: item.quantitySold,
				revenue: formatCurrency(item.revenue)
			}));
		}
		return [];
	});

	// Peak hours from API — no dummy fallback
	let peakHours = $derived.by(() => {
		if (data.peakHours && data.peakHours.length > 0) {
			const maxOrders = Math.max(...data.peakHours.map((h) => h.orderCount));
			return data.peakHours.map((hour) => ({
				hour: hour.hour,
				orders: hour.orderCount,
				revenue: formatCurrency(hour.revenue),
				percentage: maxOrders > 0 ? (hour.orderCount / maxOrders) * 100 : 0
			}));
		}
		return [];
	});

	// Revenue trends for chart
	const revenueTrendsData = $derived(data.revenueTrends || []);

	// Hourly breakdown for chart
	const hourlyChartData = $derived(
		(data.hourlyBreakdown || []).map((h: any) => ({
			...h,
			hour: `${h.hour}:00`
		}))
	);

	// Payment breakdown for pie chart
	const paymentChartData = $derived(
		(data.paymentBreakdown || []).map((p: any) => ({
			method: p.method.replace('_', ' '),
			amount: p.amount
		}))
	);
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Analytics</h1>
					<p class="text-muted-foreground">Deep dive into your business performance</p>
				</div>
				<div class="flex gap-2">
					<Select.Root type="single" value={dateRange} onValueChange={(v) => onDateRangeChange(v)}>
						<Select.Trigger class="w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm">
							{dateRangeLabels[dateRange] ?? dateRange}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="7d">Last 7 days</Select.Item>
							<Select.Item value="30d">Last 30 days</Select.Item>
							<Select.Item value="90d">Last 90 days</Select.Item>
							<Select.Item value="1y">Last year</Select.Item>
						</Select.Content>
					</Select.Root>
					<Button variant="outline">
						<IconCalendar class="mr-2 h-4 w-4" />
						Custom Range
					</Button>
				</div>
			</div>

			<!-- KPI Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each kpiData as kpi}
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between pb-2">
							<Card.Title class="text-sm font-medium">{kpi.title}</Card.Title>
							<kpi.icon class="h-4 w-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{kpi.value}</div>
							<p class="text-xs text-muted-foreground">
								{#if kpi.change !== 0}
									{#if kpi.trend === 'up'}
										<span class="text-success">+{kpi.change}%</span>
									{:else}
										<span class="text-destructive">{kpi.change}%</span>
									{/if}
									from last period
								{:else}
									<span class="text-muted-foreground">No comparison data</span>
								{/if}
							</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<!-- Top Selling Items -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Top Selling Items</Card.Title>
						<Card.Description>Best performers this period</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if topSellingItems.length > 0}
							<div class="space-y-4">
								{#each topSellingItems as item, i}
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium"
											>
												{i + 1}
											</div>
											<div>
												<p class="font-medium">{item.name}</p>
												<p class="text-sm text-muted-foreground">{item.category}</p>
											</div>
										</div>
										<div class="text-right">
											<p class="font-medium">{item.revenue}</p>
											<p class="text-sm text-muted-foreground">{item.sold} sold</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-sm text-muted-foreground">No data for this period</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Peak Hours -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Peak Hours</Card.Title>
						<Card.Description>Busiest times of the day</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if peakHours.length > 0}
							<div class="space-y-4">
								{#each peakHours as hour}
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="w-20 text-sm font-medium">{hour.hour}</div>
											<div class="h-2 flex-1 rounded-full bg-muted">
												<div
													class="h-full rounded-full bg-primary"
													style="width: {hour.percentage}%"
												></div>
											</div>
										</div>
										<div class="ml-4 text-right">
											<p class="font-medium">{hour.orders} orders</p>
											<p class="text-sm text-muted-foreground">{hour.revenue}</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-sm text-muted-foreground">No data for this period</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
				<BarChart
					title="Revenue Trends"
					description="Revenue over time"
					data={revenueTrendsData}
					xKey="date"
					series={[
						{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
						{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }
					]}
				/>
				<BarChart
					title="Orders by Hour"
					description="Hourly distribution"
					data={hourlyChartData}
					xKey="hour"
					series={[
						{ key: 'orders', label: 'Orders', color: 'var(--chart-3)' },
						{ key: 'revenue', label: 'Revenue', color: 'var(--chart-4)' }
					]}
				/>
				<PieChart
					title="Payment Methods"
					description="Revenue by payment type"
					data={paymentChartData}
					labelKey="method"
					valueKey="amount"
				/>
			</div>
		</div>
	</div>
</div>
