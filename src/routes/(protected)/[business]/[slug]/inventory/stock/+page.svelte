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
		IconSearch,
		IconAlertTriangle,
		IconPackage,
		IconTrendingDown,
		IconTrendingUp
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';

	// Dummy inventory data
	let inventory = $state([
		{
			id: 1,
			name: 'Mozzarella Cheese',
			category: 'Dairy',
			sku: 'DAI-001',
			quantity: 15,
			unit: 'kg',
			minStock: 20,
			costPerUnit: 8.5,
			supplier: 'Fresh Dairy Co.',
			lastUpdated: '2024-11-06'
		},
		{
			id: 2,
			name: 'Tomato Sauce',
			category: 'Sauces',
			sku: 'SAU-001',
			quantity: 45,
			unit: 'liters',
			minStock: 30,
			costPerUnit: 3.25,
			supplier: 'Italian Imports',
			lastUpdated: '2024-11-05'
		},
		{
			id: 3,
			name: 'All-Purpose Flour',
			category: 'Dry Goods',
			sku: 'DRY-001',
			quantity: 80,
			unit: 'kg',
			minStock: 50,
			costPerUnit: 1.2,
			supplier: 'Baker Supplies',
			lastUpdated: '2024-11-04'
		},
		{
			id: 4,
			name: 'Olive Oil',
			category: 'Oils',
			sku: 'OIL-001',
			quantity: 8,
			unit: 'liters',
			minStock: 15,
			costPerUnit: 12.0,
			supplier: 'Italian Imports',
			lastUpdated: '2024-11-06'
		},
		{
			id: 5,
			name: 'Fresh Basil',
			category: 'Herbs',
			sku: 'HRB-001',
			quantity: 2,
			unit: 'kg',
			minStock: 3,
			costPerUnit: 15.0,
			supplier: 'Local Farms',
			lastUpdated: '2024-11-06'
		},
		{
			id: 6,
			name: 'Chicken Breast',
			category: 'Meat',
			sku: 'MEA-001',
			quantity: 25,
			unit: 'kg',
			minStock: 20,
			costPerUnit: 9.5,
			supplier: 'Premium Meats',
			lastUpdated: '2024-11-06'
		},
		{
			id: 7,
			name: 'Salmon Fillet',
			category: 'Seafood',
			sku: 'SEA-001',
			quantity: 12,
			unit: 'kg',
			minStock: 10,
			costPerUnit: 22.0,
			supplier: 'Ocean Fresh',
			lastUpdated: '2024-11-05'
		},
		{
			id: 8,
			name: 'Parmesan Cheese',
			category: 'Dairy',
			sku: 'DAI-002',
			quantity: 5,
			unit: 'kg',
			minStock: 8,
			costPerUnit: 25.0,
			supplier: 'Italian Imports',
			lastUpdated: '2024-11-04'
		}
	]);

	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let stockFilter = $state('all');
	let showAddDialog = $state(false);
	let editingItem = $state<(typeof inventory)[0] | null>(null);
	let adjustingStock = $state<{ item: (typeof inventory)[0]; adjustment: number } | null>(null);

	let newItem = $state({
		name: '',
		category: '',
		sku: '',
		quantity: 0,
		unit: 'kg',
		minStock: 10,
		costPerUnit: 0,
		supplier: ''
	});

	const categories = ['Dairy', 'Sauces', 'Dry Goods', 'Oils', 'Herbs', 'Meat', 'Seafood', 'Beverages'];
	const units = ['kg', 'liters', 'units', 'boxes', 'packs'];

	const filteredInventory = $derived(
		inventory.filter((item) => {
			const matchesSearch =
				item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.sku.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

			let matchesStock = true;
			if (stockFilter === 'low') {
				matchesStock = item.quantity < item.minStock;
			} else if (stockFilter === 'ok') {
				matchesStock = item.quantity >= item.minStock;
			}

			return matchesSearch && matchesCategory && matchesStock;
		})
	);

	const stats = $derived({
		totalItems: inventory.length,
		lowStock: inventory.filter((i) => i.quantity < i.minStock).length,
		totalValue: inventory.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0)
	});

	function getStockStatus(item: (typeof inventory)[0]) {
		const ratio = item.quantity / item.minStock;
		if (ratio < 0.5) return { variant: 'destructive' as const, text: 'Critical' };
		if (ratio < 1) return { variant: 'secondary' as const, text: 'Low' };
		return { variant: 'default' as const, text: 'OK' };
	}

	function addItem() {
		if (!newItem.name.trim() || !newItem.sku.trim()) {
			toast.error('Name and SKU are required');
			return;
		}

		inventory = [
			...inventory,
			{
				id: Math.max(...inventory.map((i) => i.id)) + 1,
				...newItem,
				lastUpdated: new Date().toISOString().split('T')[0]
			}
		];

		toast.success('Item added successfully');
		showAddDialog = false;
		newItem = {
			name: '',
			category: '',
			sku: '',
			quantity: 0,
			unit: 'kg',
			minStock: 10,
			costPerUnit: 0,
			supplier: ''
		};
	}

	function editItem(item: (typeof inventory)[0]) {
		editingItem = { ...item };
	}

	function saveItem() {
		if (!editingItem) return;

		inventory = inventory.map((i) =>
			i.id === editingItem!.id
				? { ...editingItem!, lastUpdated: new Date().toISOString().split('T')[0] }
				: i
		);
		toast.success('Item updated successfully');
		editingItem = null;
	}

	function openStockAdjustment(item: (typeof inventory)[0]) {
		adjustingStock = { item, adjustment: 0 };
	}

	function adjustStock() {
		if (!adjustingStock) return;

		inventory = inventory.map((i) =>
			i.id === adjustingStock!.item.id
				? {
						...i,
						quantity: i.quantity + adjustingStock!.adjustment,
						lastUpdated: new Date().toISOString().split('T')[0]
					}
				: i
		);
		toast.success('Stock adjusted successfully');
		adjustingStock = null;
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
							<option value={category}>{category}</option>
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
								<Table.Head>Supplier</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredInventory as item (item.id)}
								<Table.Row class={item.quantity < item.minStock ? 'bg-yellow-50 dark:bg-yellow-950' : ''}>
									<Table.Cell class="font-medium">{item.name}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{item.sku}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline">{item.category}</Badge>
									</Table.Cell>
									<Table.Cell>
										<div>
											<span class="font-medium">{item.quantity}</span>
											<span class="text-muted-foreground"> {item.unit}</span>
										</div>
										<div class="text-xs text-muted-foreground">Min: {item.minStock}</div>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getStockStatus(item).variant}>
											{getStockStatus(item).text}
										</Badge>
									</Table.Cell>
									<Table.Cell>${item.costPerUnit.toFixed(2)}</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">{item.supplier}</Table.Cell>
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
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if filteredInventory.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconPackage class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No items found</h3>
					<p class="text-muted-foreground">Try adjusting your search or add a new item.</p>
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
						<option value="">Select category</option>
						{#each categories as category}
							<option value={category}>{category}</option>
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
							<option value={unit}>{unit}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid grid-cols-3 gap-4">
				<div class="grid gap-2">
					<label for="quantity" class="text-sm font-medium">Quantity</label>
					<Input id="quantity" type="number" min="0" bind:value={newItem.quantity} />
				</div>
				<div class="grid gap-2">
					<label for="minStock" class="text-sm font-medium">Min Stock</label>
					<Input id="minStock" type="number" min="0" bind:value={newItem.minStock} />
				</div>
				<div class="grid gap-2">
					<label for="cost" class="text-sm font-medium">Cost/Unit</label>
					<Input id="cost" type="number" step="0.01" min="0" bind:value={newItem.costPerUnit} />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="supplier" class="text-sm font-medium">Supplier</label>
				<Input id="supplier" bind:value={newItem.supplier} placeholder="Supplier name" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addItem}>Add Item</Button>
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
								<option value={category}>{category}</option>
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
								<option value={unit}>{unit}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-minStock" class="text-sm font-medium">Min Stock</label>
						<Input id="edit-minStock" type="number" min="0" bind:value={editingItem.minStock} />
					</div>
					<div class="grid gap-2">
						<label for="edit-cost" class="text-sm font-medium">Cost/Unit</label>
						<Input id="edit-cost" type="number" step="0.01" min="0" bind:value={editingItem.costPerUnit} />
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-supplier" class="text-sm font-medium">Supplier</label>
					<Input id="edit-supplier" bind:value={editingItem.supplier} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingItem = null)}>Cancel</Button>
				<Button onclick={saveItem}>Save Changes</Button>
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
				{adjustingStock?.item.name} - Current: {adjustingStock?.item.quantity}
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
				<div class="rounded-lg bg-muted p-3">
					<p class="text-sm">
						New quantity: <strong>
							{adjustingStock.item.quantity + adjustingStock.adjustment}
							{adjustingStock.item.unit}
						</strong>
					</p>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (adjustingStock = null)}>Cancel</Button>
				<Button onclick={adjustStock}>Confirm Adjustment</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
