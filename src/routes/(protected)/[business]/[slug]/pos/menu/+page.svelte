<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconSearch, IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-svelte';

	// Sample menu items data
	let menuItems = $state([
		{
			id: 1,
			name: 'Butter Chicken',
			price: 12.84,
			category: 'Main Course',
			available: true,
			image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400'
		},
		{
			id: 2,
			name: 'French Fries',
			price: 7.5,
			category: 'Appetizer',
			available: true,
			image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400'
		},
		{
			id: 3,
			name: 'Roast Beef',
			price: 29.0,
			category: 'Main Course',
			available: true,
			image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400'
		},
		{
			id: 4,
			name: 'Sauerkraut',
			price: 11.55,
			category: 'Side Dish',
			available: true,
			image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
		},
		{
			id: 5,
			name: 'Beef Kebab',
			price: 14.95,
			category: 'Main Course',
			available: false,
			image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400'
		}
	]);

	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let showAddDialog = $state(false);
	let showEditDialog = $state(false);
	let editingItem = $state(null);

	// Form data for add/edit
	let formName = $state('');
	let formPrice = $state('');
	let formCategory = $state('');
	let formAvailable = $state(true);
	let formImage = $state('');

	// Filter menu items
	const filteredItems = $derived(
		menuItems.filter((item) => {
			const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
			return matchesSearch && matchesCategory;
		})
	);

	// Get unique categories
	const categories = $derived([...new Set(menuItems.map((item) => item.category))]);

	function openAddDialog() {
		formName = '';
		formPrice = '';
		formCategory = '';
		formAvailable = true;
		formImage = '';
		showAddDialog = true;
	}

	function openEditDialog(item) {
		editingItem = item;
		formName = item.name;
		formPrice = item.price.toString();
		formCategory = item.category;
		formAvailable = item.available;
		formImage = item.image;
		showEditDialog = true;
	}

	function addMenuItem() {
		const newItem = {
			id: Date.now(),
			name: formName,
			price: parseFloat(formPrice),
			category: formCategory,
			available: formAvailable,
			image: formImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
		};
		menuItems.push(newItem);
		showAddDialog = false;
	}

	function updateMenuItem() {
		if (!editingItem) return;
		const index = menuItems.findIndex((item) => item.id === editingItem.id);
		if (index !== -1) {
			menuItems[index] = {
				...editingItem,
				name: formName,
				price: parseFloat(formPrice),
				category: formCategory,
				available: formAvailable,
				image: formImage || editingItem.image
			};
		}
		showEditDialog = false;
		editingItem = null;
	}

	function deleteMenuItem(id: number) {
		menuItems = menuItems.filter((item) => item.id !== id);
	}

	function toggleAvailability(id: number) {
		const item = menuItems.find((item) => item.id === id);
		if (item) {
			item.available = !item.available;
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2">
				<h1 class="text-2xl font-bold">Menu Management</h1>
				<p class="text-muted-foreground">Manage your restaurant's menu items</p>
			</div>

			<!-- Filters and Actions -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
					<div class="relative max-w-sm flex-1">
						<IconSearch
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input placeholder="Search menu items..." bind:value={searchQuery} class="pl-9" />
					</div>

					<select
						bind:value={categoryFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Categories</option>
						{#each categories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>

				<Button onclick={openAddDialog}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Item
				</Button>
			</div>

			<!-- Menu Items Table -->
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Image</Table.Head>
							<Table.Head>Name</Table.Head>
							<Table.Head>Category</Table.Head>
							<Table.Head>Price</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredItems as item (item.id)}
							<Table.Row>
								<Table.Cell>
									<img src={item.image} alt={item.name} class="h-10 w-10 rounded object-cover" />
								</Table.Cell>
								<Table.Cell class="font-medium">{item.name}</Table.Cell>
								<Table.Cell>{item.category}</Table.Cell>
								<Table.Cell>${item.price.toFixed(2)}</Table.Cell>
								<Table.Cell>
									<Badge variant={item.available ? 'default' : 'secondary'}>
										{item.available ? 'Available' : 'Unavailable'}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => toggleAvailability(item.id)}>
											<IconEye class="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="sm" onclick={() => openEditDialog(item)}>
											<IconEdit class="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="sm" onclick={() => deleteMenuItem(item.id)}>
											<IconTrash class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			{#if filteredItems.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconSearch class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No menu items found</h3>
					<p class="text-muted-foreground">Try adjusting your search or add new items.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Item Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add Menu Item</Dialog.Title>
			<Dialog.Description>Add a new item to your menu</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-name" class="text-right">Name</label>
				<Input id="add-name" bind:value={formName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-price" class="text-right">Price</label>
				<Input id="add-price" type="number" step="0.01" bind:value={formPrice} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-category" class="text-right">Category</label>
				<Input id="add-category" bind:value={formCategory} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-image" class="text-right">Image URL</label>
				<Input id="add-image" bind:value={formImage} class="col-span-3" />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addMenuItem}>Add Item</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Item Dialog -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Menu Item</Dialog.Title>
			<Dialog.Description>Update the menu item details</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-name" class="text-right">Name</label>
				<Input id="edit-name" bind:value={formName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-price" class="text-right">Price</label>
				<Input
					id="edit-price"
					type="number"
					step="0.01"
					bind:value={formPrice}
					class="col-span-3"
				/>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-category" class="text-right">Category</label>
				<Input id="edit-category" bind:value={formCategory} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-image" class="text-right">Image URL</label>
				<Input id="edit-image" bind:value={formImage} class="col-span-3" />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showEditDialog = false)}>Cancel</Button>
			<Button onclick={updateMenuItem}>Update Item</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
