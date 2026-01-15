<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';
	import {
		IconChevronLeft,
		IconChevronRight,
		IconDownload,
		IconTrendingUp,
		IconTrendingDown
	} from '@tabler/icons-svelte';

	// Dummy monthly data
	let selectedMonth = $state('2024-11');

	const monthlyData = {
		'2024-11': {
			total: 12450.75,
			budget: 15000,
			previousMonth: 11890.25,
			categories: [
				{ name: 'Inventory', amount: 5200.5, budget: 6000, percentage: 41.8 },
				{ name: 'Utilities', amount: 1850.0, budget: 2000, percentage: 14.9 },
				{ name: 'Staff', amount: 2100.0, budget: 2500, percentage: 16.9 },
				{ name: 'Maintenance', amount: 890.25, budget: 1000, percentage: 7.1 },
				{ name: 'Supplies', amount: 650.0, budget: 800, percentage: 5.2 },
				{ name: 'Marketing', amount: 450.0, budget: 500, percentage: 3.6 },
				{ name: 'Rent', amount: 1200.0, budget: 1200, percentage: 9.6 },
				{ name: 'Other', amount: 110.0, budget: 200, percentage: 0.9 }
			],
			weeklyBreakdown: [
				{ week: 'Week 1', amount: 3250.5 },
				{ week: 'Week 2', amount: 2890.25 },
				{ week: 'Week 3', amount: 3450.0 },
				{ week: 'Week 4', amount: 2860.0 }
			],
			topExpenses: [
				{ description: 'Weekly produce order', category: 'Inventory', amount: 1250.0, date: 'Nov 4' },
				{ description: 'Monthly rent', category: 'Rent', amount: 1200.0, date: 'Nov 1' },
				{ description: 'Staff salaries', category: 'Staff', amount: 1100.0, date: 'Nov 15' },
				{ description: 'Electricity bill', category: 'Utilities', amount: 890.0, date: 'Nov 5' },
				{ description: 'Meat supplier payment', category: 'Inventory', amount: 750.0, date: 'Nov 8' }
			]
		}
	};

	const currentData = $derived(monthlyData['2024-11']);
	const budgetUsed = $derived((currentData.total / currentData.budget) * 100);
	const monthChange = $derived(
		((currentData.total - currentData.previousMonth) / currentData.previousMonth) * 100
	);

	function previousMonth() {
		selectedMonth = '2024-10';
	}

	function nextMonth() {
		selectedMonth = '2024-11';
	}

	function getCategoryColor(category: string) {
		const colors: Record<string, string> = {
			Inventory: 'bg-blue-500',
			Utilities: 'bg-yellow-500',
			Staff: 'bg-green-500',
			Maintenance: 'bg-orange-500',
			Supplies: 'bg-purple-500',
			Marketing: 'bg-pink-500',
			Rent: 'bg-red-500',
			Other: 'bg-gray-500'
		};
		return colors[category] || 'bg-gray-500';
	}

	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Monthly Expenses</h1>
					<p class="text-muted-foreground">Overview of monthly spending patterns</p>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={previousMonth}>
						<IconChevronLeft class="h-4 w-4" />
					</Button>
					<span class="min-w-[150px] text-center font-medium">
						{formatMonth(selectedMonth)}
					</span>
					<Button variant="outline" size="sm" onclick={nextMonth}>
						<IconChevronRight class="h-4 w-4" />
					</Button>
					<Button variant="outline">
						<IconDownload class="mr-2 h-4 w-4" />
						Export
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
						<div class="text-2xl font-bold text-red-600">${currentData.total.toFixed(2)}</div>
						<div class="flex items-center gap-1 text-sm">
							{#if monthChange > 0}
								<IconTrendingUp class="h-4 w-4 text-red-500" />
								<span class="text-red-500">+{monthChange.toFixed(1)}%</span>
							{:else}
								<IconTrendingDown class="h-4 w-4 text-green-500" />
								<span class="text-green-500">{monthChange.toFixed(1)}%</span>
							{/if}
							<span class="text-muted-foreground">vs last month</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Monthly Budget</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${currentData.budget.toFixed(2)}</div>
						<div class="mt-2 h-2 w-full rounded-full bg-muted">
							<div
								class="h-full rounded-full {budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'}"
								style="width: {Math.min(budgetUsed, 100)}%"
							></div>
						</div>
						<p class="mt-1 text-sm text-muted-foreground">{budgetUsed.toFixed(1)}% used</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Remaining Budget</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-green-600">
							${(currentData.budget - currentData.total).toFixed(2)}
						</div>
						<p class="text-sm text-muted-foreground">
							${((currentData.budget - currentData.total) / 30).toFixed(2)}/day remaining
						</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Daily Average</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${(currentData.total / 30).toFixed(2)}</div>
						<p class="text-sm text-muted-foreground">per day this month</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Charts Row -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Weekly Breakdown</Card.Title>
					</Card.Header>
					<Card.Content>
						<BarChart />
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Spending by Category</Card.Title>
					</Card.Header>
					<Card.Content>
						<PieChart />
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Category Breakdown -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Category Breakdown</Card.Title>
						<Card.Description>Expenses compared to budget by category</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							{#each currentData.categories as category}
								{@const budgetUsedCat = (category.amount / category.budget) * 100}
								<div class="space-y-2">
									<div class="flex items-center justify-between text-sm">
										<div class="flex items-center gap-2">
											<div class="h-3 w-3 rounded-full {getCategoryColor(category.name)}"></div>
											<span class="font-medium">{category.name}</span>
										</div>
										<div class="text-right">
											<span class="font-medium">${category.amount.toFixed(2)}</span>
											<span class="text-muted-foreground"> / ${category.budget.toFixed(2)}</span>
										</div>
									</div>
									<div class="h-2 w-full rounded-full bg-muted">
										<div
											class="h-full rounded-full {budgetUsedCat > 100 ? 'bg-red-500' : budgetUsedCat > 80 ? 'bg-yellow-500' : 'bg-green-500'}"
											style="width: {Math.min(budgetUsedCat, 100)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Top Expenses -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Top Expenses</Card.Title>
						<Card.Description>Largest expenses this month</Card.Description>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Description</Table.Head>
									<Table.Head>Category</Table.Head>
									<Table.Head>Date</Table.Head>
									<Table.Head class="text-right">Amount</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each currentData.topExpenses as expense, i}
									<Table.Row>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<span class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
													{i + 1}
												</span>
												{expense.description}
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline">{expense.category}</Badge>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">{expense.date}</Table.Cell>
										<Table.Cell class="text-right font-medium text-red-600">
											-${expense.amount.toFixed(2)}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>
