<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { IconPlus, IconPencil, IconTrash, IconSearch } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';

	// Dummy modifiers data
	let modifiers = $state([
		{
			id: 1,
			name: 'Size',
			options: [
				{ name: 'Small', price: 0 },
				{ name: 'Medium', price: 2 },
				{ name: 'Large', price: 4 }
			],
			required: true,
			multiSelect: false,
			appliesTo: ['Pizza', 'Beverages']
		},
		{
			id: 2,
			name: 'Spice Level',
			options: [
				{ name: 'Mild', price: 0 },
				{ name: 'Medium', price: 0 },
				{ name: 'Hot', price: 0 },
				{ name: 'Extra Hot', price: 0.5 }
			],
			required: false,
			multiSelect: false,
			appliesTo: ['Main Course', 'Appetizers']
		},
		{
			id: 3,
			name: 'Extra Toppings',
			options: [
				{ name: 'Cheese', price: 1.5 },
				{ name: 'Mushrooms', price: 1 },
				{ name: 'Olives', price: 1 },
				{ name: 'Pepperoni', price: 2 },
				{ name: 'Jalapeños', price: 0.75 }
			],
			required: false,
			multiSelect: true,
			appliesTo: ['Pizza']
		},
		{
			id: 4,
			name: 'Sauce',
			options: [
				{ name: 'Marinara', price: 0 },
				{ name: 'Alfredo', price: 1 },
				{ name: 'Pesto', price: 1.5 },
				{ name: 'No Sauce', price: 0 }
			],
			required: true,
			multiSelect: false,
			appliesTo: ['Pasta', 'Pizza']
		},
		{
			id: 5,
			name: 'Add-ons',
			options: [
				{ name: 'Extra Sauce', price: 0.5 },
				{ name: 'Garlic Bread', price: 2.5 },
				{ name: 'Side Salad', price: 3 }
			],
			required: false,
			multiSelect: true,
			appliesTo: ['Main Course', 'Pasta']
		},
		{
			id: 6,
			name: 'Ice',
			options: [
				{ name: 'Regular Ice', price: 0 },
				{ name: 'Less Ice', price: 0 },
				{ name: 'No Ice', price: 0 }
			],
			required: false,
			multiSelect: false,
			appliesTo: ['Beverages']
		}
	]);

	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let editingModifier = $state<(typeof modifiers)[0] | null>(null);
	let newModifier = $state({
		name: '',
		required: false,
		multiSelect: false,
		options: [{ name: '', price: 0 }]
	});

	const filteredModifiers = $derived(
		modifiers.filter((mod) => mod.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function addOption() {
		newModifier.options = [...newModifier.options, { name: '', price: 0 }];
	}

	function removeOption(index: number) {
		newModifier.options = newModifier.options.filter((_, i) => i !== index);
	}

	function addModifier() {
		if (!newModifier.name.trim()) {
			toast.error('Modifier name is required');
			return;
		}

		const validOptions = newModifier.options.filter((opt) => opt.name.trim());
		if (validOptions.length === 0) {
			toast.error('At least one option is required');
			return;
		}

		modifiers = [
			...modifiers,
			{
				id: Math.max(...modifiers.map((m) => m.id)) + 1,
				name: newModifier.name,
				options: validOptions,
				required: newModifier.required,
				multiSelect: newModifier.multiSelect,
				appliesTo: []
			}
		];

		toast.success('Modifier added successfully');
		showAddDialog = false;
		newModifier = { name: '', required: false, multiSelect: false, options: [{ name: '', price: 0 }] };
	}

	function editModifier(modifier: (typeof modifiers)[0]) {
		editingModifier = JSON.parse(JSON.stringify(modifier));
	}

	function addEditOption() {
		if (editingModifier) {
			editingModifier.options = [...editingModifier.options, { name: '', price: 0 }];
		}
	}

	function removeEditOption(index: number) {
		if (editingModifier) {
			editingModifier.options = editingModifier.options.filter((_, i) => i !== index);
		}
	}

	function saveModifier() {
		if (!editingModifier) return;

		const validOptions = editingModifier.options.filter((opt) => opt.name.trim());
		if (validOptions.length === 0) {
			toast.error('At least one option is required');
			return;
		}

		modifiers = modifiers.map((mod) =>
			mod.id === editingModifier!.id ? { ...editingModifier!, options: validOptions } : mod
		);

		toast.success('Modifier updated successfully');
		editingModifier = null;
	}

	function deleteModifier(modifierId: number) {
		modifiers = modifiers.filter((mod) => mod.id !== modifierId);
		toast.success('Modifier deleted successfully');
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Modifiers</h1>
					<p class="text-muted-foreground">Manage customization options for menu items</p>
				</div>
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Modifier
				</Button>
			</div>

			<!-- Search -->
			<div class="px-6">
				<div class="relative max-w-sm">
					<IconSearch
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input placeholder="Search modifiers..." bind:value={searchQuery} class="pl-9" />
				</div>
			</div>

			<!-- Modifiers List -->
			<div class="grid gap-4 px-6">
				{#each filteredModifiers as modifier (modifier.id)}
					<Card.Root>
						<Card.Header>
							<div class="flex items-start justify-between">
								<div>
									<Card.Title class="flex items-center gap-2">
										{modifier.name}
										{#if modifier.required}
											<Badge variant="destructive">Required</Badge>
										{/if}
										{#if modifier.multiSelect}
											<Badge variant="secondary">Multi-select</Badge>
										{/if}
									</Card.Title>
									<Card.Description>
										Applies to: {modifier.appliesTo.length > 0
											? modifier.appliesTo.join(', ')
											: 'All items'}
									</Card.Description>
								</div>
								<div class="flex gap-1">
									<Button variant="ghost" size="sm" onclick={() => editModifier(modifier)}>
										<IconPencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => deleteModifier(modifier.id)}
										class="text-destructive hover:text-destructive"
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								</div>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="flex flex-wrap gap-2">
								{#each modifier.options as option}
									<Badge variant="outline">
										{option.name}
										{#if option.price > 0}
											(+${option.price.toFixed(2)})
										{/if}
									</Badge>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			{#if filteredModifiers.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconSearch class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No modifiers found</h3>
					<p class="text-muted-foreground">Try adjusting your search or add a new modifier.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Modifier Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Modifier</Dialog.Title>
			<Dialog.Description>Create a new modifier with options</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="name" class="text-sm font-medium">Name</label>
				<Input id="name" bind:value={newModifier.name} placeholder="e.g., Size, Toppings" />
			</div>

			<div class="flex items-center gap-6">
				<div class="flex items-center gap-2">
					<Switch id="required" bind:checked={newModifier.required} />
					<label for="required" class="text-sm">Required</label>
				</div>
				<div class="flex items-center gap-2">
					<Switch id="multi" bind:checked={newModifier.multiSelect} />
					<label for="multi" class="text-sm">Allow multiple</label>
				</div>
			</div>

			<div class="grid gap-2">
				<label class="text-sm font-medium">Options</label>
				{#each newModifier.options as option, i}
					<div class="flex items-center gap-2">
						<Input
							bind:value={option.name}
							placeholder="Option name"
							class="flex-1"
						/>
						<div class="relative w-24">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
							<Input
								type="number"
								step="0.01"
								min="0"
								bind:value={option.price}
								class="pl-6"
							/>
						</div>
						{#if newModifier.options.length > 1}
							<Button variant="ghost" size="sm" onclick={() => removeOption(i)}>
								<IconTrash class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				{/each}
				<Button variant="outline" size="sm" onclick={addOption}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Option
				</Button>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addModifier}>Add Modifier</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Modifier Dialog -->
<Dialog.Root open={!!editingModifier} onOpenChange={(open) => !open && (editingModifier = null)}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Modifier</Dialog.Title>
			<Dialog.Description>Update modifier details</Dialog.Description>
		</Dialog.Header>
		{#if editingModifier}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-name" class="text-sm font-medium">Name</label>
					<Input id="edit-name" bind:value={editingModifier.name} placeholder="Modifier name" />
				</div>

				<div class="flex items-center gap-6">
					<div class="flex items-center gap-2">
						<Switch id="edit-required" bind:checked={editingModifier.required} />
						<label for="edit-required" class="text-sm">Required</label>
					</div>
					<div class="flex items-center gap-2">
						<Switch id="edit-multi" bind:checked={editingModifier.multiSelect} />
						<label for="edit-multi" class="text-sm">Allow multiple</label>
					</div>
				</div>

				<div class="grid gap-2">
					<label class="text-sm font-medium">Options</label>
					{#each editingModifier.options as option, i}
						<div class="flex items-center gap-2">
							<Input
								bind:value={option.name}
								placeholder="Option name"
								class="flex-1"
							/>
							<div class="relative w-24">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
								<Input
									type="number"
									step="0.01"
									min="0"
									bind:value={option.price}
									class="pl-6"
								/>
							</div>
							{#if editingModifier.options.length > 1}
								<Button variant="ghost" size="sm" onclick={() => removeEditOption(i)}>
									<IconTrash class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					{/each}
					<Button variant="outline" size="sm" onclick={addEditOption}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Option
					</Button>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingModifier = null)}>Cancel</Button>
				<Button onclick={saveModifier}>Save Changes</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
