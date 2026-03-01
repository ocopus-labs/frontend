<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { IconPlus, IconPencil, IconTrash, IconSearch, IconLoader2 } from '@tabler/icons-svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { formatCurrency as i18nFormatCurrency, CURRENCY_CONFIG } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { createModifierGroup, updateModifierGroup, deleteModifierGroup } from '$lib/api';
	import type { ModifierGroup } from '$lib/types/menu';
	import { userFriendlyError } from '$lib/utils/error';
	import { invalidate } from '$app/navigation';
	import { clearApiCache } from '$lib/api/client';

	function invalidateMenuData() {
		clearApiCache('/menu');
		invalidate('app:menu');
	}

	let { data } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);
	const businessId = $derived(data.businessId);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	let modifierGroups = $state<ModifierGroup[]>(data.modifierGroups ?? []);

	// Keep in sync when data reloads
	$effect(() => {
		modifierGroups = data.modifierGroups ?? [];
	});

	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let editingModifier = $state<ModifierGroup | null>(null);
	let deleteModifierDialogOpen = $state(false);
	let deleteModifierId = $state<string | null>(null);
	let saving = $state(false);

	let newModifier = $state({
		name: '',
		required: false,
		multiSelect: false,
		options: [{ name: '', price: 0 }]
	});

	const filteredModifiers = $derived(
		modifierGroups.filter((mod) => mod.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function resetNewModifier() {
		newModifier = { name: '', required: false, multiSelect: false, options: [{ name: '', price: 0 }] };
	}

	function addOption() {
		newModifier.options = [...newModifier.options, { name: '', price: 0 }];
	}

	function removeOption(index: number) {
		newModifier.options = newModifier.options.filter((_, i) => i !== index);
	}

	async function addModifier() {
		if (!newModifier.name.trim()) {
			toast.error('Modifier name is required');
			return;
		}

		const validOptions = newModifier.options.filter((opt) => opt.name.trim());
		if (validOptions.length === 0) {
			toast.error('At least one option is required');
			return;
		}

		saving = true;
		try {
			const { modifierGroup } = await createModifierGroup(businessId, {
				name: newModifier.name.trim(),
				required: newModifier.required,
				multiSelect: newModifier.multiSelect,
				options: validOptions.map((opt) => ({
					name: opt.name.trim(),
					price: Number(opt.price) || 0
				}))
			});
			modifierGroups = [...modifierGroups, modifierGroup];
			toast.success('Modifier group created');
			invalidateMenuData();
			showAddDialog = false;
			resetNewModifier();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			saving = false;
		}
	}

	function editModifier(modifier: ModifierGroup) {
		editingModifier = JSON.parse(JSON.stringify(modifier));
	}

	function addEditOption() {
		if (editingModifier) {
			editingModifier.options = [
				...editingModifier.options,
				{ id: crypto.randomUUID(), name: '', price: 0, sortOrder: editingModifier.options.length + 1 }
			];
		}
	}

	function removeEditOption(index: number) {
		if (editingModifier) {
			editingModifier.options = editingModifier.options.filter((_, i) => i !== index);
		}
	}

	async function saveModifier() {
		if (!editingModifier) return;

		const validOptions = editingModifier.options.filter((opt) => opt.name.trim());
		if (validOptions.length === 0) {
			toast.error('At least one option is required');
			return;
		}

		saving = true;
		try {
			const { modifierGroup } = await updateModifierGroup(businessId, editingModifier.id, {
				name: editingModifier.name.trim(),
				required: editingModifier.required,
				multiSelect: editingModifier.multiSelect,
				options: validOptions.map((opt) => ({
					name: opt.name.trim(),
					price: Number(opt.price) || 0,
					isDefault: opt.isDefault
				}))
			});
			modifierGroups = modifierGroups.map((mod) =>
				mod.id === modifierGroup.id ? modifierGroup : mod
			);
			toast.success('Modifier group updated');
			invalidateMenuData();
			editingModifier = null;
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			saving = false;
		}
	}

	function triggerDeleteModifier(modifierId: string) {
		deleteModifierId = modifierId;
		deleteModifierDialogOpen = true;
	}

	async function confirmDeleteModifier() {
		if (deleteModifierId === null) return;
		const idToDelete = deleteModifierId;

		try {
			await deleteModifierGroup(businessId, idToDelete);
			modifierGroups = modifierGroups.filter((mod) => mod.id !== idToDelete);
			toast.success('Modifier group deleted');
			invalidateMenuData();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			deleteModifierId = null;
		}
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
										{modifier.options.length} option{modifier.options.length === 1 ? '' : 's'}
									</Card.Description>
								</div>
								<div class="flex gap-1">
									<Button variant="ghost" size="icon" onclick={() => editModifier(modifier)}>
										<IconPencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => triggerDeleteModifier(modifier.id)}
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
											(+{formatCurrency(option.price)})
										{/if}
									</Badge>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			{#if filteredModifiers.length === 0}
				<EmptyState type="empty" title="No modifiers" description="Create modifier groups to customize menu items." />
			{/if}
		</div>
	</div>
</div>

<!-- Add Modifier Dialog -->
<Dialog.Root bind:open={showAddDialog} onOpenChange={(open) => { if (!open) resetNewModifier(); }}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Modifier</Dialog.Title>
			<Dialog.Description>Create a new modifier group with options</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="name" class="text-sm font-medium">Name</label>
				<Input id="name" autofocus bind:value={newModifier.name} placeholder="e.g., Size, Toppings" />
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
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{CURRENCY_CONFIG[currency]?.symbol || '$'}</span>
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
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={saving}>Cancel</Button>
			<Button onclick={addModifier} disabled={saving}>
				{#if saving}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Modifier
			</Button>
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
					<Input id="edit-name" autofocus bind:value={editingModifier.name} placeholder="Modifier name" />
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
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{CURRENCY_CONFIG[currency]?.symbol || '$'}</span>
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
				<Button variant="outline" onclick={() => (editingModifier = null)} disabled={saving}>Cancel</Button>
				<Button onclick={saveModifier} disabled={saving}>
					{#if saving}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteModifierDialogOpen}
	title="Delete Modifier"
	description="Are you sure you want to delete this modifier group? This action cannot be undone."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={confirmDeleteModifier}
/>
