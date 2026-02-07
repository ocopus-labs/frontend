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
	import { toast } from 'svelte-sonner';
	import type { FullReport, SalesSummary, TopSellingItemAnalytics, PaymentMethodBreakdown } from '$lib/api';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { downloadCsv, downloadPdf } from '$lib/utils/export';

	let { data }: { data: PageData } = $props();

	let report = $state<FullReport | null>(data.report);
	let salesSummary = $state<SalesSummary>(data.salesSummary);
	let topItems = $state<TopSellingItemAnalytics[]>(data.topItems || []);
	let paymentBreakdown = $state<PaymentMethodBreakdown[]>(data.paymentBreakdown || []);
	let period = $state(data.period || 'month');
	let reportContentEl = $state<HTMLElement | null>(null);
	let isExporting = $state(false);

	function handlePeriodChange(newPeriod: string) {
		goto(`?period=${newPeriod}`);
	}

	async function exportCsv() {
		try {
			const headers = ['Section', 'Metric', 'Value'];
			const rows: (string | number)[][] = [];

			// Sales summary
			rows.push(['Sales Summary', 'Total Revenue', salesSummary.totalRevenue]);
			rows.push(['Sales Summary', 'Total Orders', salesSummary.totalOrders]);
			rows.push(['Sales Summary', 'Average Order Value', salesSummary.averageOrderValue]);
			rows.push(['Sales Summary', 'Net Revenue', salesSummary.netRevenue]);
			rows.push(['Sales Summary', 'Total Tax', salesSummary.totalTax]);
			rows.push(['Sales Summary', 'Total Discount', salesSummary.totalDiscount]);

			// Top selling items
			for (const item of topItems) {
				rows.push(['Top Items', item.itemName, item.revenue]);
				rows.push(['Top Items', `${item.itemName} (Qty)`, item.quantitySold]);
				rows.push(['Top Items', `${item.itemName} (Category)`, item.category]);
			}

			// Payment breakdown
			for (const payment of paymentBreakdown) {
				rows.push(['Payment Methods', payment.method, payment.amount]);
				rows.push(['Payment Methods', `${payment.method} (Count)`, payment.count]);
				rows.push(['Payment Methods', `${payment.method} (%)`, payment.percentage]);
			}

			// Staff performance
			if (report?.staffPerformance) {
				for (const staff of report.staffPerformance) {
					rows.push(['Staff Performance', staff.staffName, staff.revenue]);
					rows.push(['Staff Performance', `${staff.staffName} (Orders)`, staff.ordersProcessed]);
					rows.push(['Staff Performance', `${staff.staffName} (Avg Order)`, staff.averageOrderValue]);
				}
			}

			const filename = `report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
			downloadCsv(filename, headers, rows);
			toast.success('CSV report downloaded successfully');
		} catch (err) {
			toast.error('Failed to export CSV report');
		}
	}

	async function exportPdf() {
		if (!reportContentEl) {
			toast.error('Report content not found');
			return;
		}
		isExporting = true;
		try {
			const filename = `report-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
			await downloadPdf(reportContentEl, filename);
			toast.success('PDF report downloaded successfully');
		} catch (err) {
			toast.error('Failed to export PDF report');
		} finally {
			isExporting = false;
		}
	}

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
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
					<Button variant="outline" onclick={exportPdf} disabled={isExporting}>
						<IconFileTypePdf class="mr-2 h-4 w-4" />
						{isExporting ? 'Exporting...' : 'PDF'}
					</Button>
					<Button variant="outline" onclick={exportCsv}>
						<IconFileSpreadsheet class="mr-2 h-4 w-4" />
						CSV
					</Button>
				</div>
			</div>

			<div bind:this={reportContentEl} class="report-content">
			<!-- Sales Summary Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Revenue</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-success">{formatCurrency(salesSummary.totalRevenue)}</div>
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
						<div class="text-2xl font-bold text-info">{formatCurrency(salesSummary.netRevenue)}</div>
						<p class="text-sm text-muted-foreground">after discounts & taxes</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Tax and Discount Summary -->
			<div class="mt-4 grid grid-cols-1 gap-4 px-6 sm:grid-cols-2">
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
						<div class="text-2xl font-bold text-destructive">{formatCurrency(salesSummary.totalDiscount)}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Revenue Trend Chart -->
			<div class="mt-4 px-6">
				{#if report?.dailyTrend && report.dailyTrend.length > 0}
					<BarChart
						title="Revenue Trend"
						description="Sales performance over time"
						data={report.dailyTrend}
						xKey="date"
						series={[
							{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
							{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }
						]}
					/>
				{:else}
					<Card.Root>
						<Card.Header>
							<Card.Title>Revenue Trend</Card.Title>
							<Card.Description>Sales performance over time</Card.Description>
						</Card.Header>
						<Card.Content>
							<p class="py-8 text-center text-sm text-muted-foreground">No trend data for this period</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Top Selling Items and Payment Methods -->
			<div class="mt-4 grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
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
											<Table.Cell class="text-right font-medium text-success">
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
			<div class="mt-4 grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<BarChart
					title="Daily Orders"
					description="Order count by day"
					data={report?.dailyTrend || []}
					xKey="date"
					series={[
						{ key: 'orders', label: 'Orders', color: 'var(--chart-3)' }
					]}
				/>
				<PieChart
					title="Revenue Distribution"
					description="Payment method breakdown"
					data={paymentBreakdown.map((p) => ({ method: p.method.replace('_', ' '), amount: p.amount }))}
					labelKey="method"
					valueKey="amount"
				/>
			</div>

			<!-- Staff Performance (if available in report) -->
			{#if report?.staffPerformance && report.staffPerformance.length > 0}
				<div class="mt-4 px-6">
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
											<Table.Cell class="text-right text-success">{formatCurrency(staff.revenue)}</Table.Cell>
											<Table.Cell class="text-right">{formatCurrency(staff.averageOrderValue)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
			</div>

			<!-- All Available Report Types -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Available Reports</Card.Title>
						<Card.Description>Generate detailed reports for specific areas</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<Card.Root class="flex flex-col transition-colors hover:border-primary/30">
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

							<Card.Root class="flex flex-col transition-colors hover:border-primary/30">
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

							<Card.Root class="flex flex-col transition-colors hover:border-primary/30">
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

							<Card.Root class="flex flex-col transition-colors hover:border-primary/30">
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

							<Card.Root class="flex flex-col transition-colors hover:border-primary/30">
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

							<Card.Root class="flex flex-col transition-colors hover:border-primary/30">
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
