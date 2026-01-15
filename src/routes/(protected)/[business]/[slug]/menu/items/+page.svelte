<script lang="ts">
	import type { PageData } from './$types';
	import type { MenuItem, MenuCategory } from '$lib/types/menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as ImageCropper from '$lib/components/ui/image-cropper';
	import { toast } from 'svelte-sonner';
	import {
		createMenuItem,
		updateMenuItem,
		deleteMenuItem as deleteMenuItemApi,
		toggleItemAvailability,
		createCategory,
		seedDefaultCategories
	} from '$lib/api';
	import { IconSearch, IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let { data }: { data: PageData } = $props();

	const businessId = data.businessId;
	const businessType = data.businessType;
	const config = data.config;

	// Menu data from API
	let categories = $state<MenuCategory[]>(data.categories || []);
	let menuItems = $state<MenuItem[]>(data.items || []);

	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let showAddDialog = $state(false);
	let showEditDialog = $state(false);
	let showAddCategoryDialog = $state(false);
	let editingItem = $state<MenuItem | null>(null);
	let isSubmitting = $state(false);

	// Form data for add/edit item
	let formName = $state('');
	let formDescription = $state('');
	let formPrice = $state('');
	let formCategory = $state('');
	let formAvailable = $state(true);
	let formImage = $state('');
	let formIsVegetarian = $state(false);
	let useImageUrl = $state(false); // Toggle between upload and URL input

	// Form data for add category
	let newCategoryName = $state('');

	// Filter menu items
	const filteredItems = $derived(
		menuItems.filter((item) => {
			const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
			return matchesSearch && matchesCategory;
		})
	);

	function getCategoryName(categoryId: string): string {
		const category = categories.find((c) => c.id === categoryId);
		return category?.name || 'Uncategorized';
	}

	function openAddDialog() {
		formName = '';
		formDescription = '';
		formPrice = '';
		formCategory = categories[0]?.id || '';
		formAvailable = true;
		formImage = '';
		formIsVegetarian = false;
		useImageUrl = false;
		showAddDialog = true;
	}

	function openEditDialog(item: MenuItem) {
		editingItem = item;
		formName = item.name;
		formDescription = item.description || '';
		formPrice = item.price.toString();
		formCategory = item.categoryId;
		formAvailable = item.isAvailable;
		formImage = item.image || '';
		formIsVegetarian = item.isVegetarian || false;
		// If existing image is a URL (not base64), show URL input mode
		useImageUrl = item.image ? !item.image.startsWith('data:') : false;
		showEditDialog = true;
	}

	async function addMenuItem() {
		if (!formName || !formPrice || !formCategory) {
			toast.error('Please fill in all required fields');
			return;
		}

		isSubmitting = true;
		try {
			const result = await createMenuItem(businessId, {
				name: formName,
				description: formDescription || undefined,
				price: parseFloat(formPrice),
				categoryId: formCategory,
				isAvailable: formAvailable,
				image: formImage || undefined,
				isVegetarian: formIsVegetarian
			});

			menuItems = [...menuItems, result.item];
			showAddDialog = false;
			toast.success('Item added successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add item');
		} finally {
			isSubmitting = false;
		}
	}

	async function updateItem() {
		if (!editingItem) return;

		isSubmitting = true;
		try {
			const result = await updateMenuItem(businessId, editingItem.id, {
				name: formName,
				description: formDescription || undefined,
				price: parseFloat(formPrice),
				categoryId: formCategory,
				isAvailable: formAvailable,
				image: formImage || undefined,
				isVegetarian: formIsVegetarian
			});

			const index = menuItems.findIndex((item) => item.id === editingItem?.id);
			if (index !== -1) {
				menuItems[index] = result.item;
				menuItems = [...menuItems];
			}
			showEditDialog = false;
			editingItem = null;
			toast.success('Item updated successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update item');
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteItem(id: string) {
		if (!confirm('Are you sure you want to delete this item?')) return;

		try {
			await deleteMenuItemApi(businessId, id);
			menuItems = menuItems.filter((item) => item.id !== id);
			toast.success('Item deleted successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete item');
		}
	}

	async function toggleAvailability(id: string) {
		try {
			const result = await toggleItemAvailability(businessId, id);
			const index = menuItems.findIndex((item) => item.id === id);
			if (index !== -1) {
				menuItems[index] = result.item;
				menuItems = [...menuItems];
			}
			toast.success(result.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to toggle availability');
		}
	}

	async function addCategory() {
		if (!newCategoryName.trim()) {
			toast.error('Please enter a category name');
			return;
		}

		isSubmitting = true;
		try {
			const result = await createCategory(businessId, {
				name: newCategoryName.trim()
			});

			categories = [...categories, result.category];
			showAddCategoryDialog = false;
			newCategoryName = '';
			toast.success('Category added successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add category');
		} finally {
			isSubmitting = false;
		}
	}

	async function seedCategories() {
		isSubmitting = true;
		try {
			const result = await seedDefaultCategories(businessId);
			categories = result.categories;
			toast.success('Default categories created successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to seed categories');
		} finally {
			isSubmitting = false;
		}
	}

	// Get the appropriate title and description based on business type
	const getPageTitle = () => {
		switch (businessType) {
			case 'retail':
				return 'Product Management';
			default:
				return 'Menu Management';
		}
	};

	const getPageDescription = () => {
		switch (businessType) {
			case 'retail':
				return `Manage your ${config.label}'s products`;
			default:
				return `Manage your ${config.label}'s menu items`;
		}
	};
</script>

<div class="flex flex-1 flex-col sm:p-6">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2">
				<h1 class="text-2xl font-bold">{getPageTitle()}</h1>
				<p class="text-muted-foreground">{getPageDescription()}</p>
			</div>

			<!-- Filters and Actions -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
					<div class="relative max-w-sm flex-1">
						<IconSearch
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							placeholder={businessType === 'retail'
								? 'Search products...'
								: 'Search menu items...'}
							bind:value={searchQuery}
							class="pl-9"
						/>
					</div>

					<select
						bind:value={categoryFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Categories</option>
						{#each categories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex gap-2">
					<Button variant="outline" onclick={() => (showAddCategoryDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Category
					</Button>
					<Button onclick={openAddDialog}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add {businessType === 'retail' ? 'Product' : 'Item'}
					</Button>
				</div>
			</div>

			<!-- Items Table -->
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Image</Table.Head>
							<Table.Head>{businessType === 'retail' ? 'Product' : 'Item'} Name</Table.Head>
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
									{#if item.image}
										<img src={item.image} alt={item.name} class="h-10 w-10 rounded object-cover" />
									{:else}
										<div
											class="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs"
										>
											No img
										</div>
									{/if}
								</Table.Cell>
								<Table.Cell class="font-medium">
									<div class="flex flex-col">
										<span>{item.name}</span>
										{#if item.isVegetarian}
											<Badge variant="outline" class="mt-1 w-fit text-xs">Veg</Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{getCategoryName(item.categoryId)}</Table.Cell>
								<Table.Cell>${item.price.toFixed(2)}</Table.Cell>
								<Table.Cell>
									<Badge variant={item.isAvailable ? 'default' : 'secondary'}>
										{item.isAvailable ? 'Available' : 'Unavailable'}
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
										<Button variant="ghost" size="sm" onclick={() => deleteItem(item.id)}>
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
					<h3 class="mt-4 text-lg font-semibold">No items found</h3>
					<p class="text-muted-foreground">
						{#if categories.length === 0}
							Create categories first before adding items.
						{:else if menuItems.length === 0}
							Get started by adding your first {businessType === 'retail'
								? 'product'
								: 'menu item'}.
						{:else}
							Try adjusting your search or filter.
						{/if}
					</p>
					{#if categories.length === 0}
						<div class="mt-4 flex gap-2">
							<Button variant="outline" onclick={() => (showAddCategoryDialog = true)}>
								Add Category Manually
							</Button>
							<Button onclick={seedCategories} disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Use Default Categories
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Item Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add {businessType === 'retail' ? 'Product' : 'Menu Item'}</Dialog.Title>
			<Dialog.Description>
				Add a new {businessType === 'retail' ? 'product' : 'item'} to your {config.label.toLowerCase()}
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-name" class="text-right">Name *</label>
				<Input id="add-name" bind:value={formName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-description" class="text-right">Description</label>
				<Input id="add-description" bind:value={formDescription} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-price" class="text-right">Price *</label>
				<Input id="add-price" type="number" step="0.01" bind:value={formPrice} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-category" class="text-right">Category *</label>
				<select
					bind:value={formCategory}
					id="add-category"
					class="col-span-3 rounded border border-input bg-background px-2 py-1"
				>
					{#each categories as cat}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>
			<div class="grid grid-cols-4 items-start gap-4">
				<label class="pt-2 text-right">Image</label>
				<div class="col-span-3 space-y-2">
					<div class="flex gap-2">
						<Button
							variant={useImageUrl ? 'outline' : 'default'}
							size="sm"
							onclick={() => {
								useImageUrl = false;
								formImage = '';
							}}
						>
							Upload
						</Button>
						<Button
							variant={useImageUrl ? 'default' : 'outline'}
							size="sm"
							onclick={() => {
								useImageUrl = true;
								formImage = '';
							}}
						>
							URL
						</Button>
					</div>
					{#if useImageUrl}
						<Input placeholder="https://example.com/image.jpg" bind:value={formImage} />
					{:else}
						<ImageCropper.Root
							bind:src={formImage}
							onUnsupportedFile={() => toast.error('Unsupported file type. Please upload an image.')}
						>
							<ImageCropper.UploadTrigger>
								<ImageCropper.Preview class="h-24 w-24 rounded-md" />
							</ImageCropper.UploadTrigger>
							<ImageCropper.Dialog>
								<ImageCropper.Cropper cropShape="rect" />
								<ImageCropper.Controls>
									<ImageCropper.Crop />
									<ImageCropper.Cancel />
								</ImageCropper.Controls>
							</ImageCropper.Dialog>
						</ImageCropper.Root>
					{/if}
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label class="text-right">Vegetarian</label>
				<div class="col-span-3">
					<input type="checkbox" bind:checked={formIsVegetarian} class="mr-2" />
					<span class="text-sm text-muted-foreground">Mark as vegetarian</span>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addMenuItem} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add {businessType === 'retail' ? 'Product' : 'Item'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Item Dialog -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit {businessType === 'retail' ? 'Product' : 'Menu Item'}</Dialog.Title>
			<Dialog.Description>
				Update the {businessType === 'retail' ? 'product' : 'item'} details
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-name" class="text-right">Name *</label>
				<Input id="edit-name" bind:value={formName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-description" class="text-right">Description</label>
				<Input id="edit-description" bind:value={formDescription} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-price" class="text-right">Price *</label>
				<Input
					id="edit-price"
					type="number"
					step="0.01"
					bind:value={formPrice}
					class="col-span-3"
				/>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-category" class="text-right">Category *</label>
				<select
					bind:value={formCategory}
					id="edit-category"
					class="col-span-3 rounded border border-input bg-background px-2 py-1"
				>
					{#each categories as cat}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>
			<div class="grid grid-cols-4 items-start gap-4">
				<label class="pt-2 text-right">Image</label>
				<div class="col-span-3 space-y-2">
					<div class="flex gap-2">
						<Button
							variant={useImageUrl ? 'outline' : 'default'}
							size="sm"
							onclick={() => {
								useImageUrl = false;
								formImage = '';
							}}
						>
							Upload
						</Button>
						<Button
							variant={useImageUrl ? 'default' : 'outline'}
							size="sm"
							onclick={() => {
								useImageUrl = true;
								formImage = '';
							}}
						>
							URL
						</Button>
					</div>
					{#if useImageUrl}
						<Input placeholder="https://example.com/image.jpg" bind:value={formImage} />
					{:else}
						<ImageCropper.Root
							bind:src={formImage}
							onUnsupportedFile={() => toast.error('Unsupported file type. Please upload an image.')}
						>
							<ImageCropper.UploadTrigger>
								<ImageCropper.Preview class="h-24 w-24 rounded-md" />
							</ImageCropper.UploadTrigger>
							<ImageCropper.Dialog>
								<ImageCropper.Cropper cropShape="rect" />
								<ImageCropper.Controls>
									<ImageCropper.Crop />
									<ImageCropper.Cancel />
								</ImageCropper.Controls>
							</ImageCropper.Dialog>
						</ImageCropper.Root>
					{/if}
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label class="text-right">Vegetarian</label>
				<div class="col-span-3">
					<input type="checkbox" bind:checked={formIsVegetarian} class="mr-2" />
					<span class="text-sm text-muted-foreground">Mark as vegetarian</span>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showEditDialog = false)}>Cancel</Button>
			<Button onclick={updateItem} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Update {businessType === 'retail' ? 'Product' : 'Item'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Add Category Dialog -->
<Dialog.Root bind:open={showAddCategoryDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add Category</Dialog.Title>
			<Dialog.Description>Create a new category for your menu items</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="category-name" class="text-right">Name *</label>
				<Input id="category-name" bind:value={newCategoryName} class="col-span-3" />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddCategoryDialog = false)}>Cancel</Button>
			<Button onclick={addCategory} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Category
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
