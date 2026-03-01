<script lang="ts">
	import { APP_NAME } from '$lib/constants/config';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import NavUser from './nav-user.svelte';
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';
	import type { Business } from '$lib/api/types';

	import Store from '@lucide/svelte/icons/store';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Settings from '@lucide/svelte/icons/settings';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Bell from '@lucide/svelte/icons/bell';
	import Shield from '@lucide/svelte/icons/shield';
	import Receipt from '@lucide/svelte/icons/receipt';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		businesses = [],
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { businesses?: Business[] } = $props();

	const navItems = [
		{
			title: 'Overview',
			url: '/dashboard',
			icon: LayoutDashboard
		},
		{
			title: 'My Businesses',
			url: '/dashboard/businesses',
			icon: Building2
		},
		{
			title: 'Subscriptions',
			url: '/dashboard/subscriptions',
			icon: CreditCard
		},
		{
			title: 'Billing',
			url: '/dashboard/billing',
			icon: Receipt
		}
	];

	const settingsItems = [
		{
			title: 'Account Settings',
			url: '/dashboard/settings',
			icon: Settings
		},
		{
			title: 'Notifications',
			url: '/dashboard/notifications',
			icon: Bell
		},
		{
			title: 'Security',
			url: '/dashboard/security',
			icon: Shield
		}
	];

	// Check if current path matches
	function isActive(url: string): boolean {
		return $page.url.pathname === url;
	}
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="cursor-default hover:bg-transparent">
					<div
						class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
					>
						<Store class="size-4" />
					</div>
					<div class="grid flex-1 text-left text-sm leading-tight">
						<span class="truncate font-semibold">{APP_NAME}</span>
						<span class="truncate text-xs text-muted-foreground"
							>{businesses.length} business{businesses.length !== 1 ? 'es' : ''}</span
						>
					</div>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<!-- Main Navigation -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>Dashboard</Sidebar.GroupLabel>
			<Sidebar.Menu>
				{#each navItems as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent={item.title}
							isActive={isActive(item.url)}
						>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon />
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.Group>

		<!-- Settings Navigation -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
			<Sidebar.Menu>
				{#each settingsItems as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent={item.title}
							isActive={isActive(item.url)}
						>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon />
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
