<script lang="ts">
	import type { PageData } from './$types';
	import type { MenuGroup, MenuItem } from '$lib/types/menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import * as Field from '$lib/components/ui/field';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconSearch,
	} from '@tabler/icons-svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { createGroup, updateGroup, deleteGroup as deleteGroupApi } from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { invalidate } from '$app/navigation';
	import { clearApiCache } from '$lib/api/client';
	import { invalidateMenuCache } from '$lib/stores/pos-cache';

	let { data }: { data: PageData } = $props();

	const businessId = data.businessId;

	function invalidateMenuData() {
		clearApiCache('/menu');
		invalidateMenuCache();
		invalidate('app:menu');
	}

	let groups = $state<MenuGroup[]>(data.groups || []);
	let allItems = $state<MenuItem[]>(data.menuItems || []);

	$effect(() => { groups = data.groups || []; });
	$effect(() => { allItems = data.menuItems || []; });

	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let editingGroup = $state<MenuGroup | null>(null);
	let deleteDialogOpen = $state(false);
	let deleteTarget = $state<MenuGroup | null>(null);
	let isSubmitting = $state(false);

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formColor = $state('');
	let formItemIds = $state<string[]>([]);
	let formIsActive = $state(true);
	let itemSearchQuery = $state('');

	const filteredGroups = $derived(
		groups.filter(g =>
			g.name.toLowerCase().includes(searchQuery.toLowerCase())
		).sort((a, b) => a.sortOrder - b.sortOrder)
	);

	const filteredAvailableItems = $derived(
		allItems.filter(item =>
			item.isAvailable &&
			item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
		)
	);

	function resetForm() {
		formName = '';
		formDescription = '';
		formColor = '';
		formItemIds = [];
		formIsActive = true;
		itemSearchQuery = '';
	}

	function openAdd() {
		resetForm();
		editingGroup = null;
		showAddDialog = true;
	}

	function openEdit(group: MenuGroup) {
		formName = group.name;
		formDescription = group.description || '';
		formColor = group.color || '';
		formItemIds = [...group.itemIds];
		formIsActive = group.isActive;
		editingGroup = group;
		showAddDialog = true;
	}

	function toggleItem(itemId: string) {
		if (formItemIds.includes(itemId)) {
			formItemIds = formItemIds.filter(id => id !== itemId);
		} else {
			formItemIds = [...formItemIds, itemId];
		}
	}

	function getItemName(itemId: string): string {
		return allItems.find(i => i.id === itemId)?.name || itemId;
	}

	async function handleSubmit() {
		if (!formName.trim()) {
			toast.error('Group name is required');
			return;
		}
		isSubmitting = true;
		try {
			const payload = {
				name: formName.trim(),
				description: formDescription.trim() || undefined,
				color: formColor.trim() || undefined,
				itemIds: formItemIds,
				isActive: formIsActive,
			};

			if (editingGroup) {
				await updateGroup(businessId, editingGroup.id, payload);
				toast.success('Group updated');
			} else {
				await createGroup(businessId, payload);
				toast.success('Group created');
			}
			showAddDialog = false;
			invalidateMenuData();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		isSubmitting = true;
		try {
			await deleteGroupApi(businessId, deleteTarget.id);
			toast.success('Group deleted');
			deleteDialogOpen = false;
			deleteTarget = null;
			invalidateMenuData();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSubmitting = false;
		}
	}
</script>

<ConfirmDialog
	open={deleteDialogOpen}
	title="Delete Group"
	description="This will remove this group from the POS tab bar. Items in this group are not affected."
	onConfirm={handleDelete}
	onCancel={() => { deleteDialogOpen = false; deleteTarget = null; }}
/>

<PageShell
	back
	title="Groups"
	description="Create custom item collections for the POS tab bar"
>
	<div>
		<SettingsSection
			title="Item groups"
			description="Each group shows up as its own tab in the POS. Items can belong to more than one group."
		>
			{#snippet action()}
				<Button onclick={openAdd}>
					<IconPlus class="mr-2 h-4 w-4" /> New Group
				</Button>
			{/snippet}

			<div class="relative max-w-sm">
				<IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input placeholder="Search groups..." bind:value={searchQuery} class="pl-9" />
			</div>

			{#if filteredGroups.length === 0}
				<EmptyState
					type="empty"
					title="No groups"
					description="Create groups to organize menu items into custom POS tabs."
				/>
			{:else}
				<div class="divide-y rounded-lg border">
					{#each filteredGroups as group (group.id)}
						<div class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40">
							<div class="min-w-0 space-y-1">
								<div class="flex flex-wrap items-center gap-2">
									{#if group.color}
										<span
											class="h-3 w-3 shrink-0 rounded-full"
											style="background-color: {group.color}"
										></span>
									{/if}
									<span class="text-sm font-medium">{group.name}</span>
									<Badge variant={group.isActive ? 'default' : 'secondary'}>
										{group.isActive ? 'Active' : 'Inactive'}
									</Badge>
								</div>

								{#if group.description}
									<p class="text-sm text-muted-foreground">{group.description}</p>
								{/if}

								<p class="text-xs text-muted-foreground">
									{group.itemIds.length} item{group.itemIds.length !== 1 ? 's' : ''}
								</p>

								{#if group.itemIds.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each group.itemIds.slice(0, 5) as itemId}
											<Badge variant="outline" class="text-xs">{getItemName(itemId)}</Badge>
										{/each}
										{#if group.itemIds.length > 5}
											<Badge variant="outline" class="text-xs">+{group.itemIds.length - 5} more</Badge>
										{/if}
									</div>
								{/if}
							</div>

							<div class="flex shrink-0 items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									aria-label="Edit {group.name}"
									onclick={() => openEdit(group)}
								>
									<IconPencil />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Delete {group.name}"
									onclick={() => { deleteTarget = group; deleteDialogOpen = true; }}
								>
									<IconTrash />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</SettingsSection>
	</div>
</PageShell>

<!-- Create/Edit Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="max-w-lg max-h-[85vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{editingGroup ? 'Edit Group' : 'New Group'}</Dialog.Title>
			<Dialog.Description>
				{editingGroup ? 'Update this group' : 'Create a custom item collection for the POS tab bar'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 py-4">
			<Field.Field>
				<Field.Label for="group-name">Name</Field.Label>
				<Input
					id="group-name"
					bind:value={formName}
					placeholder="e.g. Bestsellers, Morning Menu"
					class="max-w-sm"
				/>
			</Field.Field>

			<Field.Field>
				<Field.Label for="group-desc">Description</Field.Label>
				<Textarea id="group-desc" bind:value={formDescription} rows={2} placeholder="Optional description" />
			</Field.Field>

			<Field.Field>
				<Field.Label for="group-color">Tab Color</Field.Label>
				<div class="flex items-center gap-2">
					<Input
						id="group-color"
						type="color"
						bind:value={formColor}
						aria-label="Pick tab colour"
						class="h-8 w-10 cursor-pointer p-1"
					/>
					<Input bind:value={formColor} placeholder="#6366f1" class="max-w-[10rem]" />
				</div>
				<Field.Description>Used for this group's tab in the POS.</Field.Description>
			</Field.Field>

			<div class="flex items-center gap-2">
				<Switch id="group-active" checked={formIsActive} onCheckedChange={(v) => formIsActive = v} />
				<Label for="group-active" class="text-sm font-medium">
					{formIsActive ? 'Active — visible in POS' : 'Inactive — hidden from POS'}
				</Label>
			</div>

			<!-- Item Picker -->
			<Field.Field>
				<Field.Label for="group-item-search">Items ({formItemIds.length} selected)</Field.Label>
				<div class="relative">
					<IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="group-item-search"
						placeholder="Search items..."
						bind:value={itemSearchQuery}
						class="pl-9"
					/>
				</div>
				<div class="max-h-48 overflow-y-auto rounded-md border p-1">
					{#each filteredAvailableItems as item (item.id)}
						<div class="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40">
							<Checkbox
								id="group-item-{item.id}"
								checked={formItemIds.includes(item.id)}
								onCheckedChange={() => toggleItem(item.id)}
							/>
							<Label for="group-item-{item.id}" class="min-w-0 flex-1 cursor-pointer truncate font-normal">
								{item.name}
							</Label>
							<span class="ml-auto shrink-0 text-xs text-muted-foreground">{item.categoryId}</span>
						</div>
					{/each}
					{#if filteredAvailableItems.length === 0}
						<p class="p-2 text-center text-sm text-muted-foreground">No items found</p>
					{/if}
				</div>
			</Field.Field>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => showAddDialog = false}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{editingGroup ? 'Save Changes' : 'Create Group'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
