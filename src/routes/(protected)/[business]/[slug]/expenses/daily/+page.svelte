<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PageShell from '$lib/components/global/page-shell.svelte';
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
	import * as Select from '$lib/components/ui/select';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import {
		createExpense,
		updateExpense,
		deleteExpense as deleteExpenseApi,
		approveExpense,
		rejectExpense,
		createExpenseCategory,
		deleteExpenseCategory,
		type Expense,
		type ExpenseCategory,
		type ExpensePaymentMethod,
		type CreateExpensePayload
	} from '$lib/api';
	import { formatCurrency as i18nFormatCurrency, CURRENCY_CONFIG } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	let expenses = $state<Expense[]>(data.expenses || []);
	let categories = $state<ExpenseCategory[]>(data.categories || []);
	let selectedDate = $state(data.selectedDate || new Date().toISOString().split('T')[0]);
	let showAddDialog = $state(false);
	let editingExpense = $state<Expense | null>(null);
	let isSubmitting = $state(false);
	let rejectDialogOpen = $state(false);
	let rejectTargetId = $state('');

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

	let showCategoryDialog = $state(false);
	let newCategoryName = $state('');
	let newCategoryColor = $state('#6366f1');
	let newCategoryDescription = $state('');
	let isCategorySubmitting = $state(false);

	const defaultColors = [
		'#ef4444',
		'#f97316',
		'#eab308',
		'#22c55e',
		'#06b6d4',
		'#6366f1',
		'#a855f7',
		'#ec4899',
		'#64748b',
		'#14b8a6'
	];

	async function addCategory() {
		if (!newCategoryName.trim()) {
			toast.error('Please enter a category name');
			return;
		}
		isCategorySubmitting = true;
		try {
			const result = await createExpenseCategory(data.businessId, {
				name: newCategoryName.trim(),
				color: newCategoryColor,
				description: newCategoryDescription.trim() || undefined
			});
			categories = [...categories, result.category];
			newExpense.categoryId = result.category.id;
			toast.success(`Category "${result.category.name}" created`);
			showCategoryDialog = false;
			newCategoryName = '';
			newCategoryColor = '#6366f1';
			newCategoryDescription = '';
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to create category'));
		} finally {
			isCategorySubmitting = false;
		}
	}

	async function handleDeleteCategory(categoryId: string) {
		try {
			await deleteExpenseCategory(data.businessId, categoryId);
			categories = categories.filter((c) => c.id !== categoryId);
			if (newExpense.categoryId === categoryId) newExpense.categoryId = '';
			toast.success('Category deleted');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete category'));
		}
	}

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
				total: expenses.filter((e) => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0)
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
		await goto(`?date=${newDate}`);
		await invalidate('app:expenses');
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
			toast.error(userFriendlyError(error, 'Failed to add expense'));
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
			toast.error(userFriendlyError(error, 'Failed to update expense'));
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
			toast.error(userFriendlyError(error, 'Failed to delete expense'));
		}
	}

	async function handleApprove(id: string) {
		try {
			const result = await approveExpense(data.businessId, id);
			expenses = expenses.map((e) => (e.id === id ? result.expense : e));
			toast.success('Expense approved');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to approve expense'));
		}
	}

	function handleReject(id: string) {
		rejectTargetId = id;
		rejectDialogOpen = true;
	}

	async function confirmReject(reason?: string) {
		if (!reason) return;
		try {
			const result = await rejectExpense(data.businessId, rejectTargetId, { reason });
			expenses = expenses.map((e) => (e.id === rejectTargetId ? result.expense : e));
			toast.success('Expense rejected');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to reject expense'));
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'pending':
				return {
					class: 'bg-warning/10 text-warning-foreground dark:text-warning',
					text: 'Pending'
				};
			case 'approved':
				return { class: 'bg-success/10 text-success', text: 'Approved' };
			case 'rejected':
				return { class: 'bg-destructive/10 text-destructive', text: 'Rejected' };
			case 'paid':
				return { class: 'bg-info/10 text-info', text: 'Paid' };
			default:
				return { class: 'bg-muted text-muted-foreground', text: status };
		}
	}
</script>

<PageShell title="Daily Expenses" description="Track and manage daily business expenses">
	{#snippet actions()}
		<div class="flex items-center gap-2">
			<IconCalendar class="h-5 w-5 text-muted-foreground" />
			<Input type="date" value={selectedDate} onchange={handleDateChange} class="w-auto" />
		</div>
		<Button onclick={() => (showAddDialog = true)}>
			<IconPlus class="mr-2 h-4 w-4" />
			Add Expense
		</Button>
	{/snippet}

	<!-- Daily Summary -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
		<Card.Root class="lg:col-span-1">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">Daily Total</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-bold text-destructive">{formatCurrency(dailyTotal)}</div>
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
							<p class="font-semibold">{formatCurrency(cat.total)}</p>
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
		<div>
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Description</Table.Head>
							<Table.Head class="hidden lg:table-cell">Category</Table.Head>
							<Table.Head class="hidden lg:table-cell">Vendor</Table.Head>
							<Table.Head class="hidden md:table-cell">Payment</Table.Head>
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
								<Table.Cell class="hidden lg:table-cell">
									<span
										class="rounded-full px-2 py-1 text-xs"
										style={getCategoryColor(expense.categoryId)}
									>
										{getCategoryName(expense.categoryId)}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{expense.vendorName || '-'}
								</Table.Cell>
								<Table.Cell class="hidden capitalize md:table-cell">
									{expense.paymentMethod.replace('_', ' ')}
								</Table.Cell>
								<Table.Cell>
									<span
										class="rounded-full px-2 py-1 text-xs {getStatusBadge(expense.status).class}"
									>
										{getStatusBadge(expense.status).text}
									</span>
								</Table.Cell>
								<Table.Cell class="font-medium text-destructive">
									-{formatCurrency(expense.amount)}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-1">
										{#if expense.status === 'pending'}
											<Button
												variant="ghost"
												size="icon"
												class="text-success"
												onclick={() => handleApprove(expense.id)}
												aria-label="Approve expense"
											>
												<IconCheck class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="text-destructive"
												onclick={() => handleReject(expense.id)}
												aria-label="Reject expense"
											>
												<IconX class="h-4 w-4" />
											</Button>
										{/if}
										<Button
											variant="ghost"
											size="icon"
											onclick={() => editExpense(expense)}
											aria-label="Edit expense"
										>
											<IconPencil class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="text-destructive hover:text-destructive"
											onclick={() => handleDeleteExpense(expense.id)}
											aria-label="Delete expense"
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
		<EmptyState
			type="no-data"
			title="No expenses for this day"
			description="Add an expense to start tracking."
			actionLabel="Add Expense"
			onAction={() => (showAddDialog = true)}
		/>
	{/if}
	<div>
		<div class="flex items-center justify-between border-t pt-4">
			<p class="text-sm text-muted-foreground">
				Showing {Math.min((data.page - 1) * data.limit + 1, data.total)} to {Math.min(
					data.page * data.limit,
					data.total
				)} of {data.total} results
			</p>
			<div class="flex gap-1">
				<Button
					size="sm"
					variant="outline"
					disabled={data.page <= 1}
					onclick={() =>
						goto(`?page=${data.page - 1}&limit=${data.limit}&date=${{ selectedDate }}`)}
					>Previous</Button
				>
				<Button
					size="sm"
					variant="outline"
					disabled={data.page >= data.totalPages}
					onclick={() =>
						goto(`?page=${data.page + 1}&limit=${data.limit}&date=${{ selectedDate }}`)}
					>Next</Button
				>
			</div>
		</div>
	</div>
</PageShell>

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
				<Input
					id="title"
					autofocus
					bind:value={newExpense.title}
					placeholder="What was this expense for?"
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="category" class="text-sm font-medium">Category *</label>
					<div class="flex gap-2">
						<Select.Root type="single" bind:value={newExpense.categoryId}>
							<Select.Trigger class="w-full">
								{newExpense.categoryId
									? categories.find((c) => c.id === newExpense.categoryId)?.name ||
										'Select category'
									: 'Select category'}
							</Select.Trigger>
							<Select.Content>
								{#each categories as category}
									<Select.Item value={category.id}>
										<span
											class="mr-2 inline-block h-2 w-2 rounded-full"
											style="background-color: {category.color};"
										></span>
										{category.name}
									</Select.Item>
								{/each}
								{#if categories.length === 0}
									<div class="px-2 py-1.5 text-sm text-muted-foreground">No categories yet</div>
								{/if}
							</Select.Content>
						</Select.Root>
						<Button
							variant="outline"
							size="icon"
							type="button"
							onclick={() => (showCategoryDialog = true)}
							title="Add new category"
						>
							<IconPlus class="h-4 w-4" />
						</Button>
					</div>
				</div>
				<div class="grid gap-2">
					<label for="amount" class="text-sm font-medium">Amount *</label>
					<div class="relative">
						<span class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
							>{CURRENCY_CONFIG[currency]?.symbol || '$'}</span
						>
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
					<Select.Root type="single" bind:value={newExpense.paymentMethod}>
						<Select.Trigger class="w-full">
							{paymentMethods.find((m) => m.value === newExpense.paymentMethod)?.label ||
								'Select method'}
						</Select.Trigger>
						<Select.Content>
							{#each paymentMethods as method}
								<Select.Item value={method.value}>{method.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
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
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
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
					<Input id="edit-title" autofocus bind:value={editingExpense.title} />
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
						<Select.Root type="single" bind:value={editingExpense.paymentMethod}>
							<Select.Trigger class="w-full">
								{paymentMethods.find((m) => m.value === editingExpense?.paymentMethod)?.label ||
									'Select method'}
							</Select.Trigger>
							<Select.Content>
								{#each paymentMethods as method}
									<Select.Item value={method.value}>{method.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
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
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- New Category Dialog -->
<Dialog.Root bind:open={showCategoryDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>New Category</Dialog.Title>
			<Dialog.Description>Create an expense category</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="cat-name" class="text-sm font-medium">Name *</label>
				<Input
					id="cat-name"
					autofocus
					bind:value={newCategoryName}
					placeholder="e.g. Rent, Utilities, Supplies"
				/>
			</div>
			<div class="grid gap-2">
				<label for="cat-desc" class="text-sm font-medium">Description</label>
				<Input
					id="cat-desc"
					bind:value={newCategoryDescription}
					placeholder="Optional description"
				/>
			</div>
			<div class="grid gap-2">
				<label class="text-sm font-medium">Color</label>
				<div class="flex flex-wrap gap-2">
					{#each defaultColors as color}
						<button
							type="button"
							class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
							style="background-color: {color}; border-color: {newCategoryColor === color
								? 'currentColor'
								: 'transparent'};"
							onclick={() => (newCategoryColor = color)}
						></button>
					{/each}
				</div>
			</div>
			{#if categories.length > 0}
				<div class="grid gap-2">
					<label class="text-sm font-medium">Existing Categories</label>
					<div class="flex flex-wrap gap-2">
						{#each categories as cat}
							<span
								class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
								style="background-color: {cat.color}20; color: {cat.color};"
							>
								<span class="h-2 w-2 rounded-full" style="background-color: {cat.color};"></span>
								{cat.name}
								<button
									type="button"
									class="ml-1 hover:text-destructive"
									onclick={() => handleDeleteCategory(cat.id)}
									title="Delete category"
								>
									<IconX class="h-3 w-3" />
								</button>
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => (showCategoryDialog = false)}
				disabled={isCategorySubmitting}
			>
				Cancel
			</Button>
			<Button onclick={addCategory} disabled={isCategorySubmitting || !newCategoryName.trim()}>
				{#if isCategorySubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Category
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={rejectDialogOpen}
	title="Reject Expense"
	description="Please provide a reason for rejecting this expense."
	confirmLabel="Reject Expense"
	variant="destructive"
	showInput={true}
	inputLabel="Rejection reason"
	inputPlaceholder="Enter rejection reason"
	inputRequired={true}
	onConfirm={confirmReject}
/>
