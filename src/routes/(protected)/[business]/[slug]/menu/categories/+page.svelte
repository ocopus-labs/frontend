<script lang="ts">
	import type { PageData } from './$types';
	import type { MenuCategory } from '$lib/types/menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconSearch,
		IconGripVertical,
		IconWand
	} from '@tabler/icons-svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		createCategory,
		updateCategory,
		deleteCategory as deleteCategoryApi,
		reorderCategories,
		seedDefaultCategories
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { invalidate } from '$app/navigation';
	import { clearApiCache } from '$lib/api/client';

	let { data }: { data: PageData } = $props();

	const businessId = data.businessId;

	function invalidateMenuData() {
		clearApiCache('/menu');
		invalidate('app:menu');
	}

	let categories = $state<MenuCategory[]>(data.categories || []);

	$effect(() => { categories = data.categories || []; });
	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let editingCategory = $state<MenuCategory | null>(null);
	let deleteCategoryDialogOpen = $state(false);
	let deleteCategoryTarget = $state<MenuCategory | null>(null);
	let isSubmitting = $state(false);

	let newCategory = $state({ name: '', description: '' });

	const filteredCategories = $derived(
		categories
			.filter(
				(cat) =>
					cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(cat.description || '').toLowerCase().includes(searchQuery.toLowerCase())
			)
			.sort((a, b) => a.sortOrder - b.sortOrder)
	);

	async function addCategory() {
		if (!newCategory.name.trim()) {
			toast.error('Category name is required');
			return;
		}

		isSubmitting = true;
		try {
			const result = await createCategory(businessId, {
				name: newCategory.name.trim(),
				description: newCategory.description.trim() || undefined
			});
			categories = [...categories, result.category];
			toast.success('Category added successfully');
			invalidateMenuData();
			showAddDialog = false;
			newCategory = { name: '', description: '' };
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add category'));
		} finally {
			isSubmitting = false;
		}
	}

	function openEditDialog(category: MenuCategory) {
		editingCategory = { ...category };
	}

	async function saveCategory() {
		if (!editingCategory) return;

		isSubmitting = true;
		try {
			const result = await updateCategory(businessId, editingCategory.id, {
				name: editingCategory.name,
				description: editingCategory.description || undefined
			});
			categories = categories.map((cat) =>
				cat.id === result.category.id ? result.category : cat
			);
			toast.success('Category updated successfully');
			invalidateMenuData();
			editingCategory = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update category'));
		} finally {
			isSubmitting = false;
		}
	}

	function triggerDeleteCategory(category: MenuCategory) {
		deleteCategoryTarget = category;
		deleteCategoryDialogOpen = true;
	}

	async function confirmDeleteCategory() {
		if (!deleteCategoryTarget) return;
		try {
			await deleteCategoryApi(businessId, deleteCategoryTarget.id);
			categories = categories.filter((cat) => cat.id !== deleteCategoryTarget!.id);
			toast.success('Category deleted successfully');
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete category'));
		} finally {
			deleteCategoryTarget = null;
		}
	}

	async function toggleCategory(category: MenuCategory) {
		try {
			const result = await updateCategory(businessId, category.id, {
				isActive: !category.isActive
			});
			categories = categories.map((cat) =>
				cat.id === result.category.id ? result.category : cat
			);
			toast.success(result.category.isActive ? 'Category enabled' : 'Category disabled');
			invalidateMenuData();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to toggle category'));
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
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Categories</h1>
					<p class="text-muted-foreground">Organize your menu items into categories</p>
				</div>
				<div class="flex gap-2">
					{#if categories.length === 0}
						<Button variant="outline" onclick={seedCategories} disabled={isSubmitting}>
							{#if isSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<IconWand class="mr-2 h-4 w-4" />
							{/if}
							Use Default Categories
						</Button>
					{/if}
					<Button onclick={() => (showAddDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Category
					</Button>
				</div>
			</div>

			<!-- Search -->
			{#if categories.length > 0}
				<div class="px-6">
					<div class="relative max-w-sm">
						<IconSearch
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input placeholder="Search categories..." bind:value={searchQuery} class="pl-9" />
					</div>
				</div>
			{/if}

			<!-- Categories Grid -->
			{#if filteredCategories.length > 0}
				<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each filteredCategories as category (category.id)}
						<Card.Root class="relative overflow-hidden {!category.isActive ? 'opacity-60' : ''}">
							<Card.Header class="pb-2">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-2">
										<IconGripVertical class="h-4 w-4 cursor-grab text-muted-foreground" />
										<Card.Title class="text-lg">{category.name}</Card.Title>
									</div>
									<Badge variant={category.isActive ? 'default' : 'secondary'}>
										{category.isActive ? 'Active' : 'Inactive'}
									</Badge>
								</div>
							</Card.Header>
							<Card.Content>
								<p class="text-sm text-muted-foreground">
									{category.description || 'No description'}
								</p>
							</Card.Content>
							<Card.Footer class="flex justify-between gap-2">
								<Button variant="ghost" size="sm" onclick={() => toggleCategory(category)}>
									{category.isActive ? 'Disable' : 'Enable'}
								</Button>
								<div class="flex gap-1">
									<Button variant="ghost" size="icon" onclick={() => openEditDialog(category)}>
										<IconPencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => triggerDeleteCategory(category)}
										class="text-destructive hover:text-destructive"
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								</div>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>
			{:else if categories.length === 0}
				<EmptyState
					type="empty"
					title="No categories yet"
					description="Create your first category to organize menu items, or use default categories to get started."
				/>
			{:else}
				<EmptyState
					type="no-results"
					title="No categories found"
					description="Try adjusting your search."
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Add Category Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Category</Dialog.Title>
			<Dialog.Description>Create a new menu category</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="name" class="text-sm font-medium">Name</label>
				<Input id="name" autofocus bind:value={newCategory.name} placeholder="Category name" />
			</div>
			<div class="grid gap-2">
				<label for="description" class="text-sm font-medium">Description</label>
				<Input
					id="description"
					bind:value={newCategory.description}
					placeholder="Category description"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addCategory} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Category
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Category Dialog -->
<Dialog.Root open={!!editingCategory} onOpenChange={(open) => !open && (editingCategory = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Category</Dialog.Title>
			<Dialog.Description>Update category details</Dialog.Description>
		</Dialog.Header>
		{#if editingCategory}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-name" class="text-sm font-medium">Name</label>
					<Input
						id="edit-name"
						autofocus
						bind:value={editingCategory.name}
						placeholder="Category name"
					/>
				</div>
				<div class="grid gap-2">
					<label for="edit-description" class="text-sm font-medium">Description</label>
					<Input
						id="edit-description"
						bind:value={editingCategory.description}
						placeholder="Category description"
					/>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingCategory = null)}>Cancel</Button>
				<Button onclick={saveCategory} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteCategoryDialogOpen}
	title="Delete Category"
	description="Are you sure you want to delete this category? This action cannot be undone."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={confirmDeleteCategory}
/>
