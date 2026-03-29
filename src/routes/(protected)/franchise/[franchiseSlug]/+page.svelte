<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { LiveCounter, StatusPill } from '$lib/components/data-display';
	import { getFranchiseAnalytics } from '$lib/api/franchise';
	import type { FranchiseAnalytics } from '$lib/api/types';

	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Settings from '@lucide/svelte/icons/settings';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);

	let analytics = $state<FranchiseAnalytics | null>(null);
	let loadingAnalytics = $state(true);

	$effect(() => {
		if (franchise?.id) {
			getFranchiseAnalytics(franchise.id)
				.then((res) => {
					analytics = res.analytics;
				})
				.catch(() => {
					analytics = null;
				})
				.finally(() => {
					loadingAnalytics = false;
				});
		}
	});
</script>

<svelte:head>
	<title>{franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div class="flex items-center gap-4">
			{#if franchise?.logo}
				<img
					src={franchise.logo}
					alt={franchise.name}
					class="size-16 rounded-xl object-cover ring-2 ring-background shadow-sm"
				/>
			{:else}
				<div
					class="flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm"
				>
					<Building2 class="size-8 text-primary" />
				</div>
			{/if}
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{franchise?.name}</h1>
				<div class="mt-1 flex items-center gap-2">
					<StatusPill
						label={franchise?.status ?? 'active'}
						status={franchise?.status === 'active' ? 'success' : 'warning'}
						size="sm"
					/>
					{#if userRole}
						<span class="text-sm text-muted-foreground capitalize">
							{userRole.replace('_', ' ')}
						</span>
					{/if}
				</div>
			</div>
		</div>
		{#if userRole === 'franchise_owner'}
			<Button
				variant="outline"
				onclick={() => goto(`/franchise/${franchise?.slug}/settings`)}
			>
				<Settings class="mr-2 h-4 w-4" />
				Settings
			</Button>
		{/if}
	</div>

	<!-- KPI Cards -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Locations</Card.Title>
				<MapPin class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{#if loadingAnalytics}
						<div class="h-8 w-12 animate-pulse rounded bg-muted"></div>
					{:else}
						<LiveCounter value={analytics?.totalLocations ?? 0} />
					{/if}
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
					{#if loadingAnalytics}
						<div class="h-8 w-12 animate-pulse rounded bg-muted"></div>
					{:else}
						<LiveCounter value={analytics?.totalOrders ?? 0} />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Revenue</Card.Title>
				<DollarSign class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{#if loadingAnalytics}
						<div class="h-8 w-12 animate-pulse rounded bg-muted"></div>
					{:else}
						<LiveCounter value={analytics?.totalRevenue ?? 0} prefix="$" />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Team Members</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{#if loadingAnalytics}
						<div class="h-8 w-12 animate-pulse rounded bg-muted"></div>
					{:else}
						<LiveCounter value={analytics?.totalStaff ?? 0} />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Quick Navigation -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card.Root
			class="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
			onclick={() => goto(`/franchise/${franchise?.slug}/locations`)}
		>
			<Card.Content class="flex items-center gap-3 p-4">
				<MapPin class="size-5 text-primary" />
				<div>
					<p class="font-medium">Locations</p>
					<p class="text-xs text-muted-foreground">Manage locations</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root
			class="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
			onclick={() => goto(`/franchise/${franchise?.slug}/analytics`)}
		>
			<Card.Content class="flex items-center gap-3 p-4">
				<BarChart3 class="size-5 text-primary" />
				<div>
					<p class="font-medium">Analytics</p>
					<p class="text-xs text-muted-foreground">View reports</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root
			class="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
			onclick={() => goto(`/franchise/${franchise?.slug}/team`)}
		>
			<Card.Content class="flex items-center gap-3 p-4">
				<Users class="size-5 text-primary" />
				<div>
					<p class="font-medium">Team</p>
					<p class="text-xs text-muted-foreground">Manage staff</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root
			class="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
			onclick={() => goto(`/franchise/${franchise?.slug}/settings`)}
		>
			<Card.Content class="flex items-center gap-3 p-4">
				<Settings class="size-5 text-primary" />
				<div>
					<p class="font-medium">Settings</p>
					<p class="text-xs text-muted-foreground">Franchise config</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Location Breakdown -->
	{#if analytics?.locationBreakdown && analytics.locationBreakdown.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Location Performance</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#each analytics.locationBreakdown as location (location.businessId)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex items-center gap-3">
								<div
									class="flex size-8 items-center justify-center rounded-md bg-muted"
								>
									<MapPin class="size-4 text-muted-foreground" />
								</div>
								<span class="font-medium">{location.businessName}</span>
							</div>
							<div class="flex items-center gap-6 text-sm text-muted-foreground">
								<span>{location.orders} orders</span>
								<span class="font-medium text-foreground">
									${location.revenue.toFixed(2)}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
