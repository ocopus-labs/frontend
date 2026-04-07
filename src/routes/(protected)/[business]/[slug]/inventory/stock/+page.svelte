<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
import { Checkbox } from '$lib/components/ui/checkbox';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconPlus,
		IconPencil,
		IconTrendingUp,
		IconTrash,
		IconHistory,
		IconChevronLeft,
		IconChevronRight,
		IconLoader2,
		IconDownload
	} from '@tabler/icons-svelte';
	import StatCard from '$lib/components/global/stat-card.svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		createInventoryItem,
		updateInventoryItem,
		processStockTransaction,
		deleteInventoryItem,
		exportInventory,
		type InventoryItem,
		type InventoryTransaction,
		type InventoryCategory,
		type InventoryUnit,
		type CreateInventoryItemPayload
	} from '$lib/api';
	import { downloadBlob } from '$lib/utils/export';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { userFriendlyError } from '$lib/utils/error';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import * as Select from '$lib/components/ui/select';
	import { canModify } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	const userRole = $derived((data as any).userRole as string ?? '');

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	let inventory = $derived<InventoryItem[]>(data.items || []);
	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let stockFilter = $state('all');
	let showAddDialog = $state(false);
	let editingItem = $state<InventoryItem | null>(null);
	let adjustingStock = $state<{ item: InventoryItem; adjustment: number; reason: string } | null>(null);
	let isSubmitting = $state(false);
	let deleteItemDialogOpen = $state(false);
	let deleteItemId = $state<string | null>(null);
	let historyItem = $state<InventoryItem | null>(null);

	// SKU auto-generation tracking
	let skuManuallyEdited = $state(false);

	let newItem = $state<{
		name: string;
		sku: string;
		category: InventoryCategory;
		currentStock: number;
		minimumStock: number;
		unit: InventoryUnit;
		costPerUnit: number;
		trackExpiry: boolean;
		expiryDate: string;
	}>({
		name: '',
		sku: '',
		category: 'raw_materials',
		currentStock: 0,
		minimumStock: 10,
		unit: 'kg',
		costPerUnit: 0,
		trackExpiry: false,
		expiryDate: ''
	});

	// Edit dialog expiry fields
	let editTrackExpiry = $state(false);
	let editExpiryDate = $state('');

	const categories: { value: InventoryCategory; label: string }[] = [
		{ value: 'raw_materials', label: 'Raw Materials' },
		{ value: 'beverages', label: 'Beverages' },
		{ value: 'dairy', label: 'Dairy' },
		{ value: 'meat', label: 'Meat' },
		{ value: 'seafood', label: 'Seafood' },
		{ value: 'vegetables', label: 'Vegetables' },
		{ value: 'fruits', label: 'Fruits' },
		{ value: 'spices', label: 'Spices' },
		{ value: 'condiments', label: 'Condiments' },
		{ value: 'packaging', label: 'Packaging' },
		{ value: 'cleaning', label: 'Cleaning' },
		{ value: 'equipment', label: 'Equipment' },
		{ value: 'other', label: 'Other' }
	];

	const units: { value: InventoryUnit; label: string }[] = [
		{ value: 'kg', label: 'Kilograms (kg)' },
		{ value: 'g', label: 'Grams (g)' },
		{ value: 'l', label: 'Liters (l)' },
		{ value: 'ml', label: 'Milliliters (ml)' },
		{ value: 'piece', label: 'Pieces' },
		{ value: 'dozen', label: 'Dozen' },
		{ value: 'box', label: 'Boxes' },
		{ value: 'pack', label: 'Packs' },
		{ value: 'bottle', label: 'Bottles' },
		{ value: 'can', label: 'Cans' },
		{ value: 'bag', label: 'Bags' }
	];

	const filteredInventory = $derived(
		inventory.filter((item) => {
			const matchesSearch =
				item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.sku.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

			let matchesStock = true;
			if (stockFilter === 'low') {
				matchesStock = item.currentStock < item.minimumStock;
			} else if (stockFilter === 'ok') {
				matchesStock = item.currentStock >= item.minimumStock;
			}

			return matchesSearch && matchesCategory && matchesStock;
		})
	);

	const stats = $derived({
		totalItems: inventory.length,
		lowStock: inventory.filter((i) => i.currentStock < i.minimumStock).length,
		totalValue: inventory.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0)
	});

	// Issue 2.4: Negative stock guard
	const adjustmentWouldGoNegative = $derived(
		adjustingStock ? (adjustingStock.item.currentStock + adjustingStock.adjustment) < 0 : false
	);

	// Pagination
	const paginationLimit = $derived(data.pagination?.limit || 25);
	const paginationOffset = $derived(data.pagination?.offset || 0);
	const totalItems = $derived(data.total || 0);
	const currentPage = $derived(Math.floor(paginationOffset / paginationLimit) + 1);
	const totalPages = $derived(Math.max(1, Math.ceil(totalItems / paginationLimit)));

	function goToPage(pageNum: number) {
		const url = new URL($page.url);
		const newOffset = (pageNum - 1) * paginationLimit;
		if (newOffset > 0) url.searchParams.set('offset', String(newOffset));
		else url.searchParams.delete('offset');
		goto(url.toString(), { replaceState: true });
	}

	function getCategoryLabel(category: InventoryCategory): string {
		return categories.find((c) => c.value === category)?.label || category;
	}

	function getUnitLabel(unit: InventoryUnit): string {
		return units.find((u) => u.value === unit)?.label || unit;
	}

	function getStockStatus(item: InventoryItem): { status: 'success' | 'warning' | 'error'; text: string } {
		const ratio = item.currentStock / item.minimumStock;
		if (ratio < 0.5) return { status: 'error', text: 'Critical' };
		if (ratio < 1) return { status: 'warning', text: 'Low' };
		return { status: 'success', text: 'OK' };
	}

	// Issue 2.6: SKU auto-generation
	function generateSku(category: string, name: string): string {
		const catLabel = categories.find((c) => c.value === category)?.label || category;
		const prefix = catLabel.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
		const initials = name
			.split(/\s+/)
			.map((w) => w[0] || '')
			.join('')
			.toUpperCase()
			.substring(0, 3);
		const num = Math.floor(Math.random() * 900 + 100);
		return `${prefix}-${initials}${num}`;
	}

	// Auto-fill SKU when name/category changes in add dialog
	$effect(() => {
		if (showAddDialog && !skuManuallyEdited && newItem.name.trim()) {
			newItem.sku = generateSku(newItem.category, newItem.name);
		}
	});

	function openAddDialog() {
		skuManuallyEdited = false;
		newItem = {
			name: '',
			sku: '',
			category: 'raw_materials',
			currentStock: 0,
			minimumStock: 10,
			unit: 'kg',
			costPerUnit: 0,
			trackExpiry: false,
			expiryDate: ''
		};
		showAddDialog = true;
	}

	async function addItem() {
		if (!newItem.name.trim() || !newItem.sku.trim()) {
			toast.error('Name and SKU are required');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateInventoryItemPayload = {
				name: newItem.name,
				sku: newItem.sku,
				category: newItem.category,
				currentStock: newItem.currentStock,
				minimumStock: newItem.minimumStock,
				unit: newItem.unit,
				costPerUnit: newItem.costPerUnit,
				trackExpiry: newItem.trackExpiry,
				expiryDate: newItem.trackExpiry && newItem.expiryDate ? newItem.expiryDate : undefined
			};

			await createInventoryItem(data.businessId, payload);
			toast.success('Item added successfully');
			showAddDialog = false;
			await invalidate('app:inventory');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add item'));
		} finally {
			isSubmitting = false;
		}
	}

	function editItem(item: InventoryItem) {
		editingItem = { ...item };
		editTrackExpiry = item.trackExpiry || false;
		editExpiryDate = item.expiryDate ? item.expiryDate.substring(0, 10) : '';
	}

	async function saveItem() {
		if (!editingItem) return;

		isSubmitting = true;
		try {
			await updateInventoryItem(data.businessId, editingItem.id, {
				name: editingItem.name,
				sku: editingItem.sku,
				category: editingItem.category,
				minimumStock: editingItem.minimumStock,
				unit: editingItem.unit,
				costPerUnit: editingItem.costPerUnit,
				trackExpiry: editTrackExpiry,
				expiryDate: editTrackExpiry && editExpiryDate ? editExpiryDate : undefined
			});
			toast.success('Item updated successfully');
			editingItem = null;
			await invalidate('app:inventory');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update item'));
		} finally {
			isSubmitting = false;
		}
	}

	function triggerDeleteItem(itemId: string) {
		deleteItemId = itemId;
		deleteItemDialogOpen = true;
	}

	async function confirmDeleteItem() {
		if (!deleteItemId) return;
		try {
			await deleteInventoryItem(data.businessId, deleteItemId);
			toast.success('Item deleted successfully');
			await invalidate('app:inventory');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete item'));
		}
		deleteItemId = null;
	}

	function openStockAdjustment(item: InventoryItem) {
		adjustingStock = { item, adjustment: 0, reason: '' };
	}

	async function adjustStock() {
		if (!adjustingStock || adjustingStock.adjustment === 0) {
			toast.error('Please enter an adjustment amount');
			return;
		}

		// Issue 2.4: Guard against negative result
		if (adjustingStock.item.currentStock + adjustingStock.adjustment < 0) {
			toast.error('Stock cannot go below zero');
			return;
		}

		isSubmitting = true;
		try {
			const type = adjustingStock.adjustment > 0 ? 'add' : 'remove';
			await processStockTransaction(data.businessId, adjustingStock.item.id, {
				type,
				quantity: Math.abs(adjustingStock.adjustment),
				reason: adjustingStock.reason || undefined
			});
			toast.success('Stock adjusted successfully');
			adjustingStock = null;
			await invalidate('app:inventory');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to adjust stock'));
		} finally {
			isSubmitting = false;
		}
	}

	function openHistory(item: InventoryItem) {
		historyItem = item;
	}

	async function handleExportInventory() {
		try {
			const blob = await exportInventory(data.businessId, {
				category: categoryFilter !== 'all' ? categoryFilter : undefined
			});
			downloadBlob(blob, `inventory-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Inventory exported successfully');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to export inventory'));
		}
	}

	function formatTransactionType(type: string): string {
		const map: Record<string, string> = {
			add: 'Added',
			remove: 'Removed',
			adjust: 'Adjusted',
			waste: 'Waste',
			transfer: 'Transfer'
		};
		return map[type] || type;
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Inventory Stock" description="Track and manage your inventory levels">
				{#snippet actions()}
					<Button variant="outline" onclick={handleExportInventory}>
						<IconDownload class="mr-2 h-4 w-4" />
						Export
					</Button>
					{#if canModify(userRole)}
						<Button onclick={openAddDialog}>
							<IconPlus class="mr-2 h-4 w-4" />
							Add Item
						</Button>
					{/if}
				{/snippet}
			</PageHeader>

			<!-- Stats -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-3">
				<StatCard
					label="Total Items"
					value={stats.totalItems}
				/>
				<StatCard
					label="Low Stock Items"
					value={stats.lowStock}
				/>
				<StatCard
					label="Total Value"
					value={formatCurrency(stats.totalValue)}
				/>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<SearchInput
					bind:value={searchQuery}
					placeholder="Search inventory..."
					debounceMs={300}
					class="max-w-sm"
				/>
				<div class="flex gap-2">
					<FilterDropdown
						bind:value={categoryFilter}
						placeholder="All Categories"
						allOptionLabel="All Categories"
						options={categories}
					/>
					<FilterDropdown
						bind:value={stockFilter}
						placeholder="All Stock Levels"
						allOptionLabel="All Stock Levels"
						options={[
							{ value: 'low', label: 'Low Stock' },
							{ value: 'ok', label: 'In Stock' }
						]}
					/>
				</div>
			</div>

			<!-- Inventory Table -->
			{#if filteredInventory.length > 0}
				<div class="px-6">
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Item</Table.Head>
									<Table.Head>SKU</Table.Head>
									<Table.Head>Category</Table.Head>
									<Table.Head>Quantity</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Cost/Unit</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredInventory as item (item.id)}
									<Table.Row class={item.currentStock < item.minimumStock ? 'bg-warning/5' : ''}>
										<Table.Cell class="font-medium">{item.name}</Table.Cell>
										<Table.Cell class="text-muted-foreground">{item.sku}</Table.Cell>
										<Table.Cell>
											<Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
										</Table.Cell>
										<Table.Cell>
											<div>
												<span class="font-medium">{item.currentStock}</span>
												<span class="text-muted-foreground"> {item.unit}</span>
											</div>
											<div class="text-xs text-muted-foreground">Min: {item.minimumStock}</div>
										</Table.Cell>
										<Table.Cell>
											<StatusPill
												label={getStockStatus(item).text}
												status={getStockStatus(item).status}
											/>
										</Table.Cell>
										<Table.Cell>{formatCurrency(item.costPerUnit)}</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button variant="ghost" size="icon" onclick={() => openHistory(item)} title="Transaction history" aria-label="Transaction history">
													<IconHistory class="h-4 w-4" />
												</Button>
												{#if canModify(userRole)}
													<Button
														variant="ghost"
														size="sm"
														class="h-8"
														onclick={() => openStockAdjustment(item)}
														title="Adjust stock"
													>
														<IconTrendingUp class="mr-1 h-4 w-4" />
														Adjust
													</Button>
													<Button variant="ghost" size="icon" onclick={() => editItem(item)} title="Edit item" aria-label="Edit item">
														<IconPencil class="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														class="text-destructive hover:text-destructive"
														onclick={() => triggerDeleteItem(item.id)}
														title="Delete item"
														aria-label="Delete item"
													>
														<IconTrash class="h-4 w-4" />
													</Button>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<EmptyState type="empty" title="No inventory items" description="Add your first inventory item to get started." />
			{/if}

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-between px-6">
					<p class="text-sm text-muted-foreground">
						Showing {paginationOffset + 1}–{Math.min(paginationOffset + paginationLimit, totalItems)} of {totalItems} {totalItems === 1 ? 'item' : 'items'}
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage <= 1}
							onclick={() => goToPage(currentPage - 1)}
						>
							<IconChevronLeft class="mr-1 h-4 w-4" />
							Previous
						</Button>
						<span class="text-sm">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage >= totalPages}
							onclick={() => goToPage(currentPage + 1)}
						>
							Next
							<IconChevronRight class="ml-1 h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Item Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Inventory Item</Dialog.Title>
			<Dialog.Description>Add a new item to your inventory</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="name" class="text-sm font-medium">Name *</label>
					<Input id="name" autofocus bind:value={newItem.name} placeholder="Item name" />
				</div>
				<div class="grid gap-2">
					<label for="sku" class="text-sm font-medium">SKU *</label>
					<Input
						id="sku"
						bind:value={newItem.sku}
						placeholder="Auto-generated"
						oninput={() => { skuManuallyEdited = true; }}
					/>
					{#if !skuManuallyEdited && newItem.name.trim()}
						<p class="text-xs text-muted-foreground">Auto-generated from name & category</p>
					{/if}
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="category" class="text-sm font-medium">Category</label>
					<Select.Root type="single" bind:value={newItem.category}>
						<Select.Trigger class="w-full">
							{categories.find(c => c.value === newItem.category)?.label || 'Select category'}
						</Select.Trigger>
						<Select.Content>
							{#each categories as category}
								<Select.Item value={category.value}>{category.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<label for="unit" class="text-sm font-medium">Unit</label>
					<Select.Root type="single" bind:value={newItem.unit}>
						<Select.Trigger class="w-full">
							{units.find(u => u.value === newItem.unit)?.label || 'Select unit'}
						</Select.Trigger>
						<Select.Content>
							{#each units as unit}
								<Select.Item value={unit.value}>{unit.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="grid grid-cols-3 gap-4">
				<div class="grid gap-2">
					<label for="currentStock" class="text-sm font-medium">Current Stock</label>
					<Input id="currentStock" type="number" min="0" bind:value={newItem.currentStock} />
				</div>
				<div class="grid gap-2">
					<label for="minimumStock" class="text-sm font-medium">Min Stock</label>
					<Input id="minimumStock" type="number" min="0" bind:value={newItem.minimumStock} />
				</div>
				<div class="grid gap-2">
					<label for="cost" class="text-sm font-medium">Cost/Unit</label>
					<Input id="cost" type="number" step="0.01" min="0" bind:value={newItem.costPerUnit} />
				</div>
			</div>
			<div class="grid gap-2">
				<div class="flex items-center gap-2">
					<Checkbox id="trackExpiry" bind:checked={newItem.trackExpiry} />
					<label for="trackExpiry" class="text-sm font-medium">Track expiry date</label>
				</div>
				{#if newItem.trackExpiry}
					<Input
						id="expiryDate"
						type="date"
						bind:value={newItem.expiryDate}
						min={new Date().toISOString().substring(0, 10)}
					/>
				{/if}
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addItem} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Item
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Item Dialog -->
<Dialog.Root open={!!editingItem} onOpenChange={(open) => !open && (editingItem = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Item</Dialog.Title>
			<Dialog.Description>Update inventory item details</Dialog.Description>
		</Dialog.Header>
		{#if editingItem}
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-name" class="text-sm font-medium">Name</label>
						<Input id="edit-name" autofocus bind:value={editingItem.name} />
					</div>
					<div class="grid gap-2">
						<label for="edit-sku" class="text-sm font-medium">SKU</label>
						<Input id="edit-sku" bind:value={editingItem.sku} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-category" class="text-sm font-medium">Category</label>
						<Select.Root type="single" bind:value={editingItem.category}>
							<Select.Trigger class="w-full">
								{categories.find(c => c.value === editingItem?.category)?.label || 'Select category'}
							</Select.Trigger>
							<Select.Content>
								{#each categories as category}
									<Select.Item value={category.value}>{category.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="grid gap-2">
						<label for="edit-unit" class="text-sm font-medium">Unit</label>
						<Select.Root type="single" bind:value={editingItem.unit}>
							<Select.Trigger class="w-full">
								{units.find(u => u.value === editingItem?.unit)?.label || 'Select unit'}
							</Select.Trigger>
							<Select.Content>
								{#each units as unit}
									<Select.Item value={unit.value}>{unit.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-minimumStock" class="text-sm font-medium">Min Stock</label>
						<Input id="edit-minimumStock" type="number" min="0" bind:value={editingItem.minimumStock} />
					</div>
					<div class="grid gap-2">
						<label for="edit-cost" class="text-sm font-medium">Cost/Unit</label>
						<Input id="edit-cost" type="number" step="0.01" min="0" bind:value={editingItem.costPerUnit} />
					</div>
				</div>
				<div class="grid gap-2">
					<div class="flex items-center gap-2">
						<Checkbox id="edit-trackExpiry" bind:checked={editTrackExpiry} />
						<label for="edit-trackExpiry" class="text-sm font-medium">Track expiry date</label>
					</div>
					{#if editTrackExpiry}
						<Input
							id="edit-expiryDate"
							type="date"
							bind:value={editExpiryDate}
						/>
					{/if}
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingItem = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveItem} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Stock Adjustment Dialog -->
<Dialog.Root open={!!adjustingStock} onOpenChange={(open) => !open && (adjustingStock = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Adjust Stock</Dialog.Title>
			<Dialog.Description>
				{adjustingStock?.item.name} - Current: {adjustingStock?.item.currentStock}
				{adjustingStock?.item.unit}
			</Dialog.Description>
		</Dialog.Header>
		{#if adjustingStock}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="adjustment" class="text-sm font-medium">
						Adjustment (use negative for reduction)
					</label>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								const minAdj = -adjustingStock!.item.currentStock;
								adjustingStock!.adjustment = Math.max(adjustingStock!.adjustment - 5, minAdj);
							}}
						>
							-5
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								const minAdj = -adjustingStock!.item.currentStock;
								adjustingStock!.adjustment = Math.max(adjustingStock!.adjustment - 1, minAdj);
							}}
						>
							-1
						</Button>
						<Input
							id="adjustment"
							autofocus
							type="number"
							bind:value={adjustingStock.adjustment}
							class="text-center"
						/>
						<Button
							variant="outline"
							size="sm"
							onclick={() => (adjustingStock!.adjustment += 1)}
						>
							+1
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => (adjustingStock!.adjustment += 5)}
						>
							+5
						</Button>
					</div>
				</div>
				<div class="grid gap-2">
					<label for="reason" class="text-sm font-medium">Reason (optional)</label>
					<Input id="reason" bind:value={adjustingStock.reason} placeholder="e.g., Received shipment" />
				</div>
				<div class="rounded-lg p-3 {adjustmentWouldGoNegative ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted'}">
					<p class="text-sm">
						New quantity: <strong class={adjustmentWouldGoNegative ? 'text-destructive' : ''}>
							{adjustingStock.item.currentStock + adjustingStock.adjustment}
							{adjustingStock.item.unit}
						</strong>
					</p>
					{#if adjustmentWouldGoNegative}
						<p class="mt-1 text-xs text-destructive">Stock cannot go below zero</p>
					{/if}
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (adjustingStock = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={adjustStock} disabled={isSubmitting || adjustmentWouldGoNegative}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Confirm Adjustment
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Transaction History Dialog -->
<Dialog.Root open={!!historyItem} onOpenChange={(open) => !open && (historyItem = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Transaction History</Dialog.Title>
			<Dialog.Description>
				{historyItem?.name} ({historyItem?.sku})
			</Dialog.Description>
		</Dialog.Header>
		{#if historyItem}
			{@const transactions = (historyItem.transactions || []) as InventoryTransaction[]}
			{#if transactions.length > 0}
				<div class="max-h-80 overflow-y-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Type</Table.Head>
								<Table.Head>Qty</Table.Head>
								<Table.Head>Stock</Table.Head>
								<Table.Head>Reason</Table.Head>
								<Table.Head>Date</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each transactions as txn}
								<Table.Row>
									<Table.Cell>
										<Badge variant={txn.type === 'add' ? 'default' : 'secondary'}>
											{formatTransactionType(txn.type)}
										</Badge>
									</Table.Cell>
									<Table.Cell class={txn.type === 'add' ? 'text-success' : 'text-destructive'}>
										{txn.type === 'add' ? '+' : '-'}{txn.quantity}
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{txn.previousStock} → {txn.newStock}
									</Table.Cell>
									<Table.Cell class="max-w-[120px] truncate text-sm">
										{txn.reason || '—'}
									</Table.Cell>
									<Table.Cell class="text-xs text-muted-foreground">
										{new Date(txn.createdAt).toLocaleDateString()}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<div class="py-8 text-center text-muted-foreground">
					<IconHistory class="mx-auto mb-2 h-8 w-8" />
					<p>No transactions recorded yet</p>
				</div>
			{/if}
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (historyItem = null)}>Close</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteItemDialogOpen}
	title="Delete Inventory Item"
	description="Are you sure you want to delete this item? This action cannot be undone."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={confirmDeleteItem}
/>
