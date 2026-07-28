<script lang="ts">
	import { page } from '$app/stores';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import GlobalSearch from '$lib/components/search/global-search.svelte';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import ChefHatIcon from '@lucide/svelte/icons/chef-hat';
	import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import TableIcon from '@lucide/svelte/icons/table';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import ContactIcon from '@lucide/svelte/icons/contact';
	import StarIcon from '@lucide/svelte/icons/star';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';
	import ScissorsIcon from '@lucide/svelte/icons/scissors';
	import { catalogFeatureSlug, catalogVocabulary, isServiceVertical } from '$lib/utils/catalog';
	import PackageIcon from '@lucide/svelte/icons/package';
	import TicketPercentIcon from '@lucide/svelte/icons/ticket-percent';
	import LandmarkIcon from '@lucide/svelte/icons/landmark';
	import DollarSignIcon from '@lucide/svelte/icons/dollar-sign';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import UsersIcon from '@lucide/svelte/icons/users';
	import SettingsIcon from '@lucide/svelte/icons/settings';
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

	// Everything that doesn't fit the 5-slot bar, grouped so the drawer reads as a
	// launcher instead of one undifferentiated wall of tiles. Roles/features mirror
	// `sidebar-data.ts` so the drawer never offers a destination the sidebar hides.
	interface MoreItem {
		label: string;
		icon: Component;
		href: string;
		feature?: string;
		roles?: string[];
	}

	const MANAGE_ROLES = ['owner', 'restaurant_owner', 'manager'];
	const OWNER_ROLES = ['owner', 'restaurant_owner'];

	const moreGroups: { label: string; items: MoreItem[] }[] = [
		{
			label: 'Operations',
			items: [
				{ label: 'Tables', icon: TableIcon, href: '/tables/layout', feature: 'tables' },
				{ label: 'KDS', icon: MonitorIcon, href: '/kitchen-display/orders', feature: 'kds' },
				{ label: 'Customers', icon: ContactIcon, href: '/customers' },
				{
					label: 'Reviews',
					icon: StarIcon,
					href: '/reviews',
					feature: 'orders',
					roles: MANAGE_ROLES
				}
			]
		},
		{
			label: 'Catalog',
			items: [
				{
					label: 'Menu',
					icon: UtensilsIcon,
					href: '/menu/items',
					feature: 'menu',
					roles: MANAGE_ROLES
				},
				{ label: 'Inventory', icon: PackageIcon, href: '/inventory/stock', feature: 'inventory' },
				{
					label: 'Coupons',
					icon: TicketPercentIcon,
					href: '/coupons',
					feature: 'orders',
					roles: MANAGE_ROLES
				}
			]
		},
		{
			label: 'Money',
			items: [
				{ label: 'Cash Drawer', icon: LandmarkIcon, href: '/cash-drawer' },
				{ label: 'Expenses', icon: DollarSignIcon, href: '/expenses/daily', feature: 'expenses' },
				{
					label: 'Analytics',
					icon: TrendingUpIcon,
					href: '/dashboard/analytics',
					roles: MANAGE_ROLES
				},
				{ label: 'Reports', icon: FileTextIcon, href: '/dashboard/reports', roles: MANAGE_ROLES }
			]
		},
		{
			label: 'Manage',
			items: [
				{ label: 'Team', icon: UsersIcon, href: '/team', feature: 'team', roles: MANAGE_ROLES },
				{ label: 'Settings', icon: SettingsIcon, href: '/settings', roles: OWNER_ROLES }
			]
		}
	];

	// Same rewrite the sidebar does (`dashboard-sidebar.svelte`) — the drawer
	// mirrors it, so a salon that gets "Services" in the sidebar must not get
	// "Menu" here. Beyond the label, `feature` decides visibility: a salon can
	// enable `services` and never `menu`, so the unrewritten entry is filtered
	// out below and mobile loses the catalog entirely.
	const businessType = $derived($page.params.business || 'restaurant');
	const catalogIsService = $derived(isServiceVertical(businessType));

	function withCatalogVocabulary(item: MoreItem): MoreItem {
		if (item.feature !== 'menu') return item;
		return {
			...item,
			label: catalogVocabulary(businessType).section,
			// `/services` is a redirect stub, not a section — there is no
			// `/services/items`. Point at the stub and let it land on the shared
			// page rather than rewriting the deep link into a 404.
			href: catalogIsService ? '/services' : item.href,
			icon: catalogIsService
				? ScissorsIcon
				: businessType === 'retail' || businessType === 'gym'
					? ShoppingBagIcon
					: item.icon,
			feature: catalogFeatureSlug(businessType)
		};
	}

	const visibleGroups = $derived(
		moreGroups
			.map((group) => ({
				label: group.label,
				items: group.items
					.map(withCatalogVocabulary)
					.filter(
						(item) =>
							(!item.feature || enabledFeatures.includes(item.feature)) &&
							(!item.roles || item.roles.includes(userRole))
					)
			}))
			.filter((group) => group.items.length > 0)
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
						aria-expanded={moreOpen}
						aria-label="More navigation"
						class="flex flex-col items-center gap-1 px-3 py-2 transition-transform active:scale-95
							{moreOpen ? 'text-primary' : 'text-muted-foreground'}"
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

	<Drawer.Root bind:open={moreOpen}>
		<Drawer.Content class="max-h-[85vh]">
			<Drawer.Header class="gap-0.5 px-5 pt-3 pb-3 text-left md:text-left">
				<Drawer.Title class="text-base font-semibold">More</Drawer.Title>
				<Drawer.Description class="text-xs text-muted-foreground">
					Everything else in this business
				</Drawer.Description>
			</Drawer.Header>

			<nav class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-1">
				{#each visibleGroups as group}
					<h3
						class="px-1 pt-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
					>
						{group.label}
					</h3>
					<ul class="grid grid-cols-4 gap-2">
						{#each group.items as item}
							{@const active = isActive(item.href)}
							<li>
								<a
									href="{businessBase}{item.href}"
									onclick={() => (moreOpen = false)}
									aria-current={active ? 'page' : undefined}
									class="flex h-full flex-col items-center gap-2 rounded-xl border px-1 py-3 text-center transition-all duration-150 active:scale-95
										{active ? 'border-primary/30 bg-primary/10' : 'border-transparent bg-muted/60 hover:bg-accent'}"
								>
									<span
										class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm
											{active ? 'text-primary' : 'text-muted-foreground'}"
									>
										<item.icon class="h-[18px] w-[18px]" />
									</span>
									<span
										class="text-[11px] leading-tight font-medium {active
											? 'text-primary'
											: 'text-foreground'}"
									>
										{item.label}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/each}
			</nav>

			<Drawer.Footer
				class="px-4 pt-3 pb-4"
				style="padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));"
			>
				<Button variant="outline" class="w-full justify-center gap-2" onclick={openSidebar}>
					<PanelLeftIcon class="h-4 w-4" />
					Switch business / Account
				</Button>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
{/if}
