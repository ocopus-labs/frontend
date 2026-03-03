<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import NavUser from '$lib/components/global/nav-user.svelte';
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';
	import type { PlatformStats } from '$lib/api/admin';

	import Shield from '@lucide/svelte/icons/shield';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Users from '@lucide/svelte/icons/users';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import PackageIcon from '@lucide/svelte/icons/package';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import WebhookIcon from '@lucide/svelte/icons/webhook';
	import Activity from '@lucide/svelte/icons/activity';
	import Settings from '@lucide/svelte/icons/settings';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		stats = null,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { stats?: PlatformStats | null } = $props();

	const navItems = [
		{
			title: 'Overview',
			url: '/admin',
			icon: LayoutDashboard
		},
		{
			title: 'Businesses',
			url: '/admin/businesses',
			icon: Building2,
			badge: stats?.totalBusinesses
		},
		{
			title: 'Users',
			url: '/admin/users',
			icon: Users,
			badge: stats?.totalUsers
		},
		{
			title: 'Analytics',
			url: '/admin/analytics',
			icon: BarChart3
		},
		{
			title: 'Subscriptions',
			url: '/admin/subscriptions',
			icon: CreditCard,
			badge: stats?.subscriptionStats?.active
		},
		{
			title: 'Plans',
			url: '/admin/plans',
			icon: PackageIcon
		},
		{
			title: 'Announcements',
			url: '/admin/announcements',
			icon: Megaphone
		}
	];

	const systemItems = [
		{
			title: 'Audit Logs',
			url: '/admin/audit-logs',
			icon: ScrollText
		},
		{
			title: 'Webhooks',
			url: '/admin/webhooks',
			icon: WebhookIcon
		},
		{
			title: 'Monitoring',
			url: '/admin/monitoring',
			icon: Activity
		},
		{
			title: 'Settings',
			url: '/admin/settings',
			icon: Settings
		}
	];

	// Check if current path matches
	function isActive(url: string): boolean {
		if (url === '/admin') {
			return $page.url.pathname === '/admin';
		}
		return $page.url.pathname.startsWith(url);
	}
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="cursor-default hover:bg-transparent">
					<div
						class="flex aspect-square size-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground"
					>
						<Shield class="size-4" />
					</div>
					<div class="grid flex-1 text-left text-sm leading-tight">
						<span class="truncate font-semibold">Super Admin</span>
						<span class="truncate text-xs text-muted-foreground">Platform Control</span>
					</div>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<!-- Main Navigation -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
			<Sidebar.Menu>
				{#each navItems as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton tooltipContent={item.title} isActive={isActive(item.url)}>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon />
									<span>{item.title}</span>
									{#if item.badge}
										<span
											class="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
										>
											{item.badge}
										</span>
									{/if}
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.Group>

		<!-- System Navigation -->
		<Sidebar.Group>
			<Sidebar.GroupLabel>System</Sidebar.GroupLabel>
			<Sidebar.Menu>
				{#each systemItems as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton tooltipContent={item.title} isActive={isActive(item.url)}>
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

		<!-- Back to Dashboard -->
		<Sidebar.Group>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent="Back to Dashboard">
						{#snippet child({ props })}
							<a href="/dashboard" {...props}>
								<ArrowLeft />
								<span>Back to Dashboard</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<NavUser hideUpgrade />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
