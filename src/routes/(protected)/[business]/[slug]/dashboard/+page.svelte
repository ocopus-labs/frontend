<script lang="ts">
	import type { PageData } from './$types';
	import StatsCard from '$lib/components/global/stats-card.svelte';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import {
		StatusPill,
		QuickActionCard,
		MetricRing,
		StatComparison
	} from '$lib/components/data-display';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconRefresh,
		IconAlertTriangle,
		IconTrophy,
		IconReceipt,
		IconPlus,
		IconArmchair,
		IconToolsKitchen2,
		IconChartBar
	} from '@tabler/icons-svelte';

	let { data } = $props();

	const config = data.config ?? {
		label: 'Dashboard',
		description: 'Business management dashboard'
	};

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(value: number): string {
		return i18nFormatCurrency(value, currency);
	}

	let selectedPeriod = $state(data.period || 'month');
	let isRefreshing = $state(false);

	function onPeriodChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedPeriod = select.value;
		const url = new URL($page.url);
		url.searchParams.set('period', selectedPeriod);
		goto(url.toString(), { replaceState: true });
	}

	async function refreshDashboard() {
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			isRefreshing = false;
		}
	}

	// Build stats from real data with real change %
	let stats = $derived.by(() => {
		const dashboardStats = data.dashboardStats;
		const comparison = data.analyticsComparison?.comparison;

		if (dashboardStats) {
			const { orders, payments } = dashboardStats;
			return [
				{
					title: 'Total Revenue',
					value: formatCurrency(orders.totalRevenue),
					change: comparison?.revenueChange ?? 0,
					description: `${orders.completedOrders} completed`,
					href: 'orders/history'
				},
				{
					title: 'Total Orders',
					value: orders.totalOrders,
					change: comparison?.ordersChange ?? 0,
					description: `${orders.activeOrders} active`,
					href: 'orders/pending'
				},
				{
					title: 'Avg Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: comparison?.aovChange ?? 0,
					description: 'Per completed order',
					href: 'analytics'
				},
				{
					title: 'Payments',
					value: payments.totalPayments,
					change: 0,
					description: formatCurrency(payments.totalAmount) + ' collected',
					href: 'analytics'
				}
			];
		}

		return [
			{
				title: 'Total Revenue',
				value: formatCurrency(0),
				change: 0,
				description: 'No data yet',
				href: 'orders/history'
			},
			{
				title: 'Total Orders',
				value: 0,
				change: 0,
				description: 'No data yet',
				href: 'orders/pending'
			},
			{
				title: 'Avg Order Value',
				value: formatCurrency(0),
				change: 0,
				description: 'No data yet',
				href: 'analytics'
			},
			{ title: 'Payments', value: 0, change: 0, description: 'No data yet', href: 'analytics' }
		];
	});

	// Format hourly breakdown for bar chart
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

	// Check if data failed to load
	const hasError = $derived(
		(data as any).statsError != null ||
			(!(data as any).dashboardStats && !(data as any).analyticsComparison)
	);

	// Build base path for navigation
	const basePath = $derived(`/${(data.business as any)?.type}/${(data.business as any)?.slug}`);

	// Status badge variant
	function getStatusPillStatus(
		status: string
	): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
		switch (status) {
			case 'active':
				return 'info';
			case 'completed':
				return 'success';
			case 'cancelled':
				return 'error';
			default:
				return 'neutral';
		}
	}

	function formatRelativeTime(dateStr: string): string {
		const now = new Date();
		const date = new Date(dateStr);
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-2">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="{config.label} Dashboard" description={config.description}>
				{#snippet actions()}
					<Button
						variant="outline"
						size="icon"
						onclick={refreshDashboard}
						disabled={isRefreshing}
						aria-label="Refresh dashboard"
					>
						<IconRefresh class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
					</Button>
					<select
						value={selectedPeriod}
						onchange={onPeriodChange}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="today">Today</option>
						<option value="yesterday">Yesterday</option>
						<option value="week">This Week</option>
						<option value="month">This Month</option>
					</select>
				{/snippet}
			</PageHeader>

			<!-- Error state -->
			{#if hasError && !data.dashboardStats}
				<div class="px-6">
					<Alert.Root variant="destructive">
						<IconAlertTriangle class="h-4 w-4" />
						<Alert.Title>Failed to load dashboard data</Alert.Title>
						<Alert.Description>
							{data.statsError || 'Could not connect to the server. Please try again.'}
							<Button variant="outline" size="sm" class="mt-2" onclick={refreshDashboard}>
								{isRefreshing ? 'Retrying...' : 'Retry'}
							</Button>
						</Alert.Description>
					</Alert.Root>
				</div>
			{:else}
				<!-- Stats Cards -->
				<StatsCard {stats} {basePath} />

				<!-- Quick Actions -->
				<div class="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4 lg:px-6">
					<QuickActionCard
						title="New Order"
						description="Start taking an order"
						icon={IconPlus as any}
						href="{basePath}/pos/new-order"
						size="sm"
						variant="gradient"
						showArrow
					/>
					<QuickActionCard
						title="Tables"
						description="View floor plan"
						icon={IconArmchair as any}
						href="{basePath}/tables/layout"
						size="sm"
						showArrow
					/>
					<QuickActionCard
						title="Menu"
						description="Manage items"
						icon={IconToolsKitchen2 as any}
						href="{basePath}/menu/items"
						size="sm"
						showArrow
					/>
					<QuickActionCard
						title="Reports"
						description="View analytics"
						icon={IconChartBar as any}
						href="{basePath}/dashboard/reports"
						size="sm"
						showArrow
					/>
				</div>

				<!-- Revenue comparison + Order completion ring -->
				{#if data.analyticsComparison?.comparison}
					<div class="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
						<div class="lg:col-span-2">
							<StatComparison
								label="Revenue"
								currentValue={data.dashboardStats?.orders?.totalRevenue ?? 0}
								previousValue={(data.dashboardStats?.orders?.totalRevenue ?? 0) /
									(1 + (data.analyticsComparison.comparison.revenueChange ?? 0) / 100) || 0}
								format="currency"
								{currency}
								currentLabel="This period"
								previousLabel="Previous"
							/>
						</div>
						<Card.Root>
							<Card.Content class="flex flex-col items-center justify-center gap-2 py-6">
								<MetricRing
									value={data.dashboardStats?.orders?.completedOrders ?? 0}
									max={Math.max(data.dashboardStats?.orders?.totalOrders ?? 1, 1)}
									color="success"
									label="Completed"
									size="lg"
								/>
								<p class="text-sm text-muted-foreground">
									{data.dashboardStats?.orders?.completedOrders ?? 0} of {data.dashboardStats
										?.orders?.totalOrders ?? 0} orders
								</p>
							</Card.Content>
						</Card.Root>
					</div>
				{/if}

				<!-- Charts: responsive layout — revenue full width on top, other 2 side by side -->
				<div class="mx-6">
					<div class="grid grid-cols-1 gap-4 py-4 lg:grid-cols-2">
						{#if data.revenueTrends && data.revenueTrends.length > 0}
							<div class=" lg:col-span-2">
								<BarChart
									title="Revenue Trends"
									description="Daily revenue over time"
									data={data.revenueTrends}
									xKey="date"
									series={[
										{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
										{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }
									]}
								/>
							</div>
						{:else}
							<div class="lg:col-span-2">
								<BarChart title="Revenue Trends" description="Daily revenue over time" />
							</div>
						{/if}

						{#if paymentChartData.length > 0}
							<PieChart
								title="Payment Methods"
								description="Breakdown by payment type"
								data={paymentChartData}
								labelKey="method"
								valueKey="amount"
							/>
						{:else}
							<PieChart title="Payment Methods" description="Breakdown by payment type" />
						{/if}

						{#if hourlyChartData.length > 0}
							<BarChart
								title="Orders by Hour"
								description="Today's order distribution"
								data={hourlyChartData}
								xKey="hour"
								series={[
									{ key: 'orders', label: 'Orders', color: 'var(--chart-3)' },
									{ key: 'revenue', label: 'Revenue', color: 'var(--chart-4)' }
								]}
							/>
						{:else}
							<BarChart title="Orders by Hour" description="Today's order distribution" />
						{/if}
					</div>
				</div>

				<!-- Top Selling Items & Recent Orders -->
				<div class="mx-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
					<!-- Top Selling Items -->
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between">
							<div>
								<Card.Title class="flex items-center gap-2">
									<IconTrophy class="h-4 w-4 text-amber-500" />
									Top Selling Items
								</Card.Title>
								<Card.Description>Best performers this period</Card.Description>
							</div>
						</Card.Header>
						<Card.Content>
							{#if (data.topItems as any[])?.length > 0}
								<div class="space-y-3">
									{#each data.topItems as any[] as item, i (item.id)}
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-3">
												<span
													class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium"
												>
													{i + 1}
												</span>
												<div>
													<p class="text-sm font-medium">{item.name}</p>
													<p class="text-xs text-muted-foreground">{item.category}</p>
												</div>
											</div>
											<div class="text-right">
												<p class="text-sm font-medium">{formatCurrency(item.revenue)}</p>
												<p class="text-xs text-muted-foreground">{item.quantitySold} sold</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">No sales data yet</p>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Recent Orders -->
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between">
							<div>
								<Card.Title class="flex items-center gap-2">
									<IconReceipt class="h-4 w-4" />
									Recent Orders
								</Card.Title>
								<Card.Description>Latest order activity</Card.Description>
							</div>
							<Button variant="ghost" size="sm" href="{basePath}/orders/pending">View All</Button>
						</Card.Header>
						<Card.Content>
							{#if (data.recentOrders as any[])?.length > 0}
								<div class="space-y-3">
									{#each data.recentOrders as any[] as order (order.id)}
										<a
											href="{basePath}/orders/{order.id}"
											class="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
										>
											<div>
												<p class="text-sm font-medium">#{order.orderNumber}</p>
												<p class="text-xs text-muted-foreground">
													{order.customerInfo?.name || 'Walk-in'} &middot; {formatRelativeTime(
														order.createdAt
													)}
												</p>
											</div>
											<div class="flex items-center gap-2">
												<span class="text-sm font-medium"
													>{formatCurrency(order.pricing?.total ?? 0)}</span
												>
												<StatusPill
													label={order.status}
													status={getStatusPillStatus(order.status)}
													size="sm"
												/>
											</div>
										</a>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">No recent orders</p>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
		</div>
	</div>
</div>
