<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { IconGripVertical } from '@tabler/icons-svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { MenuCategory, MenuGroup, POSTab } from '$lib/types/menu';
	import { savePOSLayout } from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { invalidateMenuCache } from '$lib/stores/pos-cache';
	import { clearApiCache } from '$lib/api/client';
	import { invalidate } from '$app/navigation';

	interface Props {
		open: boolean;
		businessId: string;
		categories: MenuCategory[];
		groups: MenuGroup[];
		currentTabs: POSTab[] | null;
	}

	let { open = $bindable(), businessId, categories, groups, currentTabs }: Props = $props();

	interface TabItem {
		id: string;
		type: 'category' | 'group';
		referenceId: string;
		name: string;
		visible: boolean;
		sortOrder: number;
	}

	let tabs = $state<TabItem[]>([]);
	let isSaving = $state(false);
	let dragIndex = $state<number | null>(null);

	// Initialize tabs when dialog opens
	$effect(() => {
		if (open) {
			tabs = buildTabList();
		}
	});

	function buildTabList(): TabItem[] {
		if (currentTabs && currentTabs.length > 0) {
			// Reconstruct from saved layout, adding any new categories/groups
			const result: TabItem[] = [];
			const seen = new Set<string>();

			for (const tab of currentTabs) {
				const name =
					tab.type === 'category'
						? categories.find((c) => c.id === tab.referenceId)?.name
						: groups.find((g) => g.id === tab.referenceId)?.name;
				if (!name) continue; // deleted reference
				seen.add(`${tab.type}:${tab.referenceId}`);
				result.push({
					id: tab.id,
					type: tab.type,
					referenceId: tab.referenceId,
					name,
					visible: true,
					sortOrder: tab.sortOrder
				});
			}

			// Add unseen categories
			for (const cat of categories.filter((c) => c.isActive)) {
				const key = `category:${cat.id}`;
				if (!seen.has(key)) {
					result.push({
						id: crypto.randomUUID(),
						type: 'category',
						referenceId: cat.id,
						name: cat.name,
						visible: false,
						sortOrder: result.length
					});
				}
			}

			// Add unseen groups
			for (const grp of groups.filter((g) => g.isActive)) {
				const key = `group:${grp.id}`;
				if (!seen.has(key)) {
					result.push({
						id: crypto.randomUUID(),
						type: 'group',
						referenceId: grp.id,
						name: grp.name,
						visible: false,
						sortOrder: result.length
					});
				}
			}

			return result;
		}

		// Default: all active categories, then groups
		const items: TabItem[] = [];
		for (const cat of categories
			.filter((c) => c.isActive)
			.sort((a, b) => a.sortOrder - b.sortOrder)) {
			items.push({
				id: crypto.randomUUID(),
				type: 'category',
				referenceId: cat.id,
				name: cat.name,
				visible: true,
				sortOrder: items.length
			});
		}
		for (const grp of groups.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder)) {
			items.push({
				id: crypto.randomUUID(),
				type: 'group',
				referenceId: grp.id,
				name: grp.name,
				visible: true,
				sortOrder: items.length
			});
		}
		return items;
	}

	function handleDragStart(index: number) {
		dragIndex = index;
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (dragIndex === null || dragIndex === index) return;

		const updated = [...tabs];
		const [moved] = updated.splice(dragIndex, 1);
		updated.splice(index, 0, moved);
		tabs = updated.map((t, i) => ({ ...t, sortOrder: i }));
		dragIndex = index;
	}

	function handleDragEnd() {
		dragIndex = null;
	}

	function toggleVisibility(index: number) {
		tabs = tabs.map((t, i) => (i === index ? { ...t, visible: !t.visible } : t));
	}

	async function handleSave() {
		isSaving = true;
		try {
			const visibleTabs = tabs
				.filter((t) => t.visible)
				.map((t, i) => ({
					id: t.id,
					type: t.type as 'category' | 'group',
					referenceId: t.referenceId,
					sortOrder: i
				}));

			await savePOSLayout(businessId, visibleTabs);
			clearApiCache('/menu');
			invalidateMenuCache();
			invalidate('app:menu');
			toast.success('Tab layout saved');
			open = false;
		} catch (err) {
			toast.error('Failed to save layout');
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[80vh] max-w-md flex-col overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Manage POS Tabs</Dialog.Title>
			<Dialog.Description>Drag to reorder. Toggle visibility.</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto py-2">
			{#each tabs as tab, index (tab.id)}
				<div
					class="flex items-center gap-2 rounded-md px-2 py-2 {dragIndex === index
						? 'bg-accent'
						: 'hover:bg-accent/50'} {!tab.visible ? 'opacity-50' : ''}"
					draggable="true"
					ondragstart={() => handleDragStart(index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragend={handleDragEnd}
					role="listitem"
				>
					<button
						class="cursor-grab text-muted-foreground active:cursor-grabbing"
						aria-label="Drag to reorder"
					>
						<IconGripVertical class="h-4 w-4" />
					</button>
					<span class="flex-1 text-sm font-medium">{tab.name}</span>
					<Badge variant="outline" class="text-[10px]">
						{tab.type === 'category' ? 'Category' : 'Group'}
					</Badge>
					<Switch
						checked={tab.visible}
						onCheckedChange={() => toggleVisibility(index)}
						class="scale-75"
					/>
				</div>
			{/each}
			{#if tabs.length === 0}
				<p class="p-4 text-center text-sm text-muted-foreground">
					No categories or groups available
				</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Save Layout
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
