<script lang="ts">
	import type { PageData } from './$types';
	import type { MenuGroup, MenuItem } from '$lib/types/menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
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

<div class="flex flex-1 flex-col gap-4 p-4 md:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold">Groups</h1>
			<p class="text-muted-foreground">Create custom item collections for the POS tab bar</p>
		</div>
		<Button onclick={openAdd}>
			<IconPlus class="mr-2 h-4 w-4" /> New Group
		</Button>
	</div>

	<!-- Search -->
	<div class="relative max-w-sm">
		<IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input placeholder="Search groups..." bind:value={searchQuery} class="pl-9" />
	</div>

	<!-- Groups List -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each filteredGroups as group (group.id)}
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between">
						<div>
							<Card.Title class="flex items-center gap-2">
								{#if group.color}
									<span class="h-3 w-3 rounded-full" style="background-color: {group.color}"></span>
								{/if}
								{group.name}
							</Card.Title>
							{#if group.description}
								<Card.Description>{group.description}</Card.Description>
							{/if}
						</div>
						<Badge variant={group.isActive ? 'default' : 'secondary'}>
							{group.isActive ? 'Active' : 'Inactive'}
						</Badge>
					</div>
				</Card.Header>
				<Card.Content class="pb-3">
					<p class="text-sm text-muted-foreground">
						{group.itemIds.length} item{group.itemIds.length !== 1 ? 's' : ''}
					</p>
					{#if group.itemIds.length > 0}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each group.itemIds.slice(0, 5) as itemId}
								<Badge variant="outline" class="text-xs">{getItemName(itemId)}</Badge>
							{/each}
							{#if group.itemIds.length > 5}
								<Badge variant="outline" class="text-xs">+{group.itemIds.length - 5} more</Badge>
							{/if}
						</div>
					{/if}
				</Card.Content>
				<Card.Footer class="gap-2">
					<Button variant="outline" size="sm" onclick={() => openEdit(group)}>
						<IconPencil class="mr-1 h-3.5 w-3.5" /> Edit
					</Button>
					<Button variant="outline" size="sm" onclick={() => { deleteTarget = group; deleteDialogOpen = true; }}>
						<IconTrash class="mr-1 h-3.5 w-3.5" /> Delete
					</Button>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>

	{#if filteredGroups.length === 0}
		<EmptyState type="empty" title="No groups" description="Create groups to organize menu items into custom POS tabs." />
	{/if}
</div>

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
			<div>
				<label for="group-name" class="text-sm font-medium">Name</label>
				<Input id="group-name" bind:value={formName} placeholder="e.g. Bestsellers, Morning Menu" />
			</div>

			<div>
				<label for="group-desc" class="text-sm font-medium">Description</label>
				<Input id="group-desc" bind:value={formDescription} placeholder="Optional description" />
			</div>

			<div>
				<label for="group-color" class="text-sm font-medium">Tab Color</label>
				<div class="flex items-center gap-2">
					<input type="color" id="group-color" bind:value={formColor} class="h-8 w-8 rounded border cursor-pointer" />
					<Input bind:value={formColor} placeholder="#6366f1" class="flex-1" />
				</div>
			</div>

			<div class="flex items-center gap-2">
				<Switch id="group-active" checked={formIsActive} onCheckedChange={(v) => formIsActive = v} />
				<label for="group-active" class="text-sm font-medium">
					{formIsActive ? 'Active — visible in POS' : 'Inactive — hidden from POS'}
				</label>
			</div>

			<!-- Item Picker -->
			<div>
				<label class="text-sm font-medium">Items ({formItemIds.length} selected)</label>
				<div class="relative mt-1">
					<IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input placeholder="Search items..." bind:value={itemSearchQuery} class="pl-9" />
				</div>
				<div class="mt-2 max-h-48 overflow-y-auto rounded-md border p-1">
					{#each filteredAvailableItems as item (item.id)}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left"
							onclick={() => toggleItem(item.id)}
						>
							<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {formItemIds.includes(item.id) ? 'bg-primary border-primary text-primary-foreground' : ''}">
								{#if formItemIds.includes(item.id)}
									<svg class="h-3 w-3" viewBox="0 0 12 12"><path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
								{/if}
							</span>
							<span class="truncate">{item.name}</span>
							<span class="ml-auto text-xs text-muted-foreground">{item.categoryId}</span>
						</button>
					{/each}
					{#if filteredAvailableItems.length === 0}
						<p class="p-2 text-center text-sm text-muted-foreground">No items found</p>
					{/if}
				</div>
			</div>
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
