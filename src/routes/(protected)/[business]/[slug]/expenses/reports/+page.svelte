<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { goto } from '$app/navigation';
	import {
		IconDownload,
		IconCalendar,
		IconTrendingUp,
		IconTrendingDown,
		IconFileSpreadsheet,
		IconFileTypePdf,
		IconCurrencyDollar,
		IconChartBar,
		IconArrowUp,
		IconArrowDown
	} from '@tabler/icons-svelte';
	import StatCard from '$lib/components/global/stat-card.svelte';
	import { toast } from 'svelte-sonner';
	import * as Select from '$lib/components/ui/select';
	import type { ExpenseSummary, ExpenseCategory } from '$lib/api';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { downloadCsv, downloadPdf } from '$lib/utils/export';

	let { data }: { data: PageData } = $props();

	let summary = $state<ExpenseSummary>(data.summary);
	let categories = $state<ExpenseCategory[]>(data.categories || []);
	let startDate = $state(data.startDate);
	let endDate = $state(data.endDate);

	let dateRange = $state('90d');
	let reportContentEl = $state<HTMLElement | null>(null);
	let isExporting = $state(false);

	// Calculate category analysis from summary
	const categoryAnalysis = $derived(() => {
		const breakdown = summary.categoryBreakdown || {};
		const total = summary.totalAmount || 1;
		const categoryLookup = new Map(categories.map((c) => [c.id, c]));

		return Object.entries(breakdown)
			.map(([categoryId, amount]) => {
				const cat = categoryLookup.get(categoryId);
				return {
					category: cat?.name || 'Other',
					color: cat?.color || '#6b7280',
					total: amount,
					percentage: (amount / total) * 100,
					trend: 0 // Would need historical data to calculate
				};
			})
			.sort((a, b) => b.total - a.total);
	});

	// Calculate monthly trend from summary
	const monthlyTrend = $derived(() => {
		return summary.monthlyTrend || [];
	});

	// Calculate average monthly
	const avgMonthly = $derived(() => {
		const trend = monthlyTrend();
		if (trend.length === 0) return 0;
		const total = trend.reduce((sum, t) => sum + t.amount, 0);
		return total / trend.length;
	});

	// Find highest and lowest months
	const highestMonth = $derived(() => {
		const trend = monthlyTrend();
		if (trend.length === 0) return { month: '-', amount: 0 };
		const highest = trend.reduce((max, t) => (t.amount > max.amount ? t : max), trend[0]);
		return highest;
	});

	const lowestMonth = $derived(() => {
		const trend = monthlyTrend();
		if (trend.length === 0) return { month: '-', amount: 0 };
		const lowest = trend.reduce((min, t) => (t.amount < min.amount ? t : min), trend[0]);
		return lowest;
	});

	// Overall trend percentage
	const overallTrend = $derived(() => {
		const trend = monthlyTrend();
		if (trend.length < 2) return 0;
		const first = trend[0]?.amount || 1;
		const last = trend[trend.length - 1]?.amount || 0;
		return ((last - first) / first) * 100;
	});

	function handleDateRangeChange() {
		const now = new Date();
		let start: Date;

		switch (dateRange) {
			case '7d':
				start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case '30d':
				start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			case '90d':
				start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
				break;
			case '1y':
				start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
				break;
			default:
				start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
		}

		const startStr = start.toISOString().split('T')[0];
		const endStr = now.toISOString().split('T')[0];
		goto(`?startDate=${startStr}&endDate=${endStr}`);
	}

	async function exportCsv() {
		try {
			const headers = ['Section', 'Metric', 'Value'];
			const rows: (string | number)[][] = [];

			// Summary totals
			rows.push(['Summary', 'Total Expenses', summary.totalAmount]);
			rows.push(['Summary', 'Pending Amount', summary.pendingAmount]);
			rows.push(['Summary', 'Approved Amount', summary.approvedAmount]);
			rows.push(['Summary', 'Paid Amount', summary.paidAmount]);
			rows.push(['Summary', 'Monthly Average', avgMonthly()]);

			// Category breakdown
			const catAnalysis = categoryAnalysis();
			for (const cat of catAnalysis) {
				rows.push(['Category Breakdown', cat.category, cat.total]);
				rows.push(['Category Breakdown', `${cat.category} (%)`, Number(cat.percentage.toFixed(1))]);
			}

			// Monthly trend
			const trend = monthlyTrend();
			for (const entry of trend) {
				rows.push(['Monthly Trend', entry.month, entry.amount]);
			}

			const filename = `expense-report-${new Date().toISOString().split('T')[0]}.csv`;
			downloadCsv(filename, headers, rows);
			toast.success('CSV expense report downloaded successfully');
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
			const filename = `expense-report-${new Date().toISOString().split('T')[0]}.pdf`;
			await downloadPdf(reportContentEl, filename);
			toast.success('PDF expense report downloaded successfully');
		} catch (err) {
			toast.error('Failed to export PDF report');
		} finally {
			isExporting = false;
		}
	}

	function getCategoryColor(category: string): string {
		const cat = categories.find((c) => c.name === category);
		if (cat?.color) return cat.color;
		// Fallback colors
		const colors: Record<string, string> = {
			Inventory: 'bg-blue-500',
			Staff: 'bg-green-500',
			Utilities: 'bg-yellow-500',
			Rent: 'bg-red-500',
			Maintenance: 'bg-orange-500',
			Supplies: 'bg-purple-500',
			Marketing: 'bg-pink-500',
			Other: 'bg-gray-500'
		};
		return colors[category] || 'bg-gray-500';
	}

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	function formatMonth(monthStr: string): string {
		if (!monthStr) return '-';
		const date = new Date(monthStr + '-01');
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Expense Reports</h1>
					<p class="text-muted-foreground">Comprehensive expense analysis and insights</p>
				</div>
				<div class="flex gap-2">
					<Select.Root type="single" value={dateRange} onValueChange={(v) => { dateRange = v; handleDateRangeChange(); }}>
						<Select.Trigger class="w-[160px]">
							{({ '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '1y': 'Last year' } as Record<string, string>)[dateRange] || 'Last 90 days'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="7d">Last 7 days</Select.Item>
							<Select.Item value="30d">Last 30 days</Select.Item>
							<Select.Item value="90d">Last 90 days</Select.Item>
							<Select.Item value="1y">Last year</Select.Item>
						</Select.Content>
					</Select.Root>
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
			<!-- Summary Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Total Expenses"
					value={formatCurrency(summary.totalAmount)}
					icon={IconCurrencyDollar}
					iconColor="text-green-500"
					iconBg="bg-green-500/10"
					trend={{ value: Number(overallTrend().toFixed(1)), label: "vs previous period" }}
				/>
				<StatCard
					label="Monthly Average"
					value={formatCurrency(avgMonthly())}
					subtitle="per month"
					icon={IconChartBar}
					iconColor="text-blue-500"
					iconBg="bg-blue-500/10"
				/>
				<StatCard
					label="Highest Month"
					value={formatCurrency(highestMonth().amount)}
					subtitle={formatMonth(highestMonth().month)}
					icon={IconArrowUp}
					iconColor="text-red-500"
					iconBg="bg-red-500/10"
				/>
				<StatCard
					label="Lowest Month"
					value={formatCurrency(lowestMonth().amount)}
					subtitle={formatMonth(lowestMonth().month)}
					icon={IconArrowDown}
					iconColor="text-emerald-500"
					iconBg="bg-emerald-500/10"
				/>
			</div>

			<!-- Trend Chart -->
			<div class="mt-4 px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Expense Trend</Card.Title>
						<Card.Description>Historical expense data over time</Card.Description>
					</Card.Header>
					<Card.Content>
						<p class="py-8 text-center text-sm text-muted-foreground">Chart will be available when analytics data is connected.</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Category Analysis and Pie Chart -->
			<div class="mt-4 grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Category Analysis</Card.Title>
						<Card.Description>Spending breakdown by category with trends</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if categoryAnalysis().length > 0}
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Category</Table.Head>
										<Table.Head>Total</Table.Head>
										<Table.Head>% of Total</Table.Head>
										<Table.Head>Trend</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each categoryAnalysis() as category}
										<Table.Row>
											<Table.Cell>
												<div class="flex items-center gap-2">
													<div
														class="h-3 w-3 rounded-full"
														style="background-color: {category.color.startsWith('#') ? category.color : ''}"
														class:bg-blue-500={category.color === 'bg-blue-500'}
														class:bg-green-500={category.color === 'bg-green-500'}
														class:bg-yellow-500={category.color === 'bg-yellow-500'}
														class:bg-red-500={category.color === 'bg-red-500'}
														class:bg-orange-500={category.color === 'bg-orange-500'}
														class:bg-purple-500={category.color === 'bg-purple-500'}
														class:bg-pink-500={category.color === 'bg-pink-500'}
														class:bg-gray-500={category.color === 'bg-gray-500'}
													></div>
													{category.category}
												</div>
											</Table.Cell>
											<Table.Cell class="font-medium">{formatCurrency(category.total)}</Table.Cell>
											<Table.Cell>
												<div class="flex items-center gap-2">
													<div class="h-2 w-16 rounded-full bg-muted">
														<div
															class="h-full rounded-full"
															style="width: {category.percentage}%; background-color: {category.color.startsWith('#') ? category.color : ''}"
														></div>
													</div>
													<span class="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</span>
												</div>
											</Table.Cell>
											<Table.Cell>
												{#if category.trend > 0}
													<span class="flex items-center gap-1 text-destructive">
														<IconTrendingUp class="h-4 w-4" />
														+{category.trend}%
													</span>
												{:else if category.trend < 0}
													<span class="flex items-center gap-1 text-success">
														<IconTrendingDown class="h-4 w-4" />
														{category.trend}%
													</span>
												{:else}
													<span class="text-muted-foreground">0%</span>
												{/if}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No expense data for this period</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Spending Distribution</Card.Title>
					</Card.Header>
					<Card.Content class="flex items-center justify-center">
						<PieChart />
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Status Breakdown -->
			<div class="mt-4 px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Expense Status</Card.Title>
						<Card.Description>Breakdown by approval status</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<Card.Root>
								<Card.Content class="pt-6">
									<div class="flex items-start justify-between">
										<div>
											<p class="font-medium">Total</p>
											<p class="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
											<p class="text-sm text-muted-foreground">all expenses</p>
										</div>
										<Badge variant="outline">All</Badge>
									</div>
								</Card.Content>
							</Card.Root>
							<Card.Root>
								<Card.Content class="pt-6">
									<div class="flex items-start justify-between">
										<div>
											<p class="font-medium">Pending</p>
											<p class="text-2xl font-bold text-warning">{formatCurrency(summary.pendingAmount)}</p>
											<p class="text-sm text-muted-foreground">awaiting approval</p>
										</div>
										<Badge variant="secondary">Pending</Badge>
									</div>
								</Card.Content>
							</Card.Root>
							<Card.Root>
								<Card.Content class="pt-6">
									<div class="flex items-start justify-between">
										<div>
											<p class="font-medium">Approved</p>
											<p class="text-2xl font-bold text-info">{formatCurrency(summary.approvedAmount)}</p>
											<p class="text-sm text-muted-foreground">ready to pay</p>
										</div>
										<Badge>Approved</Badge>
									</div>
								</Card.Content>
							</Card.Root>
							<Card.Root>
								<Card.Content class="pt-6">
									<div class="flex items-start justify-between">
										<div>
											<p class="font-medium">Paid</p>
											<p class="text-2xl font-bold text-success">{formatCurrency(summary.paidAmount)}</p>
											<p class="text-sm text-muted-foreground">completed</p>
										</div>
										<Badge variant="outline">Paid</Badge>
									</div>
								</Card.Content>
							</Card.Root>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Monthly Comparison -->
			<div class="mt-4 px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Monthly Comparison</Card.Title>
					</Card.Header>
					<Card.Content>
						<BarChart />
					</Card.Content>
				</Card.Root>
			</div>
			</div>
		</div>
	</div>
</div>
