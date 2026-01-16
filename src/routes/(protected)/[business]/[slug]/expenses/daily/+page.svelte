<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Loader2 } from '@lucide/svelte';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconReceipt,
		IconCalendar,
		IconCheck,
		IconX
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		createExpense,
		updateExpense,
		deleteExpense as deleteExpenseApi,
		approveExpense,
		rejectExpense,
		type Expense,
		type ExpenseCategory,
		type PaymentMethod as ExpensePaymentMethod,
		type CreateExpensePayload
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let expenses = $state<Expense[]>(data.expenses || []);
	let categories = $state<ExpenseCategory[]>(data.categories || []);
	let selectedDate = $state(data.selectedDate || new Date().toISOString().split('T')[0]);
	let showAddDialog = $state(false);
	let editingExpense = $state<Expense | null>(null);
	let isSubmitting = $state(false);

	let newExpense = $state<{
		title: string;
		description: string;
		categoryId: string;
		amount: number;
		paymentMethod: ExpensePaymentMethod;
		vendorName: string;
		receiptNumber: string;
		notes: string;
	}>({
		title: '',
		description: '',
		categoryId: '',
		amount: 0,
		paymentMethod: 'cash',
		vendorName: '',
		receiptNumber: '',
		notes: ''
	});

	const paymentMethods: { value: ExpensePaymentMethod; label: string }[] = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'card', label: 'Card' },
		{ value: 'upi', label: 'UPI' },
		{ value: 'bank_transfer', label: 'Bank Transfer' },
		{ value: 'cheque', label: 'Cheque' },
		{ value: 'other', label: 'Other' }
	];

	const dailyTotal = $derived(expenses.reduce((sum, exp) => sum + exp.amount, 0));

	const categoryTotals = $derived(
		categories
			.map((cat) => ({
				category: cat.name,
				color: cat.color,
				total: expenses
					.filter((e) => e.categoryId === cat.id)
					.reduce((sum, e) => sum + e.amount, 0)
			}))
			.filter((c) => c.total > 0)
	);

	function getCategoryName(categoryId: string): string {
		return categories.find((c) => c.id === categoryId)?.name || 'Uncategorized';
	}

	function getCategoryColor(categoryId: string): string {
		const color = categories.find((c) => c.id === categoryId)?.color || '#gray';
		return `background-color: ${color}20; color: ${color};`;
	}

	async function handleDateChange(e: Event) {
		const newDate = (e.target as HTMLInputElement).value;
		selectedDate = newDate;
		await goto(`?date=${newDate}`, { invalidateAll: true });
	}

	async function addExpense() {
		if (!newExpense.title.trim() || newExpense.amount <= 0) {
			toast.error('Please fill in title and amount');
			return;
		}
		if (!newExpense.categoryId) {
			toast.error('Please select a category');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateExpensePayload = {
				categoryId: newExpense.categoryId,
				title: newExpense.title,
				description: newExpense.description || undefined,
				amount: newExpense.amount,
				expenseDate: selectedDate,
				paymentMethod: newExpense.paymentMethod,
				vendorName: newExpense.vendorName || undefined,
				receiptNumber: newExpense.receiptNumber || undefined,
				notes: newExpense.notes || undefined
			};

			const result = await createExpense(data.businessId, payload);
			expenses = [...expenses, result.expense];
			toast.success('Expense added successfully');
			showAddDialog = false;
			newExpense = {
				title: '',
				description: '',
				categoryId: '',
				amount: 0,
				paymentMethod: 'cash',
				vendorName: '',
				receiptNumber: '',
				notes: ''
			};
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add expense');
		} finally {
			isSubmitting = false;
		}
	}

	function editExpense(expense: Expense) {
		editingExpense = { ...expense };
	}

	async function saveExpense() {
		if (!editingExpense) return;

		isSubmitting = true;
		try {
			const result = await updateExpense(data.businessId, editingExpense.id, {
				title: editingExpense.title,
				description: editingExpense.description,
				amount: editingExpense.amount,
				paymentMethod: editingExpense.paymentMethod,
				vendorName: editingExpense.vendorName,
				notes: editingExpense.notes
			});
			expenses = expenses.map((e) => (e.id === editingExpense!.id ? result.expense : e));
			toast.success('Expense updated successfully');
			editingExpense = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update expense');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDeleteExpense(id: string) {
		try {
			await deleteExpenseApi(data.businessId, id);
			expenses = expenses.filter((e) => e.id !== id);
			toast.success('Expense deleted successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
		}
	}

	async function handleApprove(id: string) {
		try {
			const result = await approveExpense(data.businessId, id);
			expenses = expenses.map((e) => (e.id === id ? result.expense : e));
			toast.success('Expense approved');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to approve expense');
		}
	}

	async function handleReject(id: string) {
		const reason = prompt('Please enter rejection reason:');
		if (!reason) return;

		try {
			const result = await rejectExpense(data.businessId, id, { reason });
			expenses = expenses.map((e) => (e.id === id ? result.expense : e));
			toast.success('Expense rejected');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to reject expense');
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'pending':
				return { class: 'bg-yellow-100 text-yellow-800', text: 'Pending' };
			case 'approved':
				return { class: 'bg-green-100 text-green-800', text: 'Approved' };
			case 'rejected':
				return { class: 'bg-red-100 text-red-800', text: 'Rejected' };
			case 'paid':
				return { class: 'bg-blue-100 text-blue-800', text: 'Paid' };
			default:
				return { class: 'bg-gray-100 text-gray-800', text: status };
		}
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
						<Input type="date" value={selectedDate} onchange={handleDateChange} class="w-auto" />
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
						<p class="text-sm text-muted-foreground">{expenses.length} transactions</p>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-3">
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">By Category</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-3">
							{#each categoryTotals as cat}
								<div class="rounded-lg px-3 py-2" style="background-color: {cat.color}20;">
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
			{#if expenses.length > 0}
				<div class="px-6">
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Description</Table.Head>
									<Table.Head>Category</Table.Head>
									<Table.Head>Vendor</Table.Head>
									<Table.Head>Payment</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Amount</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each expenses as expense (expense.id)}
									<Table.Row>
										<Table.Cell>
											<div>
												<p class="font-medium">{expense.title}</p>
												{#if expense.notes}
													<p class="text-sm text-muted-foreground">{expense.notes}</p>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell>
											<span
												class="rounded-full px-2 py-1 text-xs"
												style={getCategoryColor(expense.categoryId)}
											>
												{getCategoryName(expense.categoryId)}
											</span>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{expense.vendorName || '-'}
										</Table.Cell>
										<Table.Cell class="capitalize">
											{expense.paymentMethod.replace('_', ' ')}
										</Table.Cell>
										<Table.Cell>
											<span class="rounded-full px-2 py-1 text-xs {getStatusBadge(expense.status).class}">
												{getStatusBadge(expense.status).text}
											</span>
										</Table.Cell>
										<Table.Cell class="font-medium text-red-600">
											-${expense.amount.toFixed(2)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												{#if expense.status === 'pending'}
													<Button
														variant="ghost"
														size="sm"
														class="h-8 w-8 p-0 text-green-600"
														onclick={() => handleApprove(expense.id)}
													>
														<IconCheck class="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														class="h-8 w-8 p-0 text-red-600"
														onclick={() => handleReject(expense.id)}
													>
														<IconX class="h-4 w-4" />
													</Button>
												{/if}
												<Button variant="ghost" size="sm" onclick={() => editExpense(expense)}>
													<IconPencil class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="text-destructive hover:text-destructive"
													onclick={() => handleDeleteExpense(expense.id)}
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
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconReceipt class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No expenses for this day</h3>
					<p class="text-muted-foreground">Add an expense to start tracking.</p>
					<Button class="mt-4" onclick={() => (showAddDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Expense
					</Button>
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
				<label for="title" class="text-sm font-medium">Title *</label>
				<Input id="title" bind:value={newExpense.title} placeholder="What was this expense for?" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="category" class="text-sm font-medium">Category *</label>
					<select
						id="category"
						bind:value={newExpense.categoryId}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Select category</option>
						{#each categories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-2">
					<label for="amount" class="text-sm font-medium">Amount *</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
						<Input
							id="amount"
							type="number"
							step="0.01"
							min="0"
							bind:value={newExpense.amount}
							class="pl-6"
						/>
					</div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="vendor" class="text-sm font-medium">Vendor</label>
					<Input id="vendor" bind:value={newExpense.vendorName} placeholder="Vendor name" />
				</div>
				<div class="grid gap-2">
					<label for="payment" class="text-sm font-medium">Payment Method</label>
					<select
						id="payment"
						bind:value={newExpense.paymentMethod}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{#each paymentMethods as method}
							<option value={method.value}>{method.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="receipt" class="text-sm font-medium">Receipt No.</label>
					<Input id="receipt" bind:value={newExpense.receiptNumber} placeholder="Optional" />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="notes" class="text-sm font-medium">Notes</label>
				<Input id="notes" bind:value={newExpense.notes} placeholder="Additional details" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addExpense} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Expense
			</Button>
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
					<label for="edit-title" class="text-sm font-medium">Title</label>
					<Input id="edit-title" bind:value={editingExpense.title} />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-amount" class="text-sm font-medium">Amount</label>
						<Input
							id="edit-amount"
							type="number"
							step="0.01"
							min="0"
							bind:value={editingExpense.amount}
						/>
					</div>
					<div class="grid gap-2">
						<label for="edit-payment" class="text-sm font-medium">Payment Method</label>
						<select
							id="edit-payment"
							bind:value={editingExpense.paymentMethod}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{#each paymentMethods as method}
								<option value={method.value}>{method.label}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-vendor" class="text-sm font-medium">Vendor</label>
					<Input id="edit-vendor" bind:value={editingExpense.vendorName} />
				</div>
				<div class="grid gap-2">
					<label for="edit-notes" class="text-sm font-medium">Notes</label>
					<Input id="edit-notes" bind:value={editingExpense.notes} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingExpense = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveExpense} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
