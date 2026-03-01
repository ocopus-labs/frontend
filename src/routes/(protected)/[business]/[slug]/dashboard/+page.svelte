<script lang="ts">
	import StatsCard from '$lib/components/global/stats-card.svelte';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconRefresh,
		IconAlertTriangle,
		IconTrophy,
		IconReceipt,
		IconPlus,
		IconArmchair,
		IconClipboardList,
		IconCircleCheck,
		IconCircleX,
		IconActivity
	} from '@tabler/icons-svelte';

	let { data } = $props();

	const config = data.config ?? {
		label: 'Dashboard',
		description: 'Business management dashboard'
	};

	const currency = $derived(
		((data.business as any)?.settings?.currency || 'USD') as CurrencyCode
	);

	function formatCurrency(value: number): string {
		return i18nFormatCurrency(value, currency);
	}

	let selectedPeriod = $state(data.period || 'month');
	let isRefreshing = $state(false);

	const periodLabels: Record<string, string> = {
		today: 'Today',
		yesterday: 'Yesterday',
		week: 'This Week',
		month: 'This Month'
	};

	function onPeriodChange(value: string) {
		selectedPeriod = value;
		const url = new URL($page.url);
		url.searchParams.set('period', selectedPeriod);
		goto(url.toString(), { replaceState: true });
	}

	async function refreshDashboard() {
		isRefreshing = true;
		try {
			await invalidate('app:dashboard');
		} finally {
			isRefreshing = false;
		}
	}

	// Extract sparkline-ready arrays from revenue trends (last 14 days)
	const revenueSparkline = $derived(
		(data.revenueTrends || []).slice(-14).map((d: any) => d.revenue ?? 0)
	);
	const ordersSparkline = $derived(
		(data.revenueTrends || []).slice(-14).map((d: any) => d.orders ?? 0)
	);
	const aovSparkline = $derived(
		(data.revenueTrends || [])
			.slice(-14)
			.map((d: any) => (d.orders ? (d.revenue ?? 0) / d.orders : 0))
	);

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
					href: 'orders/history',
					sparklineData: revenueSparkline.length >= 2 ? revenueSparkline : undefined
				},
				{
					title: 'Total Orders',
					value: orders.totalOrders,
					change: comparison?.ordersChange ?? 0,
					description: `${orders.activeOrders} active`,
					href: 'orders/pending',
					sparklineData: ordersSparkline.length >= 2 ? ordersSparkline : undefined
				},
				{
					title: 'Avg Order Value',
					value: formatCurrency(orders.averageOrderValue),
					change: comparison?.aovChange ?? 0,
					description: 'Per completed order',
					href: 'analytics',
					sparklineData: aovSparkline.length >= 2 ? aovSparkline : undefined
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

	// Format hourly breakdown for bar chart (short labels for chart axis)
	const hourlyChartData = $derived(
		(data.hourlyBreakdown || []).map((h: any) => {
			const hr = h.hour;
			const suffix = hr >= 12 ? 'p' : 'a';
			const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
			return { ...h, hour: `${hr12}${suffix}` };
		})
	);

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
					'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
					'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
				];
				label = `${monthNames[month - 1]} ${day}`;
			}
			return { ...d, date: label };
		})
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
	const basePath = $derived(
		`/${(data.business as any)?.type}/${(data.business as any)?.slug}`
	);

	// Table stats
	const tableStats = $derived((data as any).tableStats);
	const tableOccupancyPercent = $derived(
		tableStats && tableStats.total > 0
			? Math.round((tableStats.occupied / tableStats.total) * 100)
			: 0
	);

	// Order stats for pipeline
	const orderStats = $derived((data as any).orderStats);

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

	function getActivityIcon(status: string) {
		switch (status) {
			case 'completed':
				return 'text-green-500';
			case 'cancelled':
				return 'text-red-500';
			case 'active':
				return 'text-blue-500';
			default:
				return 'text-muted-foreground';
		}
	}

	function getActivityLabel(order: any): string {
		const name = order.customerInfo?.name || 'Walk-in';
		switch (order.status) {
			case 'completed':
				return `${name} paid ${formatCurrency(order.pricing?.total ?? 0)}`;
			case 'cancelled':
				return `Order #${order.orderNumber} cancelled`;
			case 'active':
				return `${name} placed order #${order.orderNumber}`;
			default:
				return `Order #${order.orderNumber} — ${name}`;
		}
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
					<Select.Root
						type="single"
						value={selectedPeriod}
						onValueChange={(v) => onPeriodChange(v)}
					>
						<Select.Trigger
							class="w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{periodLabels[selectedPeriod] ?? selectedPeriod}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="today">Today</Select.Item>
							<Select.Item value="yesterday">Yesterday</Select.Item>
							<Select.Item value="week">This Week</Select.Item>
							<Select.Item value="month">This Month</Select.Item>
						</Select.Content>
					</Select.Root>
					<Button
						href="{basePath}/pos/new-order"
						class="bg-orange-600 text-white shadow-md hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
					>
						<IconPlus class="mr-1.5 h-4 w-4" />
						New Order
					</Button>
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
				<!-- Stats Cards with sparklines -->
				<StatsCard {stats} {basePath} />

				<!-- Live Operations Strip -->
				<div class="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3 lg:px-6">
					<!-- Table Occupancy -->
					<Card.Root class="p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10"
							>
								<IconArmchair class="h-5 w-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-xs font-medium text-muted-foreground">Table Occupancy</p>
								{#if tableStats}
									<div class="mt-1 flex items-center gap-2">
										<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full transition-all duration-500 {tableOccupancyPercent > 80
													? 'bg-red-500'
													: tableOccupancyPercent > 50
														? 'bg-amber-500'
														: 'bg-green-500'}"
												style="width: {tableOccupancyPercent}%"
											></div>
										</div>
										<span class="text-sm font-semibold tabular-nums">
											{tableStats.occupied}/{tableStats.total}
										</span>
									</div>
								{:else}
									<p class="mt-0.5 text-sm font-semibold">No tables</p>
								{/if}
							</div>
						</div>
					</Card.Root>

					<!-- Active Orders -->
					<Card.Root class="p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10"
							>
								<IconClipboardList class="h-5 w-5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-xs font-medium text-muted-foreground">Active Orders</p>
								<p class="text-lg font-bold tabular-nums">
									{orderStats?.activeOrders ?? data.dashboardStats?.orders?.activeOrders ?? 0}
								</p>
							</div>
						</div>
					</Card.Root>

					<!-- Order Pipeline -->
					<Card.Root class="p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10"
							>
								<IconActivity class="h-5 w-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="mb-1.5 text-xs font-medium text-muted-foreground">Order Pipeline</p>
								<div class="flex items-center gap-3 text-xs">
									<div class="flex items-center gap-1">
										<IconClipboardList class="h-3.5 w-3.5 text-blue-500" />
										<span class="font-semibold tabular-nums">
											{orderStats?.activeOrders ??
												data.dashboardStats?.orders?.activeOrders ??
												0}
										</span>
										<span class="text-muted-foreground">Active</span>
									</div>
									<div class="flex items-center gap-1">
										<IconCircleCheck class="h-3.5 w-3.5 text-green-500" />
										<span class="font-semibold tabular-nums">
											{orderStats?.completedOrders ??
												data.dashboardStats?.orders?.completedOrders ??
												0}
										</span>
										<span class="text-muted-foreground">Done</span>
									</div>
									{#if orderStats?.cancelledOrders}
										<div class="flex items-center gap-1">
											<IconCircleX class="h-3.5 w-3.5 text-red-500" />
											<span class="font-semibold tabular-nums">
												{orderStats.cancelledOrders}
											</span>
											<span class="text-muted-foreground">Cancelled</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</Card.Root>
				</div>

				<!-- Main Content: Revenue Chart + Live Activity Feed -->
				<div class="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
					<!-- Revenue Chart (2/3 width) -->
					<div class="lg:col-span-2">
						{#if revenueTrendsData.length > 0}
							<BarChart
								title="Revenue Trends"
								description="Daily revenue over time"
								data={revenueTrendsData}
								xKey="date"
								series={[
									{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
									{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }
								]}
							/>
						{:else}
							<BarChart title="Revenue Trends" description="Daily revenue over time" />
						{/if}
					</div>

					<!-- Live Activity Feed (1/3 width) -->
					<Card.Root class="flex max-h-[460px] flex-col">
						<Card.Header class="flex flex-row items-center justify-between pb-3">
							<div>
								<Card.Title class="flex items-center gap-2 text-sm font-semibold">
									<IconActivity class="h-4 w-4 text-orange-500" />
									Live Activity
								</Card.Title>
							</div>
							<Button variant="ghost" size="sm" href="{basePath}/orders/pending">
								View All
							</Button>
						</Card.Header>
						<Card.Content class="flex-1 overflow-y-auto pr-2">
							{#if (data.recentOrders as any[])?.length > 0}
								<div class="space-y-1">
									{#each data.recentOrders as any[] as order (order.id)}
										<a
											href="{basePath}/orders/{order.id}"
											class="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
										>
											<div
												class="mt-0.5 h-2 w-2 shrink-0 rounded-full {getActivityIcon(order.status)}"
												style="background-color: currentColor;"
											></div>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm">{getActivityLabel(order)}</p>
												<p class="text-xs text-muted-foreground">
													{formatRelativeTime(order.createdAt)}
												</p>
											</div>
											<span class="shrink-0 text-xs font-medium tabular-nums">
												{formatCurrency(order.pricing?.total ?? 0)}
											</span>
										</a>
									{/each}
								</div>
							{:else}
								<div
									class="flex flex-col items-center justify-center py-8 text-muted-foreground"
								>
									<IconReceipt class="mb-2 h-8 w-8 opacity-50" />
									<p class="text-sm">No recent activity</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Secondary Charts: Payment Methods + Orders by Hour -->
				<div class="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
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

				<!-- Top Selling Items -->
				<div class="px-4 lg:px-6">
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
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
									{#each data.topItems as any[] as item, i (item.id)}
										<div
											class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
										>
											<span
												class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400"
											>
												{i + 1}
											</span>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium">{item.name}</p>
												<p class="text-xs text-muted-foreground">
													{item.quantitySold} sold &middot; {formatCurrency(item.revenue)}
												</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">No sales data yet</p>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
		</div>
	</div>
</div>
