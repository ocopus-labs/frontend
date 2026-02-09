<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import {
		IconDownload,
		IconFileSpreadsheet,
		IconFileTypePdf,
		IconReportMoney,
		IconPackage,
		IconUsers,
		IconReceipt2,
		IconCash,
		IconUserScan,
		IconLoader2
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import type {
		FullReport,
		SalesSummary,
		TopSellingItemAnalytics,
		PaymentMethodBreakdown
	} from '$lib/api';
	import {
		exportOrders,
		exportInventory,
		exportExpenses,
		exportPayments,
		exportTeamMembers,
		exportCustomers,
		exportTaxReport
	} from '$lib/api';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { downloadBlob, downloadCsv, downloadPdf } from '$lib/utils/export';
	import PageHeader from '$lib/components/global/page-header.svelte';

	let { data } = $props();

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

			rows.push(['Sales Summary', 'Total Revenue', salesSummary.totalRevenue]);
			rows.push(['Sales Summary', 'Total Orders', salesSummary.totalOrders]);
			rows.push(['Sales Summary', 'Average Order Value', salesSummary.averageOrderValue]);
			rows.push(['Sales Summary', 'Net Revenue', salesSummary.netRevenue]);
			rows.push(['Sales Summary', 'Total Tax', salesSummary.totalTax]);
			rows.push(['Sales Summary', 'Total Discount', salesSummary.totalDiscount]);

			if (report?.dailyTrend) {
				for (const day of report.dailyTrend) {
					rows.push(['Daily Sales', day.date, '']);
					rows.push(['Daily Sales', `${day.date} Orders`, day.orders]);
					rows.push(['Daily Sales', `${day.date} Revenue`, day.revenue]);
				}
			}

			for (const item of topItems) {
				rows.push(['Top Items', item.itemName, item.revenue]);
				rows.push(['Top Items', `${item.itemName} (Qty)`, item.quantitySold]);
			}

			for (const payment of paymentBreakdown) {
				rows.push(['Payment Methods', payment.method, payment.amount]);
				rows.push(['Payment Methods', `${payment.method} (Count)`, payment.count]);
				rows.push(['Payment Methods', `${payment.method} (%)`, payment.percentage]);
			}

			if (report?.staffPerformance) {
				for (const staff of report.staffPerformance) {
					rows.push(['Staff Performance', staff.staffName, staff.revenue]);
					rows.push([
						'Staff Performance',
						`${staff.staffName} (Orders)`,
						staff.ordersProcessed
					]);
					rows.push([
						'Staff Performance',
						`${staff.staffName} (Avg Order)`,
						staff.averageOrderValue
					]);
				}
			}

			const filename = `report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
			downloadCsv(filename, headers, rows);
			toast.success('CSV report downloaded successfully');
		} catch {
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
		} catch {
			toast.error('Failed to export PDF report');
		} finally {
			isExporting = false;
		}
	}

	const currency = $derived(
		((data.business as any)?.settings?.currency || 'USD') as CurrencyCode
	);

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
			bank_transfer: 'bg-amber-500',
			cheque: 'bg-orange-500',
			other: 'bg-gray-500'
		};
		return colors[method.toLowerCase()] || 'bg-gray-500';
	}

	// Format daily trend dates for the ledger
	function formatLedgerDate(dateStr: string): string {
		if (typeof dateStr === 'string' && dateStr.includes('-')) {
			const parts = dateStr.split('-');
			const month = parseInt(parts[1], 10);
			const day = parseInt(parts[2], 10);
			const monthNames = [
				'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
				'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
			];
			return `${monthNames[month - 1]} ${day}`;
		}
		return dateStr;
	}

	// Report type definitions for the Quick Export grid
	const reportTypes = [
		{
			title: 'Sales Report',
			description: 'Daily sales breakdown and transaction ledger',
			icon: IconReportMoney,
			badge: 'Daily',
			badgeVariant: 'default' as const,
			color: 'text-green-500',
			bgColor: 'bg-green-500/10'
		},
		{
			title: 'Inventory Report',
			description: 'Stock levels, low stock alerts, reorder points',
			icon: IconPackage,
			badge: 'Weekly',
			badgeVariant: 'secondary' as const,
			color: 'text-blue-500',
			bgColor: 'bg-blue-500/10'
		},
		{
			title: 'Staff Performance',
			description: 'Team productivity and order processing metrics',
			icon: IconUsers,
			badge: 'Monthly',
			badgeVariant: 'outline' as const,
			color: 'text-purple-500',
			bgColor: 'bg-purple-500/10'
		},
		{
			title: 'Tax Summary',
			description: 'Tax collected breakdown for accounting and filing',
			icon: IconReceipt2,
			badge: 'Monthly',
			badgeVariant: 'outline' as const,
			color: 'text-amber-500',
			bgColor: 'bg-amber-500/10'
		},
		{
			title: 'Expense Report',
			description: 'Expense tracking and category breakdown',
			icon: IconCash,
			badge: 'Weekly',
			badgeVariant: 'secondary' as const,
			color: 'text-red-500',
			bgColor: 'bg-red-500/10'
		},
		{
			title: 'Customer Insights',
			description: 'Customer trends, repeat visits, and preferences',
			icon: IconUserScan,
			badge: 'Monthly',
			badgeVariant: 'outline' as const,
			color: 'text-teal-500',
			bgColor: 'bg-teal-500/10'
		}
	];

	// Per-report export state
	let reportPeriods = $state<Record<string, string>>(
		Object.fromEntries(reportTypes.map((r) => [r.title, 'month']))
	);
	let reportFormats = $state<Record<string, string>>(
		Object.fromEntries(reportTypes.map((r) => [r.title, 'pdf']))
	);

	// Convert period label to start/end date strings
	function getDateRange(periodKey: string): { startDate: string; endDate: string } {
		const now = new Date();
		const end = new Date(now);
		end.setHours(23, 59, 59, 999);
		const start = new Date(now);
		start.setHours(0, 0, 0, 0);

		switch (periodKey) {
			case 'today':
				break;
			case 'yesterday':
				start.setDate(start.getDate() - 1);
				end.setDate(end.getDate() - 1);
				break;
			case 'week':
				start.setDate(start.getDate() - 7);
				break;
			case 'month':
				start.setMonth(start.getMonth() - 1);
				break;
			case 'quarter':
				start.setMonth(start.getMonth() - 3);
				break;
			case 'year':
				start.setFullYear(start.getFullYear() - 1);
				break;
		}

		return {
			startDate: start.toISOString().split('T')[0],
			endDate: end.toISOString().split('T')[0]
		};
	}

	let downloadingReport = $state<string | null>(null);

	async function handleReportDownload(title: string) {
		const selectedPeriod = reportPeriods[title];
		const selectedFormat = reportFormats[title];
		const businessId = (data as any).businessId;
		const { startDate, endDate } = getDateRange(selectedPeriod);
		const dateSuffix = new Date().toISOString().split('T')[0];

		downloadingReport = title;

		try {
			let blob: Blob | undefined;
			let filename = '';

			if (selectedFormat === 'pdf') {
				// For PDF, use the full-page PDF export
				if (!reportContentEl) {
					toast.error('Report content not available. Try exporting as CSV instead.');
					return;
				}
				filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${dateSuffix}.pdf`;
				await downloadPdf(reportContentEl, filename);
				toast.success(`${title} PDF downloaded`);
				return;
			}

			// CSV exports via backend API
			switch (title) {
				case 'Sales Report':
					blob = await exportOrders(businessId, { startDate, endDate });
					filename = `sales-report-${dateSuffix}.csv`;
					break;
				case 'Inventory Report':
					blob = await exportInventory(businessId);
					filename = `inventory-report-${dateSuffix}.csv`;
					break;
				case 'Staff Performance':
					blob = await exportTeamMembers(businessId);
					filename = `staff-performance-${dateSuffix}.csv`;
					break;
				case 'Tax Summary':
					blob = (await exportTaxReport(businessId, {
						from: startDate,
						to: endDate,
						format: 'csv'
					})) as Blob;
					filename = `tax-summary-${dateSuffix}.csv`;
					break;
				case 'Expense Report':
					blob = await exportExpenses(businessId, { startDate, endDate });
					filename = `expense-report-${dateSuffix}.csv`;
					break;
				case 'Customer Insights':
					blob = await exportCustomers(businessId);
					filename = `customer-insights-${dateSuffix}.csv`;
					break;
				default:
					toast.error(`Unknown report type: ${title}`);
					return;
			}

			if (blob) {
				downloadBlob(blob, filename);
				toast.success(`${title} downloaded successfully`);
			}
		} catch (err) {
			console.error(`Failed to download ${title}:`, err);
			toast.error(`Failed to download ${title}. Please try again.`);
		} finally {
			downloadingReport = null;
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Reports" description="Generate and download business reports">
				{#snippet actions()}
					<Select.Root
						type="single"
						value={period}
						onValueChange={(v) => {
							period = v;
							handlePeriodChange(v);
						}}
					>
						<Select.Trigger
							class="w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{getPeriodLabel(period)}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="today">Today</Select.Item>
							<Select.Item value="yesterday">Yesterday</Select.Item>
							<Select.Item value="week">This Week</Select.Item>
							<Select.Item value="month">This Month</Select.Item>
							<Select.Item value="quarter">This Quarter</Select.Item>
							<Select.Item value="year">This Year</Select.Item>
						</Select.Content>
					</Select.Root>
					<Button variant="outline" onclick={exportPdf} disabled={isExporting}>
						<IconFileTypePdf class="mr-1.5 h-4 w-4" />
						{isExporting ? 'Exporting...' : 'PDF'}
					</Button>
					<Button variant="outline" onclick={exportCsv}>
						<IconFileSpreadsheet class="mr-1.5 h-4 w-4" />
						CSV
					</Button>
				{/snippet}
			</PageHeader>

			<!-- Quick Export Grid (moved to top — primary action) -->
			<div class="px-4 lg:px-6">
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each reportTypes as rt}
						<Card.Root class="transition-colors hover:border-primary/30">
							<Card.Header class="pb-2">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-2.5">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-lg {rt.bgColor}"
										>
											<rt.icon class="h-4 w-4 {rt.color}" />
										</div>
										<Card.Title class="text-sm font-semibold">{rt.title}</Card.Title>
									</div>
									<Badge variant={rt.badgeVariant}>{rt.badge}</Badge>
								</div>
							</Card.Header>
							<Card.Content class="pb-3">
								<p class="text-xs text-muted-foreground">{rt.description}</p>
							</Card.Content>
							<Card.Footer class="flex items-center gap-2 pt-0">
								<Select.Root
									type="single"
									value={reportPeriods[rt.title]}
									onValueChange={(v) => (reportPeriods[rt.title] = v)}
								>
									<Select.Trigger class="h-8 flex-1 text-xs">
										{getPeriodLabel(reportPeriods[rt.title])}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="week">This Week</Select.Item>
										<Select.Item value="month">This Month</Select.Item>
										<Select.Item value="quarter">This Quarter</Select.Item>
										<Select.Item value="year">This Year</Select.Item>
									</Select.Content>
								</Select.Root>
								<Select.Root
									type="single"
									value={reportFormats[rt.title]}
									onValueChange={(v) => (reportFormats[rt.title] = v)}
								>
									<Select.Trigger class="h-8 w-[72px] text-xs">
										{reportFormats[rt.title].toUpperCase()}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="pdf">PDF</Select.Item>
										<Select.Item value="csv">CSV</Select.Item>
									</Select.Content>
								</Select.Root>
								<Button
									size="sm"
									variant="default"
									class="h-8"
									disabled={downloadingReport === rt.title}
									onclick={() => handleReportDownload(rt.title)}
								>
									{#if downloadingReport === rt.title}
										<IconLoader2 class="h-3.5 w-3.5 animate-spin" />
									{:else}
										<IconDownload class="h-3.5 w-3.5" />
									{/if}
								</Button>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>
			</div>

			<div bind:this={reportContentEl} class="report-content flex flex-col gap-4">
				<!-- Sales Summary Cards -->
				<div class="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								Total Revenue
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold text-success">
								{formatCurrency(salesSummary.totalRevenue)}
							</div>
							<p class="text-xs text-muted-foreground">{getPeriodLabel(period)}</p>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								Total Orders
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">
								{formatNumber(salesSummary.totalOrders)}
							</div>
							<p class="text-xs text-muted-foreground">{getPeriodLabel(period)}</p>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								Average Order Value
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">
								{formatCurrency(salesSummary.averageOrderValue)}
							</div>
							<p class="text-xs text-muted-foreground">per order</p>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								Net Revenue
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">
								{formatCurrency(salesSummary.netRevenue)}
							</div>
							<p class="text-xs text-muted-foreground">after tax &amp; discounts</p>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Tax and Discount Summary -->
				<div class="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6">
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								Total Tax Collected
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">
								{formatCurrency(salesSummary.totalTax)}
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium text-muted-foreground">
								Total Discounts Given
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold text-destructive">
								{formatCurrency(salesSummary.totalDiscount)}
							</div>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Daily Sales Ledger (replaces revenue trend chart) -->
				{#if report?.dailyTrend && report.dailyTrend.length > 0}
					<div class="px-4 lg:px-6">
						<Card.Root>
							<Card.Header>
								<Card.Title>Daily Sales Ledger</Card.Title>
								<Card.Description>
									Day-by-day breakdown for {getPeriodLabel(period).toLowerCase()}
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<div class="overflow-x-auto">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head>Date</Table.Head>
												<Table.Head class="text-right">Orders</Table.Head>
												<Table.Head class="text-right">Gross Sales</Table.Head>
												<Table.Head class="text-right">Avg / Order</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each report.dailyTrend as day}
												<Table.Row>
													<Table.Cell class="font-medium">
														{formatLedgerDate(day.date)}
													</Table.Cell>
													<Table.Cell class="text-right tabular-nums">
														{formatNumber(day.orders)}
													</Table.Cell>
													<Table.Cell class="text-right tabular-nums font-medium">
														{formatCurrency(day.revenue)}
													</Table.Cell>
													<Table.Cell class="text-right tabular-nums text-muted-foreground">
														{day.orders > 0
															? formatCurrency(day.revenue / day.orders)
															: '—'}
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
										<Table.Footer>
											<Table.Row>
												<Table.Cell class="font-semibold">Total</Table.Cell>
												<Table.Cell class="text-right font-semibold tabular-nums">
													{formatNumber(
														report.dailyTrend.reduce((s, d) => s + d.orders, 0)
													)}
												</Table.Cell>
												<Table.Cell class="text-right font-semibold tabular-nums">
													{formatCurrency(
														report.dailyTrend.reduce((s, d) => s + d.revenue, 0)
													)}
												</Table.Cell>
												<Table.Cell class="text-right font-semibold tabular-nums">
													{@const totalOrders = report.dailyTrend.reduce(
														(s, d) => s + d.orders,
														0
													)}
													{@const totalRevenue = report.dailyTrend.reduce(
														(s, d) => s + d.revenue,
														0
													)}
													{totalOrders > 0
														? formatCurrency(totalRevenue / totalOrders)
														: '—'}
												</Table.Cell>
											</Table.Row>
										</Table.Footer>
									</Table.Root>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				{/if}

				<!-- Payment Reconciliation Table + Top Selling Items -->
				<div class="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
					<!-- Payment Reconciliation -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Payment Reconciliation</Card.Title>
							<Card.Description>Breakdown by payment method</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if paymentBreakdown.length > 0}
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Method</Table.Head>
											<Table.Head class="text-right">Txns</Table.Head>
											<Table.Head class="text-right">Amount</Table.Head>
											<Table.Head class="text-right">Share</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each paymentBreakdown as payment}
											<Table.Row>
												<Table.Cell>
													<div class="flex items-center gap-2">
														<div
															class="h-2.5 w-2.5 rounded-full {getPaymentMethodColor(
																payment.method
															)}"
														></div>
														<span class="font-medium capitalize">
															{payment.method.replace('_', ' ')}
														</span>
													</div>
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums">
													{formatNumber(payment.count)}
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums font-medium">
													{formatCurrency(payment.amount)}
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums text-muted-foreground">
													{payment.percentage.toFixed(1)}%
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
									<Table.Footer>
										<Table.Row>
											<Table.Cell class="font-semibold">Total</Table.Cell>
											<Table.Cell class="text-right font-semibold tabular-nums">
												{formatNumber(
													paymentBreakdown.reduce((s, p) => s + p.count, 0)
												)}
											</Table.Cell>
											<Table.Cell class="text-right font-semibold tabular-nums">
												{formatCurrency(
													paymentBreakdown.reduce((s, p) => s + p.amount, 0)
												)}
											</Table.Cell>
											<Table.Cell class="text-right font-semibold tabular-nums">
												100%
											</Table.Cell>
										</Table.Row>
									</Table.Footer>
								</Table.Root>
							{:else}
								<p class="py-8 text-center text-sm text-muted-foreground">
									No payment data for this period
								</p>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Top Selling Items -->
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
											<Table.Head class="text-right">Qty</Table.Head>
											<Table.Head class="text-right">Revenue</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each topItems.slice(0, 10) as item, i}
											<Table.Row>
												<Table.Cell>
													<div class="flex items-center gap-2">
														<span
															class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
														>
															{i + 1}
														</span>
														<span class="font-medium">{item.itemName}</span>
													</div>
												</Table.Cell>
												<Table.Cell>
													<Badge variant="outline" class="text-xs">
														{item.category}
													</Badge>
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums">
													{formatNumber(item.quantitySold)}
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums font-medium text-success">
													{formatCurrency(item.revenue)}
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							{:else}
								<p class="py-8 text-center text-sm text-muted-foreground">
									No sales data for this period
								</p>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Staff Performance -->
				{#if report?.staffPerformance && report.staffPerformance.length > 0}
					<div class="px-4 lg:px-6">
						<Card.Root>
							<Card.Header>
								<Card.Title>Staff Performance</Card.Title>
								<Card.Description>
									Team member productivity metrics for {getPeriodLabel(period).toLowerCase()}
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Staff Member</Table.Head>
											<Table.Head class="text-right">Orders</Table.Head>
											<Table.Head class="text-right">Revenue</Table.Head>
											<Table.Head class="text-right">Avg Order</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each report.staffPerformance as staff}
											<Table.Row>
												<Table.Cell class="font-medium">{staff.staffName}</Table.Cell>
												<Table.Cell class="text-right tabular-nums">
													{formatNumber(staff.ordersProcessed)}
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums text-success">
													{formatCurrency(staff.revenue)}
												</Table.Cell>
												<Table.Cell class="text-right tabular-nums">
													{formatCurrency(staff.averageOrderValue)}
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</Card.Content>
						</Card.Root>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
