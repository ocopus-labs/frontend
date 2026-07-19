<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { IconPlus, IconPencil, IconTrash, IconSearch, IconLoader2 } from '@tabler/icons-svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { formatCurrency as i18nFormatCurrency, CURRENCY_CONFIG } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { createModifierGroup, updateModifierGroup, deleteModifierGroup } from '$lib/api';
	import type { ModifierGroup } from '$lib/types/menu';
	import { userFriendlyError } from '$lib/utils/error';
	import { invalidate } from '$app/navigation';
	import { clearApiCache } from '$lib/api/client';
	import { invalidateMenuCache } from '$lib/stores/pos-cache';

	function invalidateMenuData() {
		clearApiCache('/menu');
		invalidateMenuCache();
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
		newModifier = {
			name: '',
			required: false,
			multiSelect: false,
			options: [{ name: '', price: 0 }]
		};
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
				{
					id: crypto.randomUUID(),
					name: '',
					price: 0,
					sortOrder: editingModifier.options.length + 1
				}
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

<PageShell back title="Modifiers" description="Manage customization options for menu items">
	<div>
		<SettingsSection
			title="Modifier groups"
			description="Option sets like Size or Toppings that customers choose from when ordering."
		>
			{#snippet action()}
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Modifier
				</Button>
			{/snippet}

			<div class="relative max-w-sm">
				<IconSearch
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input placeholder="Search modifiers..." bind:value={searchQuery} class="pl-9" />
			</div>

			{#if filteredModifiers.length === 0}
				<EmptyState
					type="empty"
					title="No modifiers"
					description="Create modifier groups to customize menu items."
				/>
			{:else}
				<div class="divide-y rounded-lg border">
					{#each filteredModifiers as modifier (modifier.id)}
						<div>
							<div class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<span class="truncate text-sm font-medium">{modifier.name}</span>
										{#if modifier.required}
											<Badge variant="destructive">Required</Badge>
										{:else}
											<Badge variant="outline">Optional</Badge>
										{/if}
										{#if modifier.multiSelect}
											<Badge variant="secondary">Multi-select</Badge>
										{/if}
									</div>
									<p class="mt-0.5 text-xs text-muted-foreground">
										{modifier.options.length} option{modifier.options.length === 1 ? '' : 's'}
									</p>
								</div>
								<div class="flex shrink-0 gap-1">
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Edit ${modifier.name}`}
										onclick={() => editModifier(modifier)}
									>
										<IconPencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Delete ${modifier.name}`}
										onclick={() => triggerDeleteModifier(modifier.id)}
										class="text-destructive hover:text-destructive"
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								</div>
							</div>

							{#if modifier.options.length > 0}
								<ul class="divide-y border-t bg-muted/20">
									{#each modifier.options as option}
										<li
											class="flex items-center justify-between gap-4 py-2 pr-4 pl-8 text-sm hover:bg-muted/40"
										>
											<span class="min-w-0 truncate">{option.name}</span>
											<span class="shrink-0 text-xs text-muted-foreground">
												{option.price > 0 ? `+${formatCurrency(option.price)}` : 'No charge'}
											</span>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</SettingsSection>
	</div>
</PageShell>

<!-- Add Modifier Dialog -->
<Dialog.Root
	bind:open={showAddDialog}
	onOpenChange={(open) => {
		if (!open) resetNewModifier();
	}}
>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Modifier</Dialog.Title>
			<Dialog.Description>Create a new modifier group with options</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<Field.Field>
				<Field.Label for="name">Name</Field.Label>
				<Input
					id="name"
					autofocus
					bind:value={newModifier.name}
					placeholder="e.g., Size, Toppings"
					class="max-w-sm"
				/>
			</Field.Field>

			<div class="flex items-center gap-6">
				<div class="flex items-center gap-2">
					<Switch id="required" bind:checked={newModifier.required} />
					<Field.Label for="required">Required</Field.Label>
				</div>
				<div class="flex items-center gap-2">
					<Switch id="multi" bind:checked={newModifier.multiSelect} />
					<Field.Label for="multi">Allow multiple</Field.Label>
				</div>
			</div>

			<Field.Set>
				<Field.Legend>Options</Field.Legend>
				<div class="flex flex-col gap-2">
					{#each newModifier.options as option, i}
						<div class="flex items-center gap-2">
							<Input bind:value={option.name} placeholder="Option name" class="min-w-0 flex-1" />
							<div class="relative w-full max-w-[8rem] shrink-0">
								<span class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
									>{CURRENCY_CONFIG[currency]?.symbol || '$'}</span
								>
								<Input type="number" step="0.01" min="0" bind:value={option.price} class="pl-6" />
							</div>
							{#if newModifier.options.length > 1}
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Remove option"
									onclick={() => removeOption(i)}
								>
									<IconTrash class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					{/each}
					<Button variant="outline" size="sm" class="w-fit" onclick={addOption}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Option
					</Button>
				</div>
			</Field.Set>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={saving}
				>Cancel</Button
			>
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
				<Field.Field>
					<Field.Label for="edit-name">Name</Field.Label>
					<Input
						id="edit-name"
						autofocus
						bind:value={editingModifier.name}
						placeholder="Modifier name"
						class="max-w-sm"
					/>
				</Field.Field>

				<div class="flex items-center gap-6">
					<div class="flex items-center gap-2">
						<Switch id="edit-required" bind:checked={editingModifier.required} />
						<Field.Label for="edit-required">Required</Field.Label>
					</div>
					<div class="flex items-center gap-2">
						<Switch id="edit-multi" bind:checked={editingModifier.multiSelect} />
						<Field.Label for="edit-multi">Allow multiple</Field.Label>
					</div>
				</div>

				<Field.Set>
					<Field.Legend>Options</Field.Legend>
					<div class="flex flex-col gap-2">
						{#each editingModifier.options as option, i}
							<div class="flex items-center gap-2">
								<Input bind:value={option.name} placeholder="Option name" class="min-w-0 flex-1" />
								<div class="relative w-full max-w-[8rem] shrink-0">
									<span class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
										>{CURRENCY_CONFIG[currency]?.symbol || '$'}</span
									>
									<Input type="number" step="0.01" min="0" bind:value={option.price} class="pl-6" />
								</div>
								{#if editingModifier.options.length > 1}
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Remove option"
										onclick={() => removeEditOption(i)}
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						{/each}
						<Button variant="outline" size="sm" class="w-fit" onclick={addEditOption}>
							<IconPlus class="mr-2 h-4 w-4" />
							Add Option
						</Button>
					</div>
				</Field.Set>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingModifier = null)} disabled={saving}
					>Cancel</Button
				>
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
