<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import {
		IconDownload,
		IconFileSpreadsheet,
		IconFileTypePdf,
		IconCalendar,
		IconRefresh,
		IconTrendingUp,
		IconTrendingDown
	} from '@tabler/icons-svelte';
	import type { FullReport, SalesSummary, TopSellingItemAnalytics, PaymentMethodBreakdown } from '$lib/api';
	import AreaChartInteractive from '$lib/components/chart/area-chart-interactive.svelte';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';

	let { data }: { data: PageData } = $props();

	let report = $state<FullReport | null>(data.report);
	let salesSummary = $state<SalesSummary>(data.salesSummary);
	let topItems = $state<TopSellingItemAnalytics[]>(data.topItems || []);
	let paymentBreakdown = $state<PaymentMethodBreakdown[]>(data.paymentBreakdown || []);
	let period = $state(data.period || 'month');

	function handlePeriodChange(newPeriod: string) {
		goto(`?period=${newPeriod}`);
	}

	function downloadReport(format: string) {
		console.log('Download report as', format);
		// TODO: Implement export functionality
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat('en-US').format(num);
	}

	function getPeriodLabel(p: string): string {
		switch (p) {
			case 'today':
				return 'Today';
			case 'yesterday':
				return 'Yesterday';
			case 'week':
				return 'This Week';
			case 'month':
				return 'This Month';
			case 'quarter':
				return 'This Quarter';
			case 'year':
				return 'This Year';
			default:
				return 'Custom Period';
		}
	}

	function getPaymentMethodColor(method: string): string {
		const colors: Record<string, string> = {
			cash: 'bg-green-500',
			card: 'bg-blue-500',
			upi: 'bg-purple-500',
			bank_transfer: 'bg-yellow-500',
			cheque: 'bg-orange-500',
			other: 'bg-gray-500'
		};
		return colors[method.toLowerCase()] || 'bg-gray-500';
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Reports</h1>
					<p class="text-muted-foreground">Generate and download business reports</p>
				</div>
				<div class="flex gap-2">
					<select
						bind:value={period}
						onchange={() => handlePeriodChange(period)}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="today">Today</option>
						<option value="yesterday">Yesterday</option>
						<option value="week">This Week</option>
						<option value="month">This Month</option>
						<option value="quarter">This Quarter</option>
						<option value="year">This Year</option>
					</select>
					<Button variant="outline" onclick={() => downloadReport('pdf')}>
						<IconFileTypePdf class="mr-2 h-4 w-4" />
						PDF
					</Button>
					<Button variant="outline" onclick={() => downloadReport('excel')}>
						<IconFileSpreadsheet class="mr-2 h-4 w-4" />
						Excel
					</Button>
				</div>
			</div>

			<!-- Sales Summary Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Revenue</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-green-600">{formatCurrency(salesSummary.totalRevenue)}</div>
						<p class="text-sm text-muted-foreground">{getPeriodLabel(period)}</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatNumber(salesSummary.totalOrders)}</div>
						<p class="text-sm text-muted-foreground">{getPeriodLabel(period)}</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Average Order Value</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatCurrency(salesSummary.averageOrderValue)}</div>
						<p class="text-sm text-muted-foreground">per order</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Net Revenue</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-blue-600">{formatCurrency(salesSummary.netRevenue)}</div>
						<p class="text-sm text-muted-foreground">after discounts & taxes</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Tax and Discount Summary -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Tax Collected</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatCurrency(salesSummary.totalTax)}</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Discounts Given</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-red-600">{formatCurrency(salesSummary.totalDiscount)}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Revenue Trend Chart -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Revenue Trend</Card.Title>
						<Card.Description>Sales performance over time</Card.Description>
					</Card.Header>
					<Card.Content>
						<AreaChartInteractive />
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Top Selling Items and Payment Methods -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Top Selling Items</Card.Title>
						<Card.Description>Best performing menu items</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if topItems.length > 0}
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Item</Table.Head>
										<Table.Head>Category</Table.Head>
										<Table.Head class="text-right">Quantity</Table.Head>
										<Table.Head class="text-right">Revenue</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each topItems.slice(0, 5) as item, i}
										<Table.Row>
											<Table.Cell>
												<div class="flex items-center gap-2">
													<span class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
														{i + 1}
													</span>
													<span class="font-medium">{item.itemName}</span>
												</div>
											</Table.Cell>
											<Table.Cell>
												<Badge variant="outline">{item.category}</Badge>
											</Table.Cell>
											<Table.Cell class="text-right">{formatNumber(item.quantitySold)}</Table.Cell>
											<Table.Cell class="text-right font-medium text-green-600">
												{formatCurrency(item.revenue)}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No sales data for this period</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Payment Methods</Card.Title>
						<Card.Description>Revenue breakdown by payment type</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if paymentBreakdown.length > 0}
							<div class="space-y-4">
								{#each paymentBreakdown as payment}
									<div class="space-y-2">
										<div class="flex items-center justify-between text-sm">
											<div class="flex items-center gap-2">
												<div class="h-3 w-3 rounded-full {getPaymentMethodColor(payment.method)}"></div>
												<span class="font-medium capitalize">{payment.method.replace('_', ' ')}</span>
											</div>
											<div class="text-right">
												<span class="font-medium">{formatCurrency(payment.amount)}</span>
												<span class="text-muted-foreground"> ({payment.percentage.toFixed(1)}%)</span>
											</div>
										</div>
										<div class="h-2 w-full rounded-full bg-muted">
											<div
												class="h-full rounded-full {getPaymentMethodColor(payment.method)}"
												style="width: {Math.min(payment.percentage, 100)}%"
											></div>
										</div>
										<p class="text-xs text-muted-foreground">{formatNumber(payment.count)} transactions</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No payment data for this period</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Charts Row -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Daily Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<BarChart />
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Revenue Distribution</Card.Title>
					</Card.Header>
					<Card.Content class="flex items-center justify-center">
						<PieChart />
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Staff Performance (if available in report) -->
			{#if report?.staffPerformance && report.staffPerformance.length > 0}
				<div class="px-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>Staff Performance</Card.Title>
							<Card.Description>Team member productivity metrics</Card.Description>
						</Card.Header>
						<Card.Content>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Staff Member</Table.Head>
										<Table.Head class="text-right">Orders Processed</Table.Head>
										<Table.Head class="text-right">Revenue Generated</Table.Head>
										<Table.Head class="text-right">Avg Order Value</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each report.staffPerformance as staff}
										<Table.Row>
											<Table.Cell class="font-medium">{staff.staffName}</Table.Cell>
											<Table.Cell class="text-right">{formatNumber(staff.ordersProcessed)}</Table.Cell>
											<Table.Cell class="text-right text-green-600">{formatCurrency(staff.revenue)}</Table.Cell>
											<Table.Cell class="text-right">{formatCurrency(staff.averageOrderValue)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			<!-- All Available Report Types -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Available Reports</Card.Title>
						<Card.Description>Generate detailed reports for specific areas</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<Card.Root class="flex flex-col">
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<Card.Title class="text-base">Sales Report</Card.Title>
										<Badge>Daily</Badge>
									</div>
								</Card.Header>
								<Card.Content class="flex-1">
									<p class="text-sm text-muted-foreground">Detailed breakdown of daily sales and transactions</p>
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="outline" class="w-full">
										<IconRefresh class="mr-2 h-4 w-4" />
										Generate Now
									</Button>
								</Card.Footer>
							</Card.Root>

							<Card.Root class="flex flex-col">
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<Card.Title class="text-base">Inventory Report</Card.Title>
										<Badge variant="secondary">Weekly</Badge>
									</div>
								</Card.Header>
								<Card.Content class="flex-1">
									<p class="text-sm text-muted-foreground">Stock levels, low stock alerts, and reorder suggestions</p>
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="outline" class="w-full">
										<IconRefresh class="mr-2 h-4 w-4" />
										Generate Now
									</Button>
								</Card.Footer>
							</Card.Root>

							<Card.Root class="flex flex-col">
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<Card.Title class="text-base">Staff Performance</Card.Title>
										<Badge variant="outline">Monthly</Badge>
									</div>
								</Card.Header>
								<Card.Content class="flex-1">
									<p class="text-sm text-muted-foreground">Team productivity and order processing metrics</p>
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="outline" class="w-full">
										<IconRefresh class="mr-2 h-4 w-4" />
										Generate Now
									</Button>
								</Card.Footer>
							</Card.Root>

							<Card.Root class="flex flex-col">
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<Card.Title class="text-base">Tax Summary</Card.Title>
										<Badge variant="outline">Monthly</Badge>
									</div>
								</Card.Header>
								<Card.Content class="flex-1">
									<p class="text-sm text-muted-foreground">Tax collected breakdown for accounting and filing</p>
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="outline" class="w-full">
										<IconRefresh class="mr-2 h-4 w-4" />
										Generate Now
									</Button>
								</Card.Footer>
							</Card.Root>

							<Card.Root class="flex flex-col">
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<Card.Title class="text-base">Expense Report</Card.Title>
										<Badge variant="secondary">Weekly</Badge>
									</div>
								</Card.Header>
								<Card.Content class="flex-1">
									<p class="text-sm text-muted-foreground">Expense tracking and category breakdown</p>
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="outline" class="w-full">
										<IconRefresh class="mr-2 h-4 w-4" />
										Generate Now
									</Button>
								</Card.Footer>
							</Card.Root>

							<Card.Root class="flex flex-col">
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<Card.Title class="text-base">Customer Insights</Card.Title>
										<Badge variant="outline">Monthly</Badge>
									</div>
								</Card.Header>
								<Card.Content class="flex-1">
									<p class="text-sm text-muted-foreground">Customer trends, repeat visits, and preferences</p>
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="outline" class="w-full">
										<IconRefresh class="mr-2 h-4 w-4" />
										Generate Now
									</Button>
								</Card.Footer>
							</Card.Root>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>
