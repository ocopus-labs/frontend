<script lang="ts">
	import { page } from '$app/stores';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import GlobalSearch from '$lib/components/search/global-search.svelte';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import ChefHatIcon from '@lucide/svelte/icons/chef-hat';
	import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import type { Component } from 'svelte';

	let {
		userRole = 'staff',
		enabledFeatures = [] as string[],
		businessBase = '',
		businessId = ''
	}: {
		userRole?: string;
		enabledFeatures?: string[];
		businessBase?: string;
		businessId?: string;
	} = $props();

	const isMobile = new IsMobile();
	const sidebar = useSidebar();

	interface BottomNavItem {
		label: string;
		icon: Component;
		href: string;
		badge?: number;
		action?: 'drawer' | 'search';
		feature?: string;
	}

	const isManagerOrOwner = $derived(['owner', 'restaurant_owner', 'manager'].includes(userRole));

	// Search and More are actions (not links). Tables/Team live in the More drawer to
	// keep the primary bar at 5 slots — the ergonomic max for a thumb-reachable POS bar.
	const staffTabs: BottomNavItem[] = [
		{ label: 'POS', icon: ShoppingBagIcon, href: '/pos/new-order' },
		{ label: 'Orders', icon: ClipboardListIcon, href: '/orders/pending' },
		{ label: 'Search', icon: SearchIcon, href: '', action: 'search' },
		{ label: 'KDS', icon: ChefHatIcon, href: '/kitchen-display/orders', feature: 'kds' },
		{ label: 'More', icon: MenuIcon, href: '', action: 'drawer' }
	];

	const managerTabs: BottomNavItem[] = [
		{ label: 'Dashboard', icon: BarChart3Icon, href: '/dashboard' },
		{ label: 'POS', icon: ShoppingBagIcon, href: '/pos/new-order' },
		{ label: 'Orders', icon: ClipboardListIcon, href: '/orders/pending' },
		{ label: 'Search', icon: SearchIcon, href: '', action: 'search' },
		{ label: 'More', icon: MenuIcon, href: '', action: 'drawer' }
	];

	const tabs = $derived(
		(isManagerOrOwner ? managerTabs : staffTabs).filter(
			(tab) => !tab.feature || enabledFeatures.includes(tab.feature)
		)
	);

	let moreOpen = $state(false);
	let searchOpen = $state(false);

	const pathname = $derived($page.url.pathname);

	// The POS order screen is a full-screen work surface with its own bottom-anchored
	// cart bar and its own mobile header (hamburger -> this same sidebar sheet).
	// Showing the generic nav here occludes the checkout button and burns ~64px of
	// an already-tight viewport. Scoped to new-order only — /pos/transactions is a
	// browsing screen where the nav still earns its space.
	const hiddenOnRoute = $derived(pathname.includes('/pos/new-order'));

	function isActive(href: string): boolean {
		if (!href) return false;
		const fullPath = businessBase + href;
		return pathname.startsWith(fullPath);
	}

	function openSidebar() {
		moreOpen = false;
		sidebar.setOpenMobile(true);
	}
</script>

{#if isMobile.current && !hiddenOnRoute}
	<nav
		class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
		style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	>
		<div class="flex h-16 items-center justify-around">
			{#each tabs as tab}
				{#if tab.action === 'drawer'}
					<button
						onclick={() => (moreOpen = true)}
						class="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground transition-transform active:scale-95"
					>
						<tab.icon class="h-5 w-5" />
						<span class="text-[10px] font-medium">{tab.label}</span>
					</button>
				{:else if tab.action === 'search'}
					<button
						onclick={() => (searchOpen = true)}
						class="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground transition-transform active:scale-95"
						aria-label="Open search"
					>
						<tab.icon class="h-5 w-5" />
						<span class="text-[10px] font-medium">{tab.label}</span>
					</button>
				{:else}
					<a
						href="{businessBase}{tab.href}"
						class="relative flex flex-col items-center gap-1 px-3 py-2 transition-transform active:scale-95
							{isActive(tab.href) ? 'text-primary' : 'text-muted-foreground'}"
					>
						<tab.icon class="h-5 w-5" />
						{#if tab.badge}
							<span
								class="absolute -top-1 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground"
							>
								{tab.badge > 99 ? '99+' : tab.badge}
							</span>
						{/if}
						<span class="text-[10px] font-medium">{tab.label}</span>
					</a>
				{/if}
			{/each}
		</div>
	</nav>

	{#if businessId}
		<GlobalSearch {businessId} basePath={businessBase} hideTrigger bind:open={searchOpen} />
	{/if}

	<Sheet.Root bind:open={moreOpen}>
		<Sheet.Content side="bottom" class="max-h-[70vh]">
			<Sheet.Header>
				<Sheet.Title>Navigation</Sheet.Title>
			</Sheet.Header>
			<nav class="grid grid-cols-3 gap-3 p-4">
				{#each [{ label: 'Menu', href: '/menu/items', feature: 'menu' }, { label: 'Inventory', href: '/inventory/stock', feature: 'inventory' }, { label: 'Customers', href: '/customers' }, { label: 'Expenses', href: '/expenses/daily', feature: 'expenses' }, { label: 'Cash Drawer', href: '/cash-drawer' }, { label: 'Tables', href: '/tables/layout', feature: 'tables' }, { label: 'Team', href: '/team', feature: 'team' }, { label: 'KDS', href: '/kitchen-display/orders', feature: 'kds' }, { label: 'Analytics', href: '/dashboard/analytics' }, { label: 'Settings', href: '/settings' }].filter((item) => !item.feature || enabledFeatures.includes(item.feature)) as item}
					<a
						href="{businessBase}{item.href}"
						onclick={() => (moreOpen = false)}
						class="flex items-center justify-center rounded-lg border border-border p-3 text-sm font-medium transition-transform hover:bg-accent active:scale-95
							{pathname.startsWith(businessBase + item.href) ? 'bg-accent text-accent-foreground' : ''}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
			<div class="px-4 pb-4">
				<button
					onclick={openSidebar}
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-border p-3 text-sm font-medium transition-transform hover:bg-accent active:scale-95"
				>
					<PanelLeftIcon class="h-4 w-4" />
					Switch business / Account
				</button>
			</div>
		</Sheet.Content>
	</Sheet.Root>
{/if}
