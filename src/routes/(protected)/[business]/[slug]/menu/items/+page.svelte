<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { clearApiCache } from '$lib/api/client';
	import { invalidateMenuCache } from '$lib/stores/pos-cache';
	import type { MenuItem, MenuCategory, MenuItemIngredient } from '$lib/types/menu';
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
		seedDefaultCategories,
		bulkUpdatePrices
	} from '$lib/api';
	import {
		IconSearch,
		IconPlus,
		IconEdit,
		IconTrash,
		IconEye,
		IconEyeOff,
		IconCopy,
		IconX
	} from '@tabler/icons-svelte';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { userFriendlyError } from '$lib/utils/error';
	import { canModify } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	const userRole = $derived(((data as any).userRole as string) ?? '');

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	const businessId = data.businessId;
	const businessType = data.businessType;
	const config = data.config;

	function invalidateMenuData() {
		clearApiCache('/menu');
		invalidateMenuCache();
		invalidate('app:menu');
	}

	// Menu data from API
	let categories = $state<MenuCategory[]>(data.categories || []);
	let menuItems = $state<MenuItem[]>(data.items || []);
	const inventoryItems = (data as any).inventoryItems || [];

	$effect(() => {
		categories = data.categories || [];
	});
	$effect(() => {
		menuItems = data.items || [];
	});

	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let showAddDialog = $state(false);
	let showEditDialog = $state(false);
	let showAddCategoryDialog = $state(false);
	let editingItem = $state<MenuItem | null>(null);
	let isSubmitting = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

	// Form data for add/edit item
	let formName = $state('');
	let formDescription = $state('');
	let formPrice = $state('');
	let formCategory = $state('');
	let formAvailable = $state(true);
	let formImage = $state('');
	let formIsVegetarian = $state(false);
	let formRequiresKitchen: boolean | null = $state(null);
	let formIsCombo = $state(false);
	let formComboComponents = $state<{ menuItemId: string; name: string; quantity: number }[]>([]);
	let comboSearch = $state('');
	let useImageUrl = $state(false); // Toggle between upload and URL input

	// Ingredient state
	let formIngredients = $state<
		{
			inventoryItemId: string;
			inventoryItemName: string;
			quantityUsed: number;
			unit: string;
			costPerUnit: number;
		}[]
	>([]);
	let ingredientSearch = $state('');

	const filteredInventory = $derived(
		inventoryItems
			.filter((inv: any) => {
				if (!ingredientSearch) return true;
				return inv.name.toLowerCase().includes(ingredientSearch.toLowerCase());
			})
			.filter((inv: any) => !formIngredients.some((fi) => fi.inventoryItemId === inv.id))
	);

	const computedFoodCost = $derived(
		formIngredients.reduce((sum, ing) => sum + ing.quantityUsed * ing.costPerUnit, 0)
	);

	function addIngredient(invItem: any) {
		formIngredients = [
			...formIngredients,
			{
				inventoryItemId: invItem.id,
				inventoryItemName: invItem.name,
				quantityUsed: 1,
				unit: invItem.unit,
				costPerUnit: Number(invItem.costPerUnit)
			}
		];
		ingredientSearch = '';
	}

	function removeIngredient(inventoryItemId: string) {
		formIngredients = formIngredients.filter((i) => i.inventoryItemId !== inventoryItemId);
	}

	// Form data for add category
	let newCategoryName = $state('');

	// Display label for category filter
	const categoryFilterLabel = $derived(
		categoryFilter === 'all'
			? 'All Categories'
			: categories.find((c) => c.id === categoryFilter)?.name || 'All Categories'
	);

	// Display label for form category select
	const formCategoryLabel = $derived(
		categories.find((c) => c.id === formCategory)?.name || 'Select category'
	);

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
		formRequiresKitchen = null;
		formIsCombo = false;
		formComboComponents = [];
		comboSearch = '';
		useImageUrl = false;
		formIngredients = [];
		ingredientSearch = '';
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
		formRequiresKitchen = item.requiresKitchen ?? null;
		formIsCombo = item.isCombo || false;
		formComboComponents = item.comboComponents ? [...item.comboComponents] : [];
		comboSearch = '';
		// If existing image is a URL (not base64), show URL input mode
		useImageUrl = item.image ? !item.image.startsWith('data:') : false;
		// Populate ingredients from item
		formIngredients = (item.ingredients || []).map((ing) => ({
			inventoryItemId: ing.inventoryItemId,
			inventoryItemName: ing.inventoryItemName,
			quantityUsed: ing.quantityUsed,
			unit: ing.unit,
			costPerUnit: ing.costPerUnit
		}));
		ingredientSearch = '';
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
				isVegetarian: formIsVegetarian,
				requiresKitchen: formRequiresKitchen,
				isCombo: formIsCombo || undefined,
				comboComponents:
					formIsCombo && formComboComponents.length > 0 ? formComboComponents : undefined,
				ingredients:
					formIngredients.length > 0
						? formIngredients.map((i) => ({
								inventoryItemId: i.inventoryItemId,
								quantityUsed: i.quantityUsed,
								unit: i.unit
							}))
						: undefined
			});

			menuItems = [...menuItems, result.item];
			showAddDialog = false;
			toast.success('Item added successfully');
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add item'));
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
				isVegetarian: formIsVegetarian,
				requiresKitchen: formRequiresKitchen,
				isCombo: formIsCombo || undefined,
				comboComponents:
					formIsCombo && formComboComponents.length > 0 ? formComboComponents : undefined,
				ingredients: formIngredients.map((i) => ({
					inventoryItemId: i.inventoryItemId,
					quantityUsed: i.quantityUsed,
					unit: i.unit
				}))
			});

			const index = menuItems.findIndex((item) => item.id === editingItem?.id);
			if (index !== -1) {
				menuItems[index] = result.item;
				menuItems = [...menuItems];
			}
			showEditDialog = false;
			editingItem = null;
			toast.success('Item updated successfully');
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update item'));
		} finally {
			isSubmitting = false;
		}
	}

	function deleteItem(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}

	async function confirmDeleteItem() {
		try {
			await deleteMenuItemApi(businessId, deleteTargetId);
			menuItems = menuItems.filter((item) => item.id !== deleteTargetId);
			toast.success('Item deleted successfully');
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete item'));
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
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to toggle availability'));
		}
	}

	function duplicateItem(item: MenuItem) {
		formName = item.name + ' (Copy)';
		formDescription = item.description || '';
		formPrice = item.price.toString();
		formCategory = item.categoryId;
		formAvailable = item.isAvailable;
		formImage = item.image || '';
		formIsVegetarian = item.isVegetarian || false;
		useImageUrl = item.image ? !item.image.startsWith('data:') : false;
		formIngredients = (item.ingredients || []).map((ing) => ({
			inventoryItemId: ing.inventoryItemId,
			inventoryItemName: ing.inventoryItemName,
			quantityUsed: ing.quantityUsed,
			unit: ing.unit,
			costPerUnit: ing.costPerUnit
		}));
		ingredientSearch = '';
		showAddDialog = true;
	}

	// Bulk price update state
	let showBulkPriceDialog = $state(false);
	let bulkPriceUpdates = $state<
		{ itemId: string; name: string; currentPrice: number; newPrice: number }[]
	>([]);
	let bulkPricePercent = $state('');
	let isBulkSubmitting = $state(false);

	function openBulkPriceDialog() {
		bulkPriceUpdates = filteredItems.map((item) => ({
			itemId: item.id,
			name: item.name,
			currentPrice: item.price,
			newPrice: item.price
		}));
		bulkPricePercent = '';
		showBulkPriceDialog = true;
	}

	function applyPercentageChange() {
		const pct = parseFloat(bulkPricePercent);
		if (isNaN(pct)) {
			toast.error('Please enter a valid percentage');
			return;
		}
		bulkPriceUpdates = bulkPriceUpdates.map((u) => ({
			...u,
			newPrice: Math.max(0, Math.round(u.currentPrice * (1 + pct / 100) * 100) / 100)
		}));
	}

	async function submitBulkPriceUpdate() {
		const changed = bulkPriceUpdates.filter((u) => u.newPrice !== u.currentPrice);
		if (changed.length === 0) {
			toast.error('No prices have changed');
			return;
		}

		isBulkSubmitting = true;
		try {
			const result = await bulkUpdatePrices(
				businessId,
				changed.map((u) => ({ itemId: u.itemId, newPrice: u.newPrice }))
			);

			// Update local state
			for (const update of changed) {
				const idx = menuItems.findIndex((i) => i.id === update.itemId);
				if (idx !== -1) {
					menuItems[idx] = { ...menuItems[idx], price: update.newPrice };
				}
			}
			menuItems = [...menuItems];

			showBulkPriceDialog = false;
			toast.success(result.message);
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update prices'));
		} finally {
			isBulkSubmitting = false;
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
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add category'));
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
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to seed categories'));
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

{#snippet comboPicker()}
	<div class="grid grid-cols-4 items-start gap-4">
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label class="pt-2 text-right text-sm font-medium">Components</label>
		<div class="col-span-3 space-y-2">
			{#each formComboComponents as comp, i}
				<div class="flex items-center gap-2 rounded border p-2 text-sm">
					<span class="flex-1">{comp.name}</span>
					<Input
						type="number"
						min="1"
						class="h-7 w-16 text-center text-sm"
						value={comp.quantity}
						oninput={(e) => {
							formComboComponents[i].quantity = parseInt((e.target as HTMLInputElement).value) || 1;
						}}
					/>
					<Button
						variant="ghost"
						size="icon"
						class="h-6 w-6 shrink-0"
						onclick={() => {
							formComboComponents = formComboComponents.filter((_, idx) => idx !== i);
						}}
					>
						<span class="text-xs">x</span>
					</Button>
				</div>
			{/each}
			<Input placeholder="Search items to add..." bind:value={comboSearch} class="text-sm" />
			{#if comboSearch}
				<div class="max-h-32 overflow-y-auto rounded border p-1">
					{#each menuItems.filter((it) => it.name
								.toLowerCase()
								.includes(comboSearch.toLowerCase()) && !formComboComponents.some((c) => c.menuItemId === it.id)) as it}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-accent"
							onclick={() => {
								formComboComponents = [
									...formComboComponents,
									{ menuItemId: it.id, name: it.name, quantity: 1 }
								];
								comboSearch = '';
							}}
						>
							{it.name}
						</button>
					{/each}
				</div>
			{/if}
			{#if formComboComponents.length === 0}
				<p class="text-xs text-muted-foreground">Search and add items that make up this combo.</p>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet ingredientPicker()}
	<div class="grid grid-cols-4 items-start gap-4">
		<label class="pt-2 text-right text-sm font-medium">Ingredients</label>
		<div class="col-span-3 space-y-3">
			<!-- Search inventory items -->
			<div class="relative">
				<IconSearch
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input placeholder="Search inventory items..." bind:value={ingredientSearch} class="pl-9" />
			</div>

			<!-- Dropdown results -->
			{#if ingredientSearch && filteredInventory.length > 0}
				<div class="max-h-40 overflow-y-auto rounded-md border bg-popover">
					{#each filteredInventory.slice(0, 8) as invItem (invItem.id)}
						<button
							type="button"
							class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
							onclick={() => addIngredient(invItem)}
						>
							<span class="font-medium">{invItem.name}</span>
							<span class="text-xs text-muted-foreground">
								{Number(invItem.currentStock)}
								{invItem.unit} in stock
							</span>
						</button>
					{/each}
				</div>
			{:else if ingredientSearch && filteredInventory.length === 0}
				<p class="px-3 py-2 text-sm text-muted-foreground">No matching inventory items</p>
			{/if}

			<!-- Selected ingredients -->
			{#if formIngredients.length > 0}
				<div class="space-y-2">
					{#each formIngredients as ingredient, idx (ingredient.inventoryItemId)}
						<div class="flex items-center gap-2 rounded-md border p-2">
							<span class="flex-1 text-sm font-medium">{ingredient.inventoryItemName}</span>
							<Input
								type="number"
								step="0.01"
								min="0.001"
								class="w-20"
								value={ingredient.quantityUsed}
								onchange={(e) => {
									const val = parseFloat((e.currentTarget as HTMLInputElement).value);
									if (val > 0) {
										formIngredients[idx] = { ...formIngredients[idx], quantityUsed: val };
										formIngredients = [...formIngredients];
									}
								}}
							/>
							<span class="text-xs text-muted-foreground">{ingredient.unit}</span>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								onclick={() => removeIngredient(ingredient.inventoryItemId)}
							>
								<IconX class="h-3 w-3" />
							</Button>
						</div>
					{/each}
				</div>

				<!-- Food cost summary -->
				<div class="flex items-center justify-between rounded-md bg-muted px-3 py-2">
					<span class="text-sm font-medium">Food Cost</span>
					<div class="text-right">
						<span class="text-sm font-semibold">{formatCurrency(computedFoodCost)}</span>
						{#if formPrice && parseFloat(formPrice) > 0}
							<span class="ml-1 text-xs text-muted-foreground">
								({Math.round((computedFoodCost / parseFloat(formPrice)) * 100)}%)
							</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<PageShell title={getPageTitle()} description={getPageDescription()}>
	<!-- Filters and Actions -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
			<div class="relative max-w-sm flex-1">
				<IconSearch
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					placeholder={businessType === 'retail' ? 'Search products...' : 'Search menu items...'}
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>

			<Select.Root type="single" bind:value={categoryFilter}>
				<Select.Trigger class="w-[180px]">
					{categoryFilterLabel}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all">All Categories</Select.Item>
					{#each categories as category}
						<Select.Item value={category.id}>{category.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		{#if canModify(userRole)}
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => (showAddCategoryDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Category
				</Button>
				<Button
					variant="outline"
					onclick={openBulkPriceDialog}
					disabled={filteredItems.length === 0}
				>
					Bulk Price Update
				</Button>
				<Button onclick={openAddDialog}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add {businessType === 'retail' ? 'Product' : 'Item'}
				</Button>
			</div>
		{/if}
	</div>

	<!-- Items Table -->
	<div class="overflow-x-auto rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="hidden lg:table-cell">Image</Table.Head>
					<Table.Head>{businessType === 'retail' ? 'Product' : 'Item'} Name</Table.Head>
					<Table.Head class="hidden lg:table-cell">Category</Table.Head>
					<Table.Head>Price</Table.Head>
					<Table.Head class="hidden md:table-cell">Food Cost</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredItems as item (item.id)}
					<Table.Row>
						<Table.Cell class="hidden lg:table-cell">
							{#if item.image}
								<img
									src={item.image}
									alt={item.name}
									loading="lazy"
									class="h-10 w-10 rounded object-cover"
								/>
							{:else}
								<div class="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs">
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
						<Table.Cell class="hidden lg:table-cell">{getCategoryName(item.categoryId)}</Table.Cell>
						<Table.Cell>{formatCurrency(item.price)}</Table.Cell>
						<Table.Cell class="hidden md:table-cell">
							{#if item.foodCost != null && item.foodCost > 0}
								<div class="flex flex-col">
									<span>{formatCurrency(item.foodCost)}</span>
									{#if item.price > 0}
										<span class="text-xs text-muted-foreground">
											{Math.round((item.foodCost / item.price) * 100)}%
										</span>
									{/if}
								</div>
							{:else}
								<span class="text-xs text-muted-foreground">-</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<StatusPill
								label={item.isAvailable ? 'Available' : 'Unavailable'}
								status={item.isAvailable ? 'success' : 'error'}
							/>
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								{#if canModify(userRole)}
									<Button
										variant="ghost"
										size="icon"
										onclick={() => toggleAvailability(item.id)}
										title={item.isAvailable ? 'Hide item' : 'Show item'}
									>
										{#if item.isAvailable}
											<IconEyeOff class="h-4 w-4" />
										{:else}
											<IconEye class="h-4 w-4" />
										{/if}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => duplicateItem(item)}
										title="Duplicate item"
									>
										<IconCopy class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openEditDialog(item)}
										title="Edit item"
									>
										<IconEdit class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => deleteItem(item.id)}
										title="Delete item"
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

	{#if filteredItems.length === 0}
		{#if categories.length === 0}
			<EmptyState
				type="empty"
				title="No categories yet"
				description="Create categories first before adding items."
			>
				{#snippet children()}
					<div class="flex gap-2">
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
				{/snippet}
			</EmptyState>
		{:else if menuItems.length === 0}
			<EmptyState
				type="empty"
				title="No {businessType === 'retail' ? 'products' : 'menu items'} yet"
				description="Get started by adding your first {businessType === 'retail'
					? 'product'
					: 'menu item'}."
				actionLabel="Add {businessType === 'retail' ? 'Product' : 'Item'}"
				onAction={openAddDialog}
			/>
		{:else}
			<EmptyState
				type="no-results"
				title="No items found"
				description="Try adjusting your search or filter."
			/>
		{/if}
	{/if}
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
				onclick={() => goto(`?page=${data.page - 1}&limit=${data.limit}`)}>Previous</Button
			>
			<Button
				size="sm"
				variant="outline"
				disabled={data.page >= data.totalPages}
				onclick={() => goto(`?page=${data.page + 1}&limit=${data.limit}`)}>Next</Button
			>
		</div>
	</div>
</PageShell>

<!-- Add Item Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Add {businessType === 'retail' ? 'Product' : 'Menu Item'}</Dialog.Title>
			<Dialog.Description>
				Add a new {businessType === 'retail' ? 'product' : 'item'} to your {config.label.toLowerCase()}
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-name" class="text-right">Name *</label>
				<Input id="add-name" autofocus bind:value={formName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-start gap-4">
				<label for="add-description" class="pt-2 text-right">Description</label>
				<Textarea id="add-description" bind:value={formDescription} rows={3} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="add-price" class="text-right">Price *</label>
				<Input id="add-price" type="number" step="0.01" bind:value={formPrice} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="text-right">Category *</label>
				<div class="col-span-3">
					<Select.Root type="single" bind:value={formCategory}>
						<Select.Trigger class="w-full">
							{formCategoryLabel}
						</Select.Trigger>
						<Select.Content>
							{#each categories as cat}
								<Select.Item value={cat.id}>{cat.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
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
						{#if formImage && !formImage.startsWith('data:')}
							<img
								src={formImage}
								alt="Preview"
								class="h-24 w-24 rounded-md object-cover"
								onerror={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'none';
								}}
								onload={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'block';
								}}
							/>
						{/if}
					{:else}
						<ImageCropper.Root
							bind:src={formImage}
							onUnsupportedFile={() =>
								toast.error('Unsupported file type. Please upload an image.')}
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
					<Checkbox bind:checked={formIsVegetarian} class="mr-2" />
					<span class="text-sm text-muted-foreground">Mark as vegetarian</span>
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="text-right">Kitchen prep</label>
				<div class="col-span-3">
					<Select.Root
						type="single"
						value={formRequiresKitchen === null ? 'inherit' : formRequiresKitchen ? 'yes' : 'no'}
						onValueChange={(v) => {
							formRequiresKitchen = v === 'inherit' ? null : v === 'yes';
						}}
					>
						<Select.Trigger class="w-full">
							{formRequiresKitchen === null
								? 'Use category default'
								: formRequiresKitchen
									? 'Yes'
									: 'No (instant)'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="inherit">Use category default</Select.Item>
							<Select.Item value="yes">Yes</Select.Item>
							<Select.Item value="no">No (instant)</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Combo toggle -->
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="combo-create" class="text-right">Combo</label>
				<div class="col-span-3 flex items-center gap-2">
					<Switch
						id="combo-create"
						checked={formIsCombo}
						onCheckedChange={(v) => (formIsCombo = v)}
					/>
					<span class="text-sm text-muted-foreground"
						>{formIsCombo ? 'This is a combo item' : 'Regular item'}</span
					>
				</div>
			</div>
			{#if formIsCombo}
				{@render comboPicker()}
			{/if}

			{@render ingredientPicker()}
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
	<Dialog.Content class="max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Edit {businessType === 'retail' ? 'Product' : 'Menu Item'}</Dialog.Title>
			<Dialog.Description>
				Update the {businessType === 'retail' ? 'product' : 'item'} details
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="edit-name" class="text-right">Name *</label>
				<Input id="edit-name" autofocus bind:value={formName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-start gap-4">
				<label for="edit-description" class="pt-2 text-right">Description</label>
				<Textarea id="edit-description" bind:value={formDescription} rows={3} class="col-span-3" />
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
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="text-right">Category *</label>
				<div class="col-span-3">
					<Select.Root type="single" bind:value={formCategory}>
						<Select.Trigger class="w-full">
							{formCategoryLabel}
						</Select.Trigger>
						<Select.Content>
							{#each categories as cat}
								<Select.Item value={cat.id}>{cat.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
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
						{#if formImage && !formImage.startsWith('data:')}
							<img
								src={formImage}
								alt="Preview"
								class="h-24 w-24 rounded-md object-cover"
								onerror={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'none';
								}}
								onload={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'block';
								}}
							/>
						{/if}
					{:else}
						<ImageCropper.Root
							bind:src={formImage}
							onUnsupportedFile={() =>
								toast.error('Unsupported file type. Please upload an image.')}
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
					<Checkbox bind:checked={formIsVegetarian} class="mr-2" />
					<span class="text-sm text-muted-foreground">Mark as vegetarian</span>
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="text-right">Kitchen prep</label>
				<div class="col-span-3">
					<Select.Root
						type="single"
						value={formRequiresKitchen === null ? 'inherit' : formRequiresKitchen ? 'yes' : 'no'}
						onValueChange={(v) => {
							formRequiresKitchen = v === 'inherit' ? null : v === 'yes';
						}}
					>
						<Select.Trigger class="w-full">
							{formRequiresKitchen === null
								? 'Use category default'
								: formRequiresKitchen
									? 'Yes'
									: 'No (instant)'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="inherit">Use category default</Select.Item>
							<Select.Item value="yes">Yes</Select.Item>
							<Select.Item value="no">No (instant)</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Combo toggle -->
			<div class="grid grid-cols-4 items-center gap-4">
				<label for="combo-edit" class="text-right">Combo</label>
				<div class="col-span-3 flex items-center gap-2">
					<Switch
						id="combo-edit"
						checked={formIsCombo}
						onCheckedChange={(v) => (formIsCombo = v)}
					/>
					<span class="text-sm text-muted-foreground"
						>{formIsCombo ? 'This is a combo item' : 'Regular item'}</span
					>
				</div>
			</div>
			{#if formIsCombo}
				{@render comboPicker()}
			{/if}

			{@render ingredientPicker()}
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
				<Input id="category-name" autofocus bind:value={newCategoryName} class="col-span-3" />
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

<!-- Bulk Price Update Dialog -->
<Dialog.Root bind:open={showBulkPriceDialog}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Bulk Price Update</Dialog.Title>
			<Dialog.Description>
				Update prices for multiple items at once. You can apply a percentage change to all items or
				edit individual prices.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Percentage adjustment row -->
			<div class="flex items-end gap-2">
				<div class="flex-1">
					<label class="mb-1 block text-sm font-medium">Apply % change to all items</label>
					<Input
						type="number"
						step="0.1"
						placeholder="e.g. 10 for +10%, -5 for -5%"
						bind:value={bulkPricePercent}
					/>
				</div>
				<Button variant="outline" onclick={applyPercentageChange}>Apply</Button>
			</div>

			<!-- Items table -->
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Item Name</Table.Head>
							<Table.Head class="w-32">Current Price</Table.Head>
							<Table.Head class="w-36">New Price</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each bulkPriceUpdates as row, idx (row.itemId)}
							<Table.Row class={row.newPrice !== row.currentPrice ? 'bg-muted/40' : ''}>
								<Table.Cell class="font-medium">{row.name}</Table.Cell>
								<Table.Cell class="text-muted-foreground"
									>{formatCurrency(row.currentPrice)}</Table.Cell
								>
								<Table.Cell>
									<Input
										type="number"
										step="0.01"
										min="0"
										value={row.newPrice}
										class="w-28"
										onchange={(e) => {
											const val = parseFloat((e.currentTarget as HTMLInputElement).value);
											if (!isNaN(val) && val >= 0) {
												bulkPriceUpdates[idx] = { ...bulkPriceUpdates[idx], newPrice: val };
												bulkPriceUpdates = [...bulkPriceUpdates];
											}
										}}
									/>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<p class="text-sm text-muted-foreground">
				{bulkPriceUpdates.filter((u) => u.newPrice !== u.currentPrice).length} item(s) will be updated.
			</p>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showBulkPriceDialog = false)}>Cancel</Button>
			<Button onclick={submitBulkPriceUpdate} disabled={isBulkSubmitting}>
				{#if isBulkSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Apply Price Updates
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Menu Item"
	description="Are you sure you want to delete this menu item? This action cannot be undone."
	confirmLabel="Delete Item"
	variant="destructive"
	onConfirm={confirmDeleteItem}
/>
