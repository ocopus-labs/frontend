<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import type { MenuCategory, MenuGroup, POSTab } from '$lib/types/menu';

	export interface ResolvedTab {
		id: string;
		type: 'all' | 'favorites' | 'category' | 'group';
		referenceId: string;
		name: string;
		count: number;
	}

	interface Props {
		categories: MenuCategory[];
		groups: MenuGroup[];
		posLayout: { tabs: POSTab[] } | null;
		itemCounts: Map<string, number>;
		totalItems: number;
		favoriteCount: number;
		selectedTabId: string;
		onTabSelect: (tab: ResolvedTab) => void;
	}

	let {
		categories,
		groups,
		posLayout,
		itemCounts,
		totalItems,
		favoriteCount,
		selectedTabId,
		onTabSelect
	}: Props = $props();

	const resolvedTabs = $derived(buildTabs());

	function buildTabs(): ResolvedTab[] {
		const tabs: ResolvedTab[] = [];

		// Always first: All Items
		tabs.push({ id: 'all', type: 'all', referenceId: 'all', name: 'All Items', count: totalItems });

		// Favorites tab (only if user has favorites)
		if (favoriteCount > 0) {
			tabs.push({
				id: 'favorites',
				type: 'favorites',
				referenceId: 'favorites',
				name: 'Favorites',
				count: favoriteCount
			});
		}

		if (posLayout && posLayout.tabs.length > 0) {
			// Use saved layout order
			for (const tab of posLayout.tabs.sort((a, b) => a.sortOrder - b.sortOrder)) {
				if (tab.type === 'category') {
					const cat = categories.find((c) => c.id === tab.referenceId);
					if (cat && cat.isActive) {
						tabs.push({
							id: tab.id,
							type: 'category',
							referenceId: cat.id,
							name: cat.name,
							count: itemCounts.get(cat.id) ?? 0
						});
					}
				} else if (tab.type === 'group') {
					const grp = groups.find((g) => g.id === tab.referenceId);
					if (grp && grp.isActive) {
						tabs.push({
							id: tab.id,
							type: 'group',
							referenceId: grp.id,
							name: grp.name,
							count: grp.itemIds.length
						});
					}
				}
			}
		} else {
			// Default: show all active categories sorted by sortOrder
			for (const cat of categories
				.filter((c) => c.isActive)
				.sort((a, b) => a.sortOrder - b.sortOrder)) {
				tabs.push({
					id: `cat-${cat.id}`,
					type: 'category',
					referenceId: cat.id,
					name: cat.name,
					count: itemCounts.get(cat.id) ?? 0
				});
			}
			// Then active groups
			for (const grp of groups
				.filter((g) => g.isActive)
				.sort((a, b) => a.sortOrder - b.sortOrder)) {
				tabs.push({
					id: `grp-${grp.id}`,
					type: 'group',
					referenceId: grp.id,
					name: grp.name,
					count: grp.itemIds.length
				});
			}
		}

		return tabs;
	}
</script>

<!--
	Single-line horizontal scroller. `flex-wrap` used to be here alongside
	`overflow-x-auto` — wrap won, so the row never scrolled and instead stacked
	3-4 deep on phones, eating the menu grid. Snap + edge fade signal scrollability.
-->
<div
	class="no-scrollbar flex max-w-full snap-x snap-mandatory gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] pb-1 md:gap-2 md:[mask-image:none] md:pb-2"
>
	{#each resolvedTabs as tab (tab.id)}
		<Button
			variant={selectedTabId === tab.id ? 'default' : 'outline'}
			size="sm"
			class="h-8 shrink-0 snap-start px-2.5 text-xs whitespace-nowrap md:h-9 md:px-4 md:text-sm"
			onclick={() => onTabSelect(tab)}
		>
			<span class="truncate">{tab.name}</span>
			<Badge
				variant="secondary"
				class="ml-1.5 h-4 px-1 text-[10px] md:ml-2 md:h-5 md:px-1.5 md:text-xs"
			>
				{tab.count}
			</Badge>
		</Button>
	{/each}
</div>
