<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';
	import { goto } from '$app/navigation';
	import {
		IconChevronLeft,
		IconChevronRight,
		IconDownload,
		IconTrendingUp,
		IconTrendingDown
	} from '@tabler/icons-svelte';
	import type { Expense, ExpenseSummary, ExpenseCategory } from '$lib/api';

	let { data }: { data: PageData } = $props();

	let expenses = $state<Expense[]>(data.expenses || []);
	let summary = $state<ExpenseSummary>(data.summary);
	let categories = $state<ExpenseCategory[]>(data.categories || []);
	let selectedMonth = $state(data.selectedMonth);

	// Calculate category breakdown from expenses
	const categoryBreakdown = $derived(() => {
		const breakdown: { name: string; amount: number; color: string; percentage: number }[] = [];
		const categoryMap = new Map<string, { amount: number; color: string }>();

		// Build a lookup for category names
		const categoryLookup = new Map(categories.map((c) => [c.id, c]));

		// Sum expenses by category
		for (const expense of expenses) {
			const cat = categoryLookup.get(expense.categoryId);
			const key = cat?.name || 'Other';
			const color = cat?.color || '#6b7280';
			const existing = categoryMap.get(key);
			if (existing) {
				existing.amount += expense.amount;
			} else {
				categoryMap.set(key, { amount: expense.amount, color });
			}
		}

		// Convert to array with percentages
		const total = summary.totalAmount || 1;
		for (const [name, { amount, color }] of categoryMap) {
			breakdown.push({
				name,
				amount,
				color,
				percentage: (amount / total) * 100
			});
		}

		// Sort by amount descending
		return breakdown.sort((a, b) => b.amount - a.amount);
	});

	// Get top expenses sorted by amount
	const topExpenses = $derived(() => {
		const categoryLookup = new Map(categories.map((c) => [c.id, c]));
		return [...expenses]
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5)
			.map((e) => ({
				description: e.title,
				category: categoryLookup.get(e.categoryId)?.name || 'Other',
				amount: e.amount,
				date: new Date(e.expenseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			}));
	});

	// Calculate month-over-month change using monthlyTrend
	const monthChange = $derived(() => {
		if (summary.monthlyTrend && summary.monthlyTrend.length >= 2) {
			const current = summary.monthlyTrend[summary.monthlyTrend.length - 1]?.amount || 0;
			const previous = summary.monthlyTrend[summary.monthlyTrend.length - 2]?.amount || 1;
			return ((current - previous) / previous) * 100;
		}
		return 0;
	});

	// Days in the selected month
	const daysInMonth = $derived(() => {
		const [year, month] = selectedMonth.split('-').map(Number);
		return new Date(year, month, 0).getDate();
	});

	// Daily average
	const dailyAverage = $derived(summary.totalAmount / daysInMonth());

	function previousMonth() {
		const [year, month] = selectedMonth.split('-').map(Number);
		const date = new Date(year, month - 2, 1);
		const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		goto(`?month=${newMonth}`);
	}

	function nextMonth() {
		const [year, month] = selectedMonth.split('-').map(Number);
		const date = new Date(year, month, 1);
		const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		goto(`?month=${newMonth}`);
	}

	function getCategoryColor(categoryName: string): string {
		const cat = categories.find((c) => c.name === categoryName);
		if (cat?.color) return cat.color;
		// Fallback colors
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
		return colors[categoryName] || 'bg-gray-500';
	}

	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
						<div class="text-2xl font-bold text-red-600">{formatCurrency(summary.totalAmount)}</div>
						<div class="flex items-center gap-1 text-sm">
							{#if monthChange() > 0}
								<IconTrendingUp class="h-4 w-4 text-red-500" />
								<span class="text-red-500">+{monthChange().toFixed(1)}%</span>
							{:else}
								<IconTrendingDown class="h-4 w-4 text-green-500" />
								<span class="text-green-500">{monthChange().toFixed(1)}%</span>
							{/if}
							<span class="text-muted-foreground">vs last month</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Pending Approval</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pendingAmount)}</div>
						<p class="text-sm text-muted-foreground">awaiting review</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Approved</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-blue-600">
							{formatCurrency(summary.approvedAmount)}
						</div>
						<p class="text-sm text-muted-foreground">ready for payment</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Daily Average</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatCurrency(dailyAverage)}</div>
						<p class="text-sm text-muted-foreground">per day this month</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Charts Row -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Monthly Trend</Card.Title>
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
						<Card.Description>Expenses by category for this month</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if categoryBreakdown().length > 0}
							<div class="space-y-4">
								{#each categoryBreakdown() as category}
									<div class="space-y-2">
										<div class="flex items-center justify-between text-sm">
											<div class="flex items-center gap-2">
												<div
													class="h-3 w-3 rounded-full"
													style="background-color: {category.color.startsWith('#') ? category.color : ''}"
													class:bg-blue-500={category.color === 'bg-blue-500'}
													class:bg-yellow-500={category.color === 'bg-yellow-500'}
													class:bg-green-500={category.color === 'bg-green-500'}
													class:bg-orange-500={category.color === 'bg-orange-500'}
													class:bg-purple-500={category.color === 'bg-purple-500'}
													class:bg-pink-500={category.color === 'bg-pink-500'}
													class:bg-red-500={category.color === 'bg-red-500'}
													class:bg-gray-500={category.color === 'bg-gray-500'}
												></div>
												<span class="font-medium">{category.name}</span>
											</div>
											<div class="text-right">
												<span class="font-medium">{formatCurrency(category.amount)}</span>
												<span class="text-muted-foreground"> ({category.percentage.toFixed(1)}%)</span>
											</div>
										</div>
										<div class="h-2 w-full rounded-full bg-muted">
											<div
												class="h-full rounded-full bg-primary"
												style="width: {Math.min(category.percentage, 100)}%; background-color: {category.color.startsWith('#') ? category.color : ''}"
											></div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No expenses recorded this month</p>
						{/if}
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
						{#if topExpenses().length > 0}
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
									{#each topExpenses() as expense, i}
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
												-{formatCurrency(expense.amount)}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No expenses recorded this month</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>
