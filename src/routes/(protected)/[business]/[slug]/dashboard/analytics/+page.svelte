<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import AreaChartInteractive from '$lib/components/chart/area-chart-interactive.svelte';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';
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

	let { data }: { data: PageData } = $props();

	let dateRange = $state(data.dateRange || '7d');

	// Helper to format currency
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	// Handle date range change
	function onDateRangeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		dateRange = select.value;
		const url = new URL($page.url);
		url.searchParams.set('range', dateRange);
		goto(url.toString(), { replaceState: true });
	}

	// KPI data from API or fallback
	let kpiData = $derived.by(() => {
		if (data.stats) {
			const { orders, payments } = data.stats;
			return [
				{
					title: 'Total Revenue',
					value: formatCurrency(orders.totalRevenue),
					change: 0,
					icon: IconCash,
					trend: 'up' as const
				},
				{
					title: 'Total Orders',
					value: orders.totalOrders.toLocaleString(),
					change: 0,
					icon: IconShoppingCart,
					trend: 'up' as const
				},
				{
					title: 'Average Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: 0,
					icon: IconTrendingUp,
					trend: 'up' as const
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
		// Fallback dummy data
		return [
			{ title: 'Total Revenue', value: '$48,352', change: 12.5, icon: IconCash, trend: 'up' as const },
			{ title: 'Total Orders', value: '1,847', change: 8.2, icon: IconShoppingCart, trend: 'up' as const },
			{ title: 'Average Order Value', value: '$26.18', change: 3.4, icon: IconTrendingUp, trend: 'up' as const },
			{ title: 'New Customers', value: '234', change: -2.1, icon: IconUsers, trend: 'down' as const }
		];
	});

	// Top selling items from API or fallback
	let topSellingItems = $derived.by(() => {
		if (data.topItems && data.topItems.length > 0) {
			return data.topItems.map((item) => ({
				name: item.name,
				category: item.category,
				sold: item.quantitySold,
				revenue: formatCurrency(item.revenue)
			}));
		}
		// Fallback dummy data
		return [
			{ name: 'Margherita Pizza', category: 'Pizza', sold: 342, revenue: '$5,130' },
			{ name: 'Caesar Salad', category: 'Salads', sold: 256, revenue: '$2,816' },
			{ name: 'Grilled Salmon', category: 'Main Course', sold: 198, revenue: '$4,950' },
			{ name: 'Tiramisu', category: 'Desserts', sold: 187, revenue: '$1,309' },
			{ name: 'Chicken Wings', category: 'Appetizers', sold: 176, revenue: '$1,584' }
		];
	});

	// Peak hours from API or fallback
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
		// Fallback dummy data
		return [
			{ hour: '11:00 AM', orders: 45, revenue: '$1,180', percentage: 33.6 },
			{ hour: '12:00 PM', orders: 89, revenue: '$2,336', percentage: 66.4 },
			{ hour: '1:00 PM', orders: 112, revenue: '$2,912', percentage: 83.6 },
			{ hour: '6:00 PM', orders: 78, revenue: '$2,028', percentage: 58.2 },
			{ hour: '7:00 PM', orders: 134, revenue: '$3,484', percentage: 100 },
			{ hour: '8:00 PM', orders: 98, revenue: '$2,548', percentage: 73.1 }
		];
	});
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
					<select
						value={dateRange}
						onchange={onDateRangeChange}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="7d">Last 7 days</option>
						<option value="30d">Last 30 days</option>
						<option value="90d">Last 90 days</option>
						<option value="1y">Last year</option>
					</select>
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
								{#if kpi.trend === 'up'}
									<span class="text-green-600">+{kpi.change}%</span>
								{:else}
									<span class="text-red-600">{kpi.change}%</span>
								{/if}
								from last period
							</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Charts Section -->
			<div class="px-6">
				<AreaChartInteractive />
			</div>

			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<!-- Top Selling Items -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Top Selling Items</Card.Title>
						<Card.Description>Best performers this period</Card.Description>
					</Card.Header>
					<Card.Content>
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
					</Card.Content>
				</Card.Root>

				<!-- Peak Hours -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Peak Hours</Card.Title>
						<Card.Description>Busiest times of the day</Card.Description>
					</Card.Header>
					<Card.Content>
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
					</Card.Content>
				</Card.Root>
			</div>

			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
				<BarChart />
				<BarChart />
				<PieChart />
			</div>
		</div>
	</div>
</div>
