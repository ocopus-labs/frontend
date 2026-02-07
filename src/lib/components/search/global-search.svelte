<script lang="ts">
	import CommandSearch from './command-search.svelte';
	import type { SearchGroup, SearchResult as CommandSearchResult } from './command-search.svelte';
	import { globalSearch, type SearchResult as ApiSearchResult } from '$lib/api/search';
	import { Button } from '$lib/components/ui/button';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ArmchairIcon from '@lucide/svelte/icons/armchair';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import PackageIcon from '@lucide/svelte/icons/package';

	let { businessId, basePath }: { businessId: string; basePath: string } = $props();

	let open = $state(false);
	let loading = $state(false);
	let groups = $state<SearchGroup[]>([]);
	let recentSearches = $state<string[]>(loadRecentSearches());

	const typeIcons: Record<string, any> = {
		order: ReceiptIcon,
		menu_item: UtensilsIcon,
		team_member: UsersIcon,
		table: ArmchairIcon,
		expense: WalletIcon,
		inventory: PackageIcon
	};

	const typeLabels: Record<string, string> = {
		order: 'Orders',
		menu_item: 'Menu Items',
		team_member: 'Team Members',
		table: 'Tables',
		expense: 'Expenses',
		inventory: 'Inventory'
	};

	function loadRecentSearches(): string[] {
		try {
			const stored = sessionStorage.getItem(`search-recent-${businessId}`);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	function saveRecentSearch(query: string) {
		const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
		recentSearches = updated;
		try {
			sessionStorage.setItem(`search-recent-${businessId}`, JSON.stringify(updated));
		} catch {
			// ignore storage errors
		}
	}

	function transformToGroups(apiResults: ApiSearchResult[]): SearchGroup[] {
		const grouped: Record<string, CommandSearchResult[]> = {};

		for (const result of apiResults) {
			const groupKey = result.type;
			if (!grouped[groupKey]) {
				grouped[groupKey] = [];
			}
			grouped[groupKey].push({
				id: result.id,
				title: result.title,
				description: [result.subtitle, result.status].filter(Boolean).join(' - '),
				icon: typeIcons[result.type],
				href: `${basePath}${result.url}`,
				category: typeLabels[result.type]
			});
		}

		return Object.entries(grouped).map(([key, results]) => ({
			heading: typeLabels[key] || key,
			results
		}));
	}

	async function handleSearch(query: string) {
		if (!query || query.length < 2) {
			groups = [];
			return;
		}

		loading = true;
		try {
			const response = await globalSearch(businessId, query);
			groups = transformToGroups(response.results);
			saveRecentSearch(query);
		} catch {
			groups = [];
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			groups = [];
		}
	}
</script>

<Button
	variant="outline"
	class="relative w-full justify-start text-sm text-muted-foreground sm:w-64"
	onclick={() => (open = true)}
	aria-label="Open search"
>
	<SearchIcon class="mr-2 h-4 w-4" />
	<span class="hidden sm:inline">Search...</span>
	<span class="sm:hidden">Search</span>
	<kbd
		class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline-block"
	>
		<span class="text-xs">&#8984;</span>K
	</kbd>
</Button>

<CommandSearch
	bind:open
	{loading}
	{groups}
	{recentSearches}
	placeholder="Search orders, menu, team, tables..."
	emptyMessage="No results found."
	onSearch={handleSearch}
	onOpenChange={handleOpenChange}
/>
