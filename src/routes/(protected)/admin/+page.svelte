<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { APP_NAME } from '$lib/constants/config';
	import type { PageData } from './$types';

	import {
		MetricRing,
		TrendBadge,
		LiveCounter,
		ActivityTimeline,
		StatusPill,
		QuickActionCard,
		EmptyState,
		type TimelineItem
	} from '$lib/components/data-display';

	import ActivityFeed from '$lib/components/admin/activity-feed.svelte';

	import Building2 from '@lucide/svelte/icons/building-2';
	import Users from '@lucide/svelte/icons/users';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Activity from '@lucide/svelte/icons/activity';
	import Settings from '@lucide/svelte/icons/settings';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Store from '@lucide/svelte/icons/store';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	let { data }: { data: PageData } = $props();
	const stats = data.stats;
	const activities = data.activities ?? [];

	$effect(() => {
		if ((data as any).statsError) {
			toast.error('Failed to load platform statistics. Some data may be unavailable.');
		}
		if ((data as any).activityFeedError) {
			toast.error('Failed to load activity feed.');
		}
	});

	// Transform recent businesses into timeline items
	const recentBusinessTimeline = $derived<TimelineItem[]>(
		stats?.recentBusinesses?.map((business: any) => ({
			id: business.id,
			title: business.name,
			description: business.type,
			timestamp: business.createdAt,
			iconColor: business.status === 'active' ? 'success' : 'warning',
			status: business.status === 'active' ? 'completed' : 'pending',
			meta: business.status
		})) ?? []
	);

	// Transform recent users into timeline items
	const recentUsersTimeline = $derived<TimelineItem[]>(
		stats?.recentUsers?.map((user: any) => ({
			id: user.id,
			title: user.name || 'Unnamed User',
			description: user.email,
			timestamp: user.createdAt,
			avatar: {
				src: user.image,
				fallback: (user.name || 'U').charAt(0).toUpperCase()
			},
			status: 'completed'
		})) ?? []
	);

	// Calculate subscription health
	const subscriptionHealth = $derived(
		stats?.subscriptionStats
			? Math.round((stats.subscriptionStats.active / Math.max(stats.subscriptionStats.total, 1)) * 100)
			: 0
	);
</script>

<svelte:head>
	<title>Admin Dashboard | {APP_NAME}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Platform Overview</h1>
		<p class="text-muted-foreground">Welcome to the super admin dashboard</p>
	</div>

	{#if stats}
		<!-- Key Metrics -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Businesses</Card.Title>
					<Building2 class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={stats.totalBusinesses} />
					</div>
					<div class="mt-1 flex items-center gap-2">
						<TrendBadge
							value={stats.totalBusinesses}
							previousValue={stats.totalBusinesses - stats.growthMetrics.businessesThisMonth}
							format="value"
						/>
						<span class="text-xs text-muted-foreground">this month</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Users</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={stats.totalUsers} />
					</div>
					<div class="mt-1 flex items-center gap-2">
						<TrendBadge
							value={stats.totalUsers}
							previousValue={stats.totalUsers - stats.growthMetrics.usersThisMonth}
							format="value"
						/>
						<span class="text-xs text-muted-foreground">this month</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Orders</Card.Title>
					<ShoppingCart class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={stats.totalOrders} format="compact" />
					</div>
					<div class="mt-1 flex items-center gap-2">
						<TrendBadge
							value={stats.totalOrders}
							previousValue={stats.totalOrders - stats.growthMetrics.ordersThisMonth}
							format="value"
						/>
						<span class="text-xs text-muted-foreground">this month</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Revenue</Card.Title>
					<DollarSign class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={stats.totalRevenue} format="currency" currency="USD" />
					</div>
					<div class="mt-1 flex items-center gap-2">
						<TrendBadge
							value={stats.totalRevenue}
							previousValue={stats.totalRevenue - stats.growthMetrics.revenueThisMonth}
						/>
						<span class="text-xs text-muted-foreground">this month</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Quick Actions -->
		<div class="grid gap-4 md:grid-cols-4">
			<QuickActionCard
				title="Manage Users"
				description="View and manage platform users"
				icon={Users}
				href="/admin/users"
				variant="default"
				size="sm"
			/>
			<QuickActionCard
				title="Manage Businesses"
				description="View and manage businesses"
				icon={Store}
				href="/admin/businesses"
				variant="default"
				size="sm"
			/>
			<QuickActionCard
				title="Analytics"
				description="Platform analytics & reports"
				icon={BarChart3}
				href="/admin/analytics"
				variant="default"
				size="sm"
			/>
			<QuickActionCard
				title="Settings"
				description="Platform configuration"
				icon={Settings}
				href="/admin/settings"
				variant="default"
				size="sm"
			/>
		</div>

		<!-- Secondary Stats with Visual Elements -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<!-- Businesses by Type -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Businesses by Type</Card.Title>
					<Card.Description>Distribution of business types</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each Object.entries(stats.businessesByType) as [type, count]}
							{@const percentage = Math.round((Number(count) / stats.totalBusinesses) * 100)}
							<div class="space-y-1">
								<div class="flex items-center justify-between text-sm">
									<span class="capitalize">{type}</span>
									<div class="flex items-center gap-2">
										<span class="text-muted-foreground">{count}</span>
										<Badge variant="secondary" class="text-xs">{percentage}%</Badge>
									</div>
								</div>
								<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										class="h-full bg-primary transition-all duration-500"
										style="width: {percentage}%"
									></div>
								</div>
							</div>
						{/each}
						{#if Object.keys(stats.businessesByType).length === 0}
							<p class="text-sm text-muted-foreground">No businesses yet</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Businesses by Status -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Businesses by Status</Card.Title>
					<Card.Description>Active vs inactive businesses</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each Object.entries(stats.businessesByStatus) as [status, count]}
							<div class="flex items-center justify-between">
								<StatusPill
									label={status}
									status={status === 'active' ? 'success' : status === 'suspended' ? 'error' : 'warning'}
								/>
								<span class="font-semibold">{count}</span>
							</div>
						{/each}
						{#if Object.keys(stats.businessesByStatus).length === 0}
							<p class="text-sm text-muted-foreground">No businesses yet</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Subscription Stats with Ring -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Subscription Health</Card.Title>
					<Card.Description>Active subscription rate</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-6">
						<MetricRing
							value={subscriptionHealth}
							max={100}
							size="lg"
							color={subscriptionHealth > 80 ? 'success' : subscriptionHealth > 50 ? 'warning' : 'destructive'}
							label="Active"
						/>
						<div class="flex-1 space-y-2">
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Total</span>
								<span class="font-medium">{stats.subscriptionStats.total}</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Active</span>
								<span class="font-medium text-green-600">{stats.subscriptionStats.active}</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Canceled</span>
								<span class="font-medium text-red-600">{stats.subscriptionStats.canceled}</span>
							</div>
						</div>
					</div>
					{#if Object.keys(stats.subscriptionStats.byPlan).length > 0}
						<div class="mt-4 border-t pt-4">
							<p class="mb-2 text-xs font-medium text-muted-foreground">By Plan</p>
							<div class="flex flex-wrap gap-2">
								{#each Object.entries(stats.subscriptionStats.byPlan) as [plan, count]}
									<Badge variant="outline" class="gap-1">
										{plan}
										<span class="text-muted-foreground">{count}</span>
									</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Recent Activity & Activity Feed -->
		<div class="grid gap-4 lg:grid-cols-3">
			<!-- Left column: Recent Businesses & Users -->
			<div class="space-y-4 lg:col-span-2">
				<div class="grid gap-4 md:grid-cols-2">
					<!-- Recent Businesses -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Activity class="h-4 w-4" />
								Recent Businesses
							</Card.Title>
							<Card.Description>Latest businesses registered</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if recentBusinessTimeline.length > 0}
								<ActivityTimeline items={recentBusinessTimeline} compact />
							{:else}
								<EmptyState
									type="empty"
									title="No businesses yet"
									description="New businesses will appear here"
									size="sm"
								/>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Recent Users -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<TrendingUp class="h-4 w-4" />
								Recent Users
							</Card.Title>
							<Card.Description>Latest users registered</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if recentUsersTimeline.length > 0}
								<ActivityTimeline items={recentUsersTimeline} compact />
							{:else}
								<EmptyState
									type="empty"
									title="No users yet"
									description="New users will appear here"
									size="sm"
								/>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			</div>

			<!-- Right column: Activity Feed -->
			<Card.Root class="lg:col-span-1">
				<Card.Header class="flex flex-row items-center justify-between space-y-0">
					<div>
						<Card.Title class="flex items-center gap-2">
							<ScrollText class="h-4 w-4" />
							Recent Activity
						</Card.Title>
						<Card.Description>Latest platform-wide actions</Card.Description>
					</div>
					<a href="/admin/audit-logs">
						<Button variant="ghost" size="sm">View All</Button>
					</a>
				</Card.Header>
				<Card.Content>
					<ActivityFeed {activities} />
				</Card.Content>
			</Card.Root>
		</div>
	{:else}
		<EmptyState
			type="error"
			title="Failed to load statistics"
			description="Unable to fetch platform statistics. Please try again."
			actionLabel="Retry"
			onAction={() => location.reload()}
		/>
	{/if}
</div>
