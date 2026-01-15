<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconReceipt,
		IconCalendar
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';

	// Dummy daily expenses data
	let expenses = $state([
		{
			id: 1,
			description: 'Fresh produce delivery',
			category: 'Inventory',
			amount: 245.5,
			paymentMethod: 'Bank Transfer',
			vendor: 'Local Farms',
			date: '2024-11-06',
			receiptNo: 'RCP-001',
			notes: 'Weekly vegetable order'
		},
		{
			id: 2,
			description: 'Kitchen equipment repair',
			category: 'Maintenance',
			amount: 150.0,
			paymentMethod: 'Cash',
			vendor: 'TechFix Services',
			date: '2024-11-06',
			receiptNo: 'RCP-002',
			notes: 'Oven thermostat replacement'
		},
		{
			id: 3,
			description: 'Staff meal allowance',
			category: 'Staff',
			amount: 45.0,
			paymentMethod: 'Cash',
			vendor: '-',
			date: '2024-11-06',
			receiptNo: '-',
			notes: 'Daily staff meals'
		},
		{
			id: 4,
			description: 'Cleaning supplies',
			category: 'Supplies',
			amount: 89.99,
			paymentMethod: 'Card',
			vendor: 'CleanPro',
			date: '2024-11-06',
			receiptNo: 'RCP-003',
			notes: ''
		},
		{
			id: 5,
			description: 'Electricity bill payment',
			category: 'Utilities',
			amount: 420.0,
			paymentMethod: 'Bank Transfer',
			vendor: 'City Power Co.',
			date: '2024-11-05',
			receiptNo: 'UTL-001',
			notes: 'November bill'
		},
		{
			id: 6,
			description: 'Marketing flyers',
			category: 'Marketing',
			amount: 75.0,
			paymentMethod: 'Card',
			vendor: 'QuickPrint',
			date: '2024-11-05',
			receiptNo: 'RCP-004',
			notes: '500 promotional flyers'
		}
	]);

	let selectedDate = $state('2024-11-06');
	let showAddDialog = $state(false);
	let editingExpense = $state<(typeof expenses)[0] | null>(null);

	let newExpense = $state({
		description: '',
		category: 'Inventory',
		amount: 0,
		paymentMethod: 'Cash',
		vendor: '',
		receiptNo: '',
		notes: ''
	});

	const categories = [
		'Inventory',
		'Utilities',
		'Maintenance',
		'Staff',
		'Supplies',
		'Marketing',
		'Rent',
		'Insurance',
		'Other'
	];
	const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'Check'];

	const filteredExpenses = $derived(expenses.filter((exp) => exp.date === selectedDate));

	const dailyTotal = $derived(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0));

	const categoryTotals = $derived(
		categories
			.map((cat) => ({
				category: cat,
				total: filteredExpenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
			}))
			.filter((c) => c.total > 0)
	);

	function addExpense() {
		if (!newExpense.description.trim() || newExpense.amount <= 0) {
			toast.error('Please fill in description and amount');
			return;
		}

		expenses = [
			...expenses,
			{
				id: Math.max(...expenses.map((e) => e.id)) + 1,
				...newExpense,
				date: selectedDate
			}
		];

		toast.success('Expense added successfully');
		showAddDialog = false;
		newExpense = {
			description: '',
			category: 'Inventory',
			amount: 0,
			paymentMethod: 'Cash',
			vendor: '',
			receiptNo: '',
			notes: ''
		};
	}

	function editExpense(expense: (typeof expenses)[0]) {
		editingExpense = { ...expense };
	}

	function saveExpense() {
		if (!editingExpense) return;

		expenses = expenses.map((e) => (e.id === editingExpense!.id ? editingExpense! : e));
		toast.success('Expense updated successfully');
		editingExpense = null;
	}

	function deleteExpense(id: number) {
		expenses = expenses.filter((e) => e.id !== id);
		toast.success('Expense deleted successfully');
	}

	function getCategoryColor(category: string) {
		const colors: Record<string, string> = {
			Inventory: 'bg-blue-100 text-blue-800',
			Utilities: 'bg-yellow-100 text-yellow-800',
			Maintenance: 'bg-orange-100 text-orange-800',
			Staff: 'bg-green-100 text-green-800',
			Supplies: 'bg-purple-100 text-purple-800',
			Marketing: 'bg-pink-100 text-pink-800',
			Rent: 'bg-red-100 text-red-800',
			Insurance: 'bg-gray-100 text-gray-800',
			Other: 'bg-slate-100 text-slate-800'
		};
		return colors[category] || 'bg-gray-100 text-gray-800';
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Daily Expenses</h1>
					<p class="text-muted-foreground">Track and manage daily business expenses</p>
				</div>
				<div class="flex gap-2">
					<div class="flex items-center gap-2">
						<IconCalendar class="h-5 w-5 text-muted-foreground" />
						<Input type="date" bind:value={selectedDate} class="w-auto" />
					</div>
					<Button onclick={() => (showAddDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Expense
					</Button>
				</div>
			</div>

			<!-- Daily Summary -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-4">
				<Card.Root class="lg:col-span-1">
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Daily Total</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-3xl font-bold text-red-600">${dailyTotal.toFixed(2)}</div>
						<p class="text-sm text-muted-foreground">{filteredExpenses.length} transactions</p>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-3">
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">By Category</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-3">
							{#each categoryTotals as cat}
								<div class="rounded-lg bg-muted px-3 py-2">
									<p class="text-xs text-muted-foreground">{cat.category}</p>
									<p class="font-semibold">${cat.total.toFixed(2)}</p>
								</div>
							{/each}
							{#if categoryTotals.length === 0}
								<p class="text-sm text-muted-foreground">No expenses for this day</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Expenses Table -->
			<div class="px-6">
				<div class="rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Description</Table.Head>
								<Table.Head>Category</Table.Head>
								<Table.Head>Vendor</Table.Head>
								<Table.Head>Payment</Table.Head>
								<Table.Head>Receipt</Table.Head>
								<Table.Head>Amount</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredExpenses as expense (expense.id)}
								<Table.Row>
									<Table.Cell>
										<div>
											<p class="font-medium">{expense.description}</p>
											{#if expense.notes}
												<p class="text-sm text-muted-foreground">{expense.notes}</p>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										<span class="rounded-full px-2 py-1 text-xs {getCategoryColor(expense.category)}">
											{expense.category}
										</span>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">{expense.vendor}</Table.Cell>
									<Table.Cell>{expense.paymentMethod}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{expense.receiptNo}</Table.Cell>
									<Table.Cell class="font-medium text-red-600">
										-${expense.amount.toFixed(2)}
									</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-1">
											<Button variant="ghost" size="sm" onclick={() => editExpense(expense)}>
												<IconPencil class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												class="text-destructive hover:text-destructive"
												onclick={() => deleteExpense(expense.id)}
											>
												<IconTrash class="h-4 w-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if filteredExpenses.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconReceipt class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No expenses for this day</h3>
					<p class="text-muted-foreground">Add an expense to start tracking.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Expense Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Expense</Dialog.Title>
			<Dialog.Description>Record a new expense for {selectedDate}</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="description" class="text-sm font-medium">Description *</label>
				<Input id="description" bind:value={newExpense.description} placeholder="What was this expense for?" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="category" class="text-sm font-medium">Category</label>
					<select
						id="category"
						bind:value={newExpense.category}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{#each categories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-2">
					<label for="amount" class="text-sm font-medium">Amount *</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
						<Input id="amount" type="number" step="0.01" min="0" bind:value={newExpense.amount} class="pl-6" />
					</div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="vendor" class="text-sm font-medium">Vendor</label>
					<Input id="vendor" bind:value={newExpense.vendor} placeholder="Vendor name" />
				</div>
				<div class="grid gap-2">
					<label for="payment" class="text-sm font-medium">Payment Method</label>
					<select
						id="payment"
						bind:value={newExpense.paymentMethod}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{#each paymentMethods as method}
							<option value={method}>{method}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="receipt" class="text-sm font-medium">Receipt No.</label>
					<Input id="receipt" bind:value={newExpense.receiptNo} placeholder="Optional" />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="notes" class="text-sm font-medium">Notes</label>
				<Input id="notes" bind:value={newExpense.notes} placeholder="Additional details" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addExpense}>Add Expense</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Expense Dialog -->
<Dialog.Root open={!!editingExpense} onOpenChange={(open) => !open && (editingExpense = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Expense</Dialog.Title>
			<Dialog.Description>Update expense details</Dialog.Description>
		</Dialog.Header>
		{#if editingExpense}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-description" class="text-sm font-medium">Description</label>
					<Input id="edit-description" bind:value={editingExpense.description} />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-category" class="text-sm font-medium">Category</label>
						<select
							id="edit-category"
							bind:value={editingExpense.category}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{#each categories as category}
								<option value={category}>{category}</option>
							{/each}
						</select>
					</div>
					<div class="grid gap-2">
						<label for="edit-amount" class="text-sm font-medium">Amount</label>
						<Input id="edit-amount" type="number" step="0.01" min="0" bind:value={editingExpense.amount} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-vendor" class="text-sm font-medium">Vendor</label>
						<Input id="edit-vendor" bind:value={editingExpense.vendor} />
					</div>
					<div class="grid gap-2">
						<label for="edit-payment" class="text-sm font-medium">Payment Method</label>
						<select
							id="edit-payment"
							bind:value={editingExpense.paymentMethod}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{#each paymentMethods as method}
								<option value={method}>{method}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-notes" class="text-sm font-medium">Notes</label>
					<Input id="edit-notes" bind:value={editingExpense.notes} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingExpense = null)}>Cancel</Button>
				<Button onclick={saveExpense}>Save Changes</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
