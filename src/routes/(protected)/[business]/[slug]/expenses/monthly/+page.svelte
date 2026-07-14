<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { goto } from '$app/navigation';
	import {
		IconChevronLeft,
		IconChevronRight,
		IconDownload,
		IconTrendingUp,
		IconTrendingDown
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import type { Expense, ExpenseSummary, ExpenseCategory } from '$lib/api';
	import { exportExpenses } from '$lib/api/expense';
	import { downloadBlob } from '$lib/utils/export';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';

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
				date: new Date(e.expenseDate).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				})
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
			Inventory: 'bg-chart-3',
			Utilities: 'bg-chart-6',
			Staff: 'bg-chart-5',
			Maintenance: 'bg-chart-1',
			Supplies: 'bg-chart-4',
			Marketing: 'bg-chart-2',
			Rent: 'bg-chart-7',
			Other: 'bg-muted-foreground'
		};
		return colors[categoryName] || 'bg-muted-foreground';
	}

	async function handleExportExpenses() {
		try {
			const [year, month] = selectedMonth.split('-').map(Number);
			const startDate = `${selectedMonth}-01`;
			const endOfMonth = new Date(year, month, 0).getDate();
			const endDate = `${selectedMonth}-${String(endOfMonth).padStart(2, '0')}`;
			const blob = await exportExpenses(data.businessId, { startDate, endDate });
			downloadBlob(blob, `expenses-${selectedMonth}.csv`);
			toast.success('Expenses exported successfully');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to export expenses'));
		}
	}

	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}
</script>

<PageShell title="Monthly Expenses" description="Overview of monthly spending patterns">
	{#snippet actions()}
		<Button variant="outline" size="sm" onclick={previousMonth}>
			<IconChevronLeft class="h-4 w-4" />
		</Button>
		<span class="min-w-[150px] text-center font-medium">
			{formatMonth(selectedMonth)}
		</span>
		<Button variant="outline" size="sm" onclick={nextMonth}>
			<IconChevronRight class="h-4 w-4" />
		</Button>
		<Button variant="outline" onclick={handleExportExpenses}>
			<IconDownload class="mr-2 h-4 w-4" />
			Export
		</Button>
	{/snippet}

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">Total Expenses</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-destructive">
					{formatCurrency(summary.totalAmount)}
				</div>
				<div class="flex items-center gap-1 text-sm">
					{#if monthChange() > 0}
						<IconTrendingUp class="h-4 w-4 text-destructive" />
						<span class="text-destructive">+{monthChange().toFixed(1)}%</span>
					{:else}
						<IconTrendingDown class="h-4 w-4 text-success" />
						<span class="text-success">{monthChange().toFixed(1)}%</span>
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
				<div class="text-2xl font-bold text-warning">
					{formatCurrency(summary.pendingAmount)}
				</div>
				<p class="text-sm text-muted-foreground">awaiting review</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">Approved</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-info text-2xl font-bold">
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
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
	<div>
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
											style="background-color: {category.color.startsWith('#')
												? category.color
												: ''}"
											class:bg-chart-3={category.color === 'bg-chart-3'}
											class:bg-chart-6={category.color === 'bg-chart-6'}
											class:bg-chart-5={category.color === 'bg-chart-5'}
											class:bg-chart-1={category.color === 'bg-chart-1'}
											class:bg-chart-4={category.color === 'bg-chart-4'}
											class:bg-chart-2={category.color === 'bg-chart-2'}
											class:bg-chart-7={category.color === 'bg-chart-7'}
											class:bg-muted-foreground={category.color === 'bg-muted-foreground'}
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
										style="width: {Math.min(
											category.percentage,
											100
										)}%; background-color: {category.color.startsWith('#') ? category.color : ''}"
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
	<div>
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
								<Table.Head class="hidden md:table-cell">Category</Table.Head>
								<Table.Head class="hidden lg:table-cell">Date</Table.Head>
								<Table.Head class="text-right">Amount</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each topExpenses() as expense, i}
								<Table.Row>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<span
												class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium"
											>
												{i + 1}
											</span>
											{expense.description}
										</div>
									</Table.Cell>
									<Table.Cell class="hidden md:table-cell">
										<Badge variant="outline">{expense.category}</Badge>
									</Table.Cell>
									<Table.Cell class="hidden text-muted-foreground lg:table-cell"
										>{expense.date}</Table.Cell
									>
									<Table.Cell class="text-right font-medium text-destructive">
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
</PageShell>
