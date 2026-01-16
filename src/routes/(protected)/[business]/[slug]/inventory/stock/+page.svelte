<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2 } from '@lucide/svelte';
	import {
		IconPlus,
		IconPencil,
		IconSearch,
		IconAlertTriangle,
		IconPackage,
		IconTrendingUp,
		IconTrash
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		createInventoryItem,
		updateInventoryItem,
		processStockTransaction,
		deleteInventoryItem,
		type InventoryItem,
		type InventoryCategory,
		type InventoryUnit,
		type CreateInventoryItemPayload
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let inventory = $state<InventoryItem[]>(data.items || []);
	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let stockFilter = $state('all');
	let showAddDialog = $state(false);
	let editingItem = $state<InventoryItem | null>(null);
	let adjustingStock = $state<{ item: InventoryItem; adjustment: number; reason: string } | null>(null);
	let isSubmitting = $state(false);

	let newItem = $state<{
		name: string;
		sku: string;
		category: InventoryCategory;
		currentStock: number;
		minimumStock: number;
		unit: InventoryUnit;
		costPerUnit: number;
	}>({
		name: '',
		sku: '',
		category: 'raw_materials',
		currentStock: 0,
		minimumStock: 10,
		unit: 'kg',
		costPerUnit: 0
	});

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

	function getCategoryLabel(category: InventoryCategory): string {
		return categories.find((c) => c.value === category)?.label || category;
	}

	function getUnitLabel(unit: InventoryUnit): string {
		return units.find((u) => u.value === unit)?.label || unit;
	}

	function getStockStatus(item: InventoryItem) {
		const ratio = item.currentStock / item.minimumStock;
		if (ratio < 0.5) return { variant: 'destructive' as const, text: 'Critical' };
		if (ratio < 1) return { variant: 'secondary' as const, text: 'Low' };
		return { variant: 'default' as const, text: 'OK' };
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
				costPerUnit: newItem.costPerUnit
			};

			const result = await createInventoryItem(data.businessId, payload);
			inventory = [...inventory, result.item];
			toast.success('Item added successfully');
			showAddDialog = false;
			newItem = {
				name: '',
				sku: '',
				category: 'raw_materials',
				currentStock: 0,
				minimumStock: 10,
				unit: 'kg',
				costPerUnit: 0
			};
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add item');
		} finally {
			isSubmitting = false;
		}
	}

	function editItem(item: InventoryItem) {
		editingItem = { ...item };
	}

	async function saveItem() {
		if (!editingItem) return;

		isSubmitting = true;
		try {
			const result = await updateInventoryItem(data.businessId, editingItem.id, {
				name: editingItem.name,
				sku: editingItem.sku,
				category: editingItem.category,
				minimumStock: editingItem.minimumStock,
				unit: editingItem.unit,
				costPerUnit: editingItem.costPerUnit
			});
			inventory = inventory.map((i) => (i.id === editingItem!.id ? result.item : i));
			toast.success('Item updated successfully');
			editingItem = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update item');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDeleteItem(itemId: string) {
		try {
			await deleteInventoryItem(data.businessId, itemId);
			inventory = inventory.filter((i) => i.id !== itemId);
			toast.success('Item deleted successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete item');
		}
	}

	function openStockAdjustment(item: InventoryItem) {
		adjustingStock = { item, adjustment: 0, reason: '' };
	}

	async function adjustStock() {
		if (!adjustingStock || adjustingStock.adjustment === 0) {
			toast.error('Please enter an adjustment amount');
			return;
		}

		isSubmitting = true;
		try {
			const type = adjustingStock.adjustment > 0 ? 'add' : 'remove';
			const result = await processStockTransaction(data.businessId, adjustingStock.item.id, {
				type,
				quantity: Math.abs(adjustingStock.adjustment),
				reason: adjustingStock.reason || undefined
			});
			inventory = inventory.map((i) => (i.id === adjustingStock!.item.id ? result.item : i));
			toast.success('Stock adjusted successfully');
			adjustingStock = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to adjust stock');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Inventory Stock</h1>
					<p class="text-muted-foreground">Track and manage your inventory levels</p>
				</div>
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Item
				</Button>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-3">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Items</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconPackage class="h-5 w-5 text-muted-foreground" />
							<span class="text-2xl font-bold">{stats.totalItems}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Low Stock Items</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconAlertTriangle class="h-5 w-5 text-yellow-500" />
							<span class="text-2xl font-bold text-yellow-600">{stats.lowStock}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Value</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<div class="relative max-w-sm flex-1">
					<IconSearch
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input placeholder="Search inventory..." bind:value={searchQuery} class="pl-9" />
				</div>

				<div class="flex gap-2">
					<select
						bind:value={categoryFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Categories</option>
						{#each categories as category}
							<option value={category.value}>{category.label}</option>
						{/each}
					</select>

					<select
						bind:value={stockFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Stock Levels</option>
						<option value="low">Low Stock</option>
						<option value="ok">In Stock</option>
					</select>
				</div>
			</div>

			<!-- Inventory Table -->
			{#if filteredInventory.length > 0}
				<div class="px-6">
					<div class="rounded-md border">
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
									<Table.Row class={item.currentStock < item.minimumStock ? 'bg-yellow-50 dark:bg-yellow-950' : ''}>
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
											<Badge variant={getStockStatus(item).variant}>
												{getStockStatus(item).text}
											</Badge>
										</Table.Cell>
										<Table.Cell>${item.costPerUnit.toFixed(2)}</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													class="h-8"
													onclick={() => openStockAdjustment(item)}
												>
													<IconTrendingUp class="mr-1 h-4 w-4" />
													Adjust
												</Button>
												<Button variant="ghost" size="sm" onclick={() => editItem(item)}>
													<IconPencil class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="text-destructive hover:text-destructive"
													onclick={() => handleDeleteItem(item.id)}
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
					<IconPackage class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No items found</h3>
					<p class="text-muted-foreground">Try adjusting your search or add a new item.</p>
					<Button class="mt-4" onclick={() => (showAddDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Item
					</Button>
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
					<Input id="name" bind:value={newItem.name} placeholder="Item name" />
				</div>
				<div class="grid gap-2">
					<label for="sku" class="text-sm font-medium">SKU *</label>
					<Input id="sku" bind:value={newItem.sku} placeholder="XXX-000" />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="category" class="text-sm font-medium">Category</label>
					<select
						id="category"
						bind:value={newItem.category}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{#each categories as category}
							<option value={category.value}>{category.label}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-2">
					<label for="unit" class="text-sm font-medium">Unit</label>
					<select
						id="unit"
						bind:value={newItem.unit}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{#each units as unit}
							<option value={unit.value}>{unit.label}</option>
						{/each}
					</select>
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
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addItem} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
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
						<Input id="edit-name" bind:value={editingItem.name} />
					</div>
					<div class="grid gap-2">
						<label for="edit-sku" class="text-sm font-medium">SKU</label>
						<Input id="edit-sku" bind:value={editingItem.sku} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-category" class="text-sm font-medium">Category</label>
						<select
							id="edit-category"
							bind:value={editingItem.category}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{#each categories as category}
								<option value={category.value}>{category.label}</option>
							{/each}
						</select>
					</div>
					<div class="grid gap-2">
						<label for="edit-unit" class="text-sm font-medium">Unit</label>
						<select
							id="edit-unit"
							bind:value={editingItem.unit}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{#each units as unit}
								<option value={unit.value}>{unit.label}</option>
							{/each}
						</select>
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
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingItem = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveItem} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
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
							onclick={() => (adjustingStock!.adjustment -= 5)}
						>
							-5
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => (adjustingStock!.adjustment -= 1)}
						>
							-1
						</Button>
						<Input
							id="adjustment"
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
				<div class="rounded-lg bg-muted p-3">
					<p class="text-sm">
						New quantity: <strong>
							{adjustingStock.item.currentStock + adjustingStock.adjustment}
							{adjustingStock.item.unit}
						</strong>
					</p>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (adjustingStock = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={adjustStock} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Confirm Adjustment
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
