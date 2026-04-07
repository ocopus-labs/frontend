<script lang="ts">
	import { page } from '$app/stores';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import ChefHatIcon from '@lucide/svelte/icons/chef-hat';
	import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3';
	import UsersIcon from '@lucide/svelte/icons/users';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import type { Component } from 'svelte';

	let {
		userRole = 'staff',
		enabledFeatures = [] as string[],
		businessBase = ''
	}: {
		userRole?: string;
		enabledFeatures?: string[];
		businessBase?: string;
	} = $props();

	const isMobile = new IsMobile();

	interface BottomNavItem {
		label: string;
		icon: Component;
		href: string;
		badge?: number;
		action?: 'drawer';
		feature?: string;
	}

	const isManagerOrOwner = $derived(
		['owner', 'restaurant_owner', 'manager'].includes(userRole)
	);

	const staffTabs: BottomNavItem[] = [
		{ label: 'POS', icon: ShoppingBagIcon, href: '/pos/new-order' },
		{ label: 'Orders', icon: ClipboardListIcon, href: '/orders/pending' },
		{ label: 'Tables', icon: LayoutGridIcon, href: '/tables/layout', feature: 'tables' },
		{ label: 'KDS', icon: ChefHatIcon, href: '/kitchen-display/orders', feature: 'kds' },
		{ label: 'More', icon: MenuIcon, href: '', action: 'drawer' },
	];

	const managerTabs: BottomNavItem[] = [
		{ label: 'Dashboard', icon: BarChart3Icon, href: '/dashboard' },
		{ label: 'POS', icon: ShoppingBagIcon, href: '/pos/new-order' },
		{ label: 'Orders', icon: ClipboardListIcon, href: '/orders/pending' },
		{ label: 'Team', icon: UsersIcon, href: '/team', feature: 'team' },
		{ label: 'More', icon: MenuIcon, href: '', action: 'drawer' },
	];

	const tabs = $derived(
		(isManagerOrOwner ? managerTabs : staffTabs)
			.filter(tab => !tab.feature || enabledFeatures.includes(tab.feature))
	);

	let moreOpen = $state(false);

	const pathname = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		if (!href) return false;
		const fullPath = businessBase + href;
		return pathname.startsWith(fullPath);
	}
</script>

{#if isMobile.current}
	<nav
		class="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
		style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	>
		<div class="flex items-center justify-around h-16">
			{#each tabs as tab}
				{#if tab.action === 'drawer'}
					<button
						onclick={() => (moreOpen = true)}
						class="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground active:scale-95 transition-transform"
					>
						<tab.icon class="h-5 w-5" />
						<span class="text-[10px] font-medium">{tab.label}</span>
					</button>
				{:else}
					<a
						href="{businessBase}{tab.href}"
						class="flex flex-col items-center gap-1 px-3 py-2 relative active:scale-95 transition-transform
							{isActive(tab.href) ? 'text-primary' : 'text-muted-foreground'}"
					>
						<tab.icon class="h-5 w-5" />
						{#if tab.badge}
							<span
								class="absolute -top-1 right-0 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
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

	<Sheet.Root bind:open={moreOpen}>
		<Sheet.Content side="bottom" class="max-h-[70vh]">
			<Sheet.Header>
				<Sheet.Title>Navigation</Sheet.Title>
			</Sheet.Header>
			<nav class="grid grid-cols-3 gap-3 p-4">
				{#each [
					{ label: 'Menu', href: '/menu/items', feature: 'menu' },
					{ label: 'Inventory', href: '/inventory/stock', feature: 'inventory' },
					{ label: 'Customers', href: '/customers' },
					{ label: 'Expenses', href: '/expenses/daily', feature: 'expenses' },
					{ label: 'Cash Drawer', href: '/cash-drawer' },
					{ label: 'Tables', href: '/tables/layout', feature: 'tables' },
					{ label: 'KDS', href: '/kitchen-display/orders', feature: 'kds' },
					{ label: 'Analytics', href: '/dashboard/analytics' },
					{ label: 'Settings', href: '/settings' },
				].filter(item => !item.feature || enabledFeatures.includes(item.feature)) as item}
					<a
						href="{businessBase}{item.href}"
						onclick={() => (moreOpen = false)}
						class="flex items-center justify-center rounded-lg border border-border p-3 text-sm font-medium hover:bg-accent active:scale-95 transition-transform
							{pathname.startsWith(businessBase + item.href) ? 'bg-accent text-accent-foreground' : ''}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</Sheet.Content>
	</Sheet.Root>
{/if}
