<script lang="ts">
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
		IconGripVertical
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';

	// Dummy categories data
	let categories = $state([
		{
			id: 1,
			name: 'Appetizers',
			description: 'Starters and small bites',
			itemCount: 12,
			color: '#ef4444',
			isActive: true,
			sortOrder: 1
		},
		{
			id: 2,
			name: 'Main Course',
			description: 'Primary dishes and entrees',
			itemCount: 24,
			color: '#f97316',
			isActive: true,
			sortOrder: 2
		},
		{
			id: 3,
			name: 'Pizza',
			description: 'Hand-tossed pizzas with various toppings',
			itemCount: 18,
			color: '#eab308',
			isActive: true,
			sortOrder: 3
		},
		{
			id: 4,
			name: 'Pasta',
			description: 'Italian pasta varieties',
			itemCount: 10,
			color: '#22c55e',
			isActive: true,
			sortOrder: 4
		},
		{
			id: 5,
			name: 'Salads',
			description: 'Fresh and healthy salad options',
			itemCount: 8,
			color: '#14b8a6',
			isActive: true,
			sortOrder: 5
		},
		{
			id: 6,
			name: 'Desserts',
			description: 'Sweet treats and desserts',
			itemCount: 15,
			color: '#8b5cf6',
			isActive: true,
			sortOrder: 6
		},
		{
			id: 7,
			name: 'Beverages',
			description: 'Drinks and refreshments',
			itemCount: 20,
			color: '#06b6d4',
			isActive: true,
			sortOrder: 7
		},
		{
			id: 8,
			name: 'Specials',
			description: 'Chef specials and seasonal items',
			itemCount: 5,
			color: '#ec4899',
			isActive: false,
			sortOrder: 8
		}
	]);

	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let editingCategory = $state<(typeof categories)[0] | null>(null);
	let newCategory = $state({
		name: '',
		description: '',
		color: '#3b82f6'
	});

	const filteredCategories = $derived(
		categories.filter(
			(cat) =>
				cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				cat.description.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function addCategory() {
		if (!newCategory.name.trim()) {
			toast.error('Category name is required');
			return;
		}

		categories = [
			...categories,
			{
				id: Math.max(...categories.map((c) => c.id)) + 1,
				name: newCategory.name,
				description: newCategory.description,
				itemCount: 0,
				color: newCategory.color,
				isActive: true,
				sortOrder: categories.length + 1
			}
		];

		toast.success('Category added successfully');
		showAddDialog = false;
		newCategory = { name: '', description: '', color: '#3b82f6' };
	}

	function editCategory(category: (typeof categories)[0]) {
		editingCategory = { ...category };
	}

	function saveCategory() {
		if (!editingCategory) return;

		categories = categories.map((cat) => (cat.id === editingCategory!.id ? editingCategory! : cat));

		toast.success('Category updated successfully');
		editingCategory = null;
	}

	function deleteCategory(categoryId: number) {
		const category = categories.find((c) => c.id === categoryId);
		if (category && category.itemCount > 0) {
			toast.error('Cannot delete category with items. Move items first.');
			return;
		}

		categories = categories.filter((cat) => cat.id !== categoryId);
		toast.success('Category deleted successfully');
	}

	function toggleCategory(categoryId: number) {
		categories = categories.map((cat) =>
			cat.id === categoryId ? { ...cat, isActive: !cat.isActive } : cat
		);
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
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Category
				</Button>
			</div>

			<!-- Search -->
			<div class="px-6">
				<div class="relative max-w-sm">
					<IconSearch
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input placeholder="Search categories..." bind:value={searchQuery} class="pl-9" />
				</div>
			</div>

			<!-- Categories Grid -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each filteredCategories as category (category.id)}
					<Card.Root class="relative overflow-hidden {!category.isActive ? 'opacity-60' : ''}">
						<div class="absolute top-0 left-0 h-1 w-full" style="background-color: {category.color}"
						></div>
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
							<p class="text-sm text-muted-foreground">{category.description}</p>
							<p class="mt-2 text-sm">
								<span class="font-medium">{category.itemCount}</span> items
							</p>
						</Card.Content>
						<Card.Footer class="flex justify-between gap-2">
							<Button variant="ghost" size="sm" onclick={() => toggleCategory(category.id)}>
								{category.isActive ? 'Disable' : 'Enable'}
							</Button>
							<div class="flex gap-1">
								<Button variant="ghost" size="sm" onclick={() => editCategory(category)}>
									<IconPencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => deleteCategory(category.id)}
									class="text-destructive hover:text-destructive"
								>
									<IconTrash class="h-4 w-4" />
								</Button>
							</div>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>

			{#if filteredCategories.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconSearch class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No categories found</h3>
					<p class="text-muted-foreground">Try adjusting your search or add a new category.</p>
				</div>
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
				<Input id="name" bind:value={newCategory.name} placeholder="Category name" />
			</div>
			<div class="grid gap-2">
				<label for="description" class="text-sm font-medium">Description</label>
				<Input
					id="description"
					bind:value={newCategory.description}
					placeholder="Category description"
				/>
			</div>
			<div class="grid gap-2">
				<label for="color" class="text-sm font-medium">Color</label>
				<div class="flex items-center gap-2">
					<input
						id="color"
						type="color"
						bind:value={newCategory.color}
						class="h-10 w-14 cursor-pointer rounded border"
					/>
					<Input bind:value={newCategory.color} class="flex-1" />
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addCategory}>Add Category</Button>
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
					<Input id="edit-name" bind:value={editingCategory.name} placeholder="Category name" />
				</div>
				<div class="grid gap-2">
					<label for="edit-description" class="text-sm font-medium">Description</label>
					<Input
						id="edit-description"
						bind:value={editingCategory.description}
						placeholder="Category description"
					/>
				</div>
				<div class="grid gap-2">
					<label for="edit-color" class="text-sm font-medium">Color</label>
					<div class="flex items-center gap-2">
						<input
							id="edit-color"
							type="color"
							bind:value={editingCategory.color}
							class="h-10 w-14 cursor-pointer rounded border"
						/>
						<Input bind:value={editingCategory.color} class="flex-1" />
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingCategory = null)}>Cancel</Button>
				<Button onclick={saveCategory}>Save Changes</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
