<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import AreaChartInteractive from '$lib/components/chart/area-chart-interactive.svelte';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';
	import {
		IconDownload,
		IconCalendar,
		IconTrendingUp,
		IconTrendingDown,
		IconFileSpreadsheet,
		IconFileTypePdf
	} from '@tabler/icons-svelte';

	let dateRange = $state('30d');

	// Dummy expense report data
	const reportData = {
		summary: {
			totalExpenses: 45892.5,
			avgMonthly: 15297.5,
			highestMonth: { month: 'October 2024', amount: 16450.75 },
			lowestMonth: { month: 'September 2024', amount: 13890.25 },
			trend: -2.3
		},
		categoryAnalysis: [
			{ category: 'Inventory', total: 18500.0, percentage: 40.3, trend: 5.2 },
			{ category: 'Staff', total: 8400.0, percentage: 18.3, trend: 0 },
			{ category: 'Utilities', total: 5890.5, percentage: 12.8, trend: -3.5 },
			{ category: 'Rent', total: 3600.0, percentage: 7.8, trend: 0 },
			{ category: 'Maintenance', total: 3250.75, percentage: 7.1, trend: 12.5 },
			{ category: 'Supplies', total: 2450.0, percentage: 5.3, trend: -8.2 },
			{ category: 'Marketing', total: 2100.0, percentage: 4.6, trend: 15.0 },
			{ category: 'Other', total: 1701.25, percentage: 3.7, trend: -5.0 }
		],
		vendorSpending: [
			{ vendor: 'Local Farms', total: 8950.0, orders: 45 },
			{ vendor: 'Italian Imports', total: 6780.5, orders: 32 },
			{ vendor: 'Premium Meats', total: 5420.0, orders: 28 },
			{ vendor: 'Ocean Fresh', total: 4250.75, orders: 22 },
			{ vendor: 'City Power Co.', total: 2890.0, orders: 3 }
		],
		monthlyTrend: [
			{ month: 'Sep 2024', amount: 13890.25 },
			{ month: 'Oct 2024', amount: 16450.75 },
			{ month: 'Nov 2024', amount: 15551.5 }
		]
	};

	function downloadReport(format: string) {
		console.log('Download report as', format);
	}

	function getCategoryColor(category: string) {
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
					<select
						bind:value={dateRange}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="7d">Last 7 days</option>
						<option value="30d">Last 30 days</option>
						<option value="90d">Last 90 days</option>
						<option value="1y">Last year</option>
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

			<!-- Summary Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Expenses</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${reportData.summary.totalExpenses.toFixed(2)}</div>
						<div class="flex items-center gap-1 text-sm">
							{#if reportData.summary.trend < 0}
								<IconTrendingDown class="h-4 w-4 text-green-500" />
								<span class="text-green-500">{reportData.summary.trend}%</span>
							{:else}
								<IconTrendingUp class="h-4 w-4 text-red-500" />
								<span class="text-red-500">+{reportData.summary.trend}%</span>
							{/if}
							<span class="text-muted-foreground">vs previous period</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Monthly Average</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${reportData.summary.avgMonthly.toFixed(2)}</div>
						<p class="text-sm text-muted-foreground">per month</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Highest Month</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-red-600">
							${reportData.summary.highestMonth.amount.toFixed(2)}
						</div>
						<p class="text-sm text-muted-foreground">{reportData.summary.highestMonth.month}</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Lowest Month</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-green-600">
							${reportData.summary.lowestMonth.amount.toFixed(2)}
						</div>
						<p class="text-sm text-muted-foreground">{reportData.summary.lowestMonth.month}</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Trend Chart -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Expense Trend</Card.Title>
						<Card.Description>Historical expense data over time</Card.Description>
					</Card.Header>
					<Card.Content>
						<AreaChartInteractive />
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Category Analysis and Pie Chart -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Category Analysis</Card.Title>
						<Card.Description>Spending breakdown by category with trends</Card.Description>
					</Card.Header>
					<Card.Content>
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
								{#each reportData.categoryAnalysis as category}
									<Table.Row>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<div class="h-3 w-3 rounded-full {getCategoryColor(category.category)}"></div>
												{category.category}
											</div>
										</Table.Cell>
										<Table.Cell class="font-medium">${category.total.toFixed(2)}</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<div class="h-2 w-16 rounded-full bg-muted">
													<div
														class="h-full rounded-full {getCategoryColor(category.category)}"
														style="width: {category.percentage}%"
													></div>
												</div>
												<span class="text-sm text-muted-foreground">{category.percentage}%</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											{#if category.trend > 0}
												<span class="flex items-center gap-1 text-red-600">
													<IconTrendingUp class="h-4 w-4" />
													+{category.trend}%
												</span>
											{:else if category.trend < 0}
												<span class="flex items-center gap-1 text-green-600">
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

			<!-- Vendor Spending -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Top Vendors</Card.Title>
						<Card.Description>Highest spending by vendor</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
							{#each reportData.vendorSpending as vendor, i}
								<Card.Root>
									<Card.Content class="pt-6">
										<div class="flex items-start justify-between">
											<div>
												<p class="font-medium">{vendor.vendor}</p>
												<p class="text-2xl font-bold">${vendor.total.toFixed(2)}</p>
												<p class="text-sm text-muted-foreground">{vendor.orders} orders</p>
											</div>
											<Badge variant="outline">#{i + 1}</Badge>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Monthly Comparison -->
			<div class="px-6">
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
