<script lang="ts">
	import type { PageData } from './$types';
	import AreaChartInteractive from '$lib/components/chart/area-chart-interactive.svelte';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';
	import StatsCard from '$lib/components/global/stats-card.svelte';

	let { data } = $props();

	const businessType = data.businessType;
	const config = data.config ?? {
		label: 'Dashboard',
		description: 'Business management dashboard'
	};

	// Helper to format currency
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	// Build stats from real data if available, fallback to placeholders
	let stats = $derived.by(() => {
		const dashboardStats = data.dashboardStats;

		if (dashboardStats) {
			const { orders, payments } = dashboardStats;
			return [
				{
					title: 'Total Orders',
					value: orders.totalOrders,
					change: 0, // TODO: Calculate from historical data
					description: `${orders.activeOrders} active`
				},
				{
					title: 'Total Revenue',
					value: formatCurrency(orders.totalRevenue),
					change: 0,
					description: `${orders.completedOrders} completed`
				},
				{
					title: 'Avg Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: 0,
					description: 'Per completed order'
				},
				{
					title: 'Payments',
					value: payments.totalPayments,
					change: 0,
					description: formatCurrency(payments.totalAmount) + ' collected'
				}
			];
		}

		// Fallback to mock data based on business type
		switch (businessType) {
			case 'retail':
				return [
					{ title: 'Total Sales', value: '$12,450', change: 8.2 },
					{ title: 'Items Sold', value: 342, change: 5.4 },
					{ title: 'New Customers', value: 128, change: 3.2 },
					{ title: 'Inventory Value', value: '$45,230', change: 2.1 }
				];
			case 'cafe':
				return [
					{ title: 'Total Orders', value: 856, change: 12.5 },
					{ title: 'Coffee Sales', value: '$3,240', change: 8.1 },
					{ title: 'Repeat Customers', value: 234, change: 5.3 },
					{ title: 'Avg Order Value', value: '$8.50', change: 2.2 }
				];
			case 'bar':
				return [
					{ title: 'Total Orders', value: 456, change: 15.3 },
					{ title: 'Beverage Revenue', value: '$5,680', change: 11.2 },
					{ title: 'Customers Today', value: 312, change: 8.5 },
					{ title: 'Avg Check Value', value: '$22.50', change: 5.1 }
				];
			default: // restaurant
				return [
					{ title: 'Total Orders', value: 1200, change: 5.4 },
					{ title: 'Total Revenue', value: '$34,000', change: 3.2 },
					{ title: 'New Customers', value: 300, change: 8.1 },
					{ title: 'Returning Customers', value: 150, change: -2.5 }
				];
		}
	});
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-2">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2 px-6">
				<h1 class="text-2xl font-bold">{config.label} Dashboard</h1>
				<p class="text-muted-foreground">{config.description}</p>
			</div>
			<StatsCard bind:stats />
			<div class="mx-6">
				<AreaChartInteractive />
				<div class="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="">
						<BarChart />
					</div>
					<div class="">
						<BarChart />
					</div>
					<div class="">
						<PieChart />
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
