<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { LiveCounter } from '$lib/components/data-display';
	import { getFranchiseAnalytics } from '$lib/api/franchise';
	import type { FranchiseAnalytics } from '$lib/api/types';

	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);

	let analytics = $state<FranchiseAnalytics | null>(null);
	let loading = $state(true);

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
					loading = false;
				});
		}
	});

	const topLocation = $derived(() => {
		if (!analytics?.locationBreakdown?.length) return null;
		return analytics.locationBreakdown.reduce((top, loc) =>
			loc.revenue > top.revenue ? loc : top
		);
	});
</script>

<svelte:head>
	<title>Analytics - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Analytics</h1>
		<p class="mt-1 text-muted-foreground">
			Aggregated metrics across all {franchise?.name} locations.
		</p>
	</div>

	{#if loading}
		<div class="grid gap-4 md:grid-cols-4">
			{#each [1, 2, 3, 4] as _}
				<Card.Root>
					<Card.Header class="pb-2">
						<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
					</Card.Header>
					<Card.Content>
						<div class="h-8 w-16 animate-pulse rounded bg-muted"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if analytics}
		<!-- Summary Cards -->
		<div class="grid gap-4 md:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Revenue</Card.Title>
					<DollarSign class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={analytics.totalRevenue} prefix="$" />
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
						<LiveCounter value={analytics.totalOrders} />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Locations</Card.Title>
					<MapPin class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={analytics.totalLocations} />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Avg per Location</Card.Title>
					<TrendingUp class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{#if analytics.totalLocations > 0}
							<LiveCounter
								value={Math.round(analytics.totalRevenue / analytics.totalLocations)}
								prefix="$"
							/>
						{:else}
							$0
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Per-Location Comparison -->
		{#if analytics.locationBreakdown.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Location Comparison</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b text-left">
									<th class="pb-3 font-medium">Location</th>
									<th class="pb-3 text-right font-medium">Orders</th>
									<th class="pb-3 text-right font-medium">Revenue</th>
									<th class="pb-3 text-right font-medium">Avg Order</th>
								</tr>
							</thead>
							<tbody>
								{#each analytics.locationBreakdown as location (location.businessId)}
									<tr class="border-b last:border-0">
										<td class="py-3">
											<div class="flex items-center gap-2">
												<MapPin class="size-4 text-muted-foreground" />
												<span class="font-medium">{location.businessName}</span>
											</div>
										</td>
										<td class="py-3 text-right">{location.orders}</td>
										<td class="py-3 text-right font-medium">
											${location.revenue.toFixed(2)}
										</td>
										<td class="py-3 text-right text-muted-foreground">
											${location.orders > 0 ? (location.revenue / location.orders).toFixed(2) : '0.00'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{:else}
		<Card.Root>
			<Card.Content class="py-8 text-center text-muted-foreground">
				<BarChart3 class="mx-auto mb-2 size-8" />
				<p>No analytics data available yet.</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
