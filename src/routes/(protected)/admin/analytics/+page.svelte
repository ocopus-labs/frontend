<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	import { formatCurrency } from '$lib/utils/i18n';
	import { formatDateShort } from '$lib/utils/formatting';

	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';

	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Users from '@lucide/svelte/icons/users';
	import Building2 from '@lucide/svelte/icons/building-2';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Trophy from '@lucide/svelte/icons/trophy';

	let { data }: { data: PageData } = $props();

	let startDate = $state(data.filters.startDate || '');
	let endDate = $state(data.filters.endDate || '');

	function formatCurrencyValue(value: number): string {
		return formatCurrency(value, 'USD');
	}

	function applyDateFilter() {
		const params = new URLSearchParams($page.url.searchParams);
		if (startDate) params.set('startDate', startDate);
		else params.delete('startDate');
		if (endDate) params.set('endDate', endDate);
		else params.delete('endDate');
		goto(`?${params.toString()}`);
	}

	// Calculate totals from daily stats (no slicing — use all data)
	const totalOrders = $derived(
		data.analytics.dailyStats.reduce((sum: number, d: any) => sum + Number(d.orders_count), 0)
	);
	const totalRevenue = $derived(
		data.analytics.dailyStats.reduce((sum: number, d: any) => sum + Number(d.revenue), 0)
	);
	const totalNewUsers = $derived(
		data.analytics.userGrowth.reduce((sum: number, d: any) => sum + Number(d.new_users), 0)
	);
	const totalNewBusinesses = $derived(
		data.analytics.businessGrowth.reduce((sum: number, d: any) => sum + Number(d.new_businesses), 0)
	);

	// Chart data transformations
	const dailyChartData = $derived(
		data.analytics.dailyStats.map((d: any) => ({
			date: formatDateShort(d.date),
			orders: Number(d.orders_count),
			revenue: Number(d.revenue)
		}))
	);

	const userGrowthChartData = $derived(
		data.analytics.userGrowth.map((d: any) => ({
			date: formatDateShort(d.date),
			users: Number(d.new_users)
		}))
	);

	const businessGrowthChartData = $derived(
		data.analytics.businessGrowth.map((d: any) => ({
			date: formatDateShort(d.date),
			businesses: Number(d.new_businesses)
		}))
	);
</script>

<svelte:head>
	<title>Analytics | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Platform Analytics</h1>
		<p class="text-muted-foreground">
			{formatDateShort(data.analytics.period.start)} - {formatDateShort(data.analytics.period.end)}
		</p>
	</div>

	<!-- Date Filter -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-wrap items-end gap-4">
				<div class="space-y-2">
					<Label for="startDate">Start Date</Label>
					<Input type="date" id="startDate" bind:value={startDate} class="w-[180px]" />
				</div>
				<div class="space-y-2">
					<Label for="endDate">End Date</Label>
					<Input type="date" id="endDate" bind:value={endDate} class="w-[180px]" />
				</div>
				<Button onclick={applyDateFilter}>
					<Calendar class="h-4 w-4 mr-2" />
					Apply Filter
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Orders</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
				<p class="text-xs text-muted-foreground">In selected period</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Revenue</Card.Title>
				<DollarSign class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatCurrencyValue(totalRevenue)}</div>
				<p class="text-xs text-muted-foreground">In selected period</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">New Users</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalNewUsers.toLocaleString()}</div>
				<p class="text-xs text-muted-foreground">In selected period</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">New Businesses</Card.Title>
				<Building2 class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalNewBusinesses.toLocaleString()}</div>
				<p class="text-xs text-muted-foreground">In selected period</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Daily Performance Chart -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<TrendingUp class="h-4 w-4" />
					Daily Performance
				</Card.Title>
				<Card.Description>Orders and revenue by day</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if dailyChartData.length > 0}
					<BarChart
						data={dailyChartData}
						xKey="date"
						series={[
							{ key: 'orders', label: 'Orders', color: 'var(--primary)' }
						]}
						title=""
					/>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">No data available</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Top Performing Businesses -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Trophy class="h-4 w-4" />
					Top Performing Businesses
				</Card.Title>
				<Card.Description>By revenue in selected period</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					{#each data.analytics.topBusinesses as business, index}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
								>
									{index + 1}
								</div>
								<div>
									<p class="font-medium">{business.name}</p>
									<p class="text-xs text-muted-foreground capitalize">
										{business.type} - {business.order_count} {Number(business.order_count) === 1 ? 'order' : 'orders'}
									</p>
								</div>
							</div>
							<Badge variant="secondary" class="font-mono">
								{formatCurrencyValue(Number(business.total_revenue))}
							</Badge>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground text-center py-4">
							No data available
						</p>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Growth Charts -->
	<div class="grid gap-6 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Users class="h-4 w-4" />
					User Growth
				</Card.Title>
				<Card.Description>New user registrations by day</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if userGrowthChartData.length > 0}
					<BarChart
						data={userGrowthChartData}
						xKey="date"
						series={[
							{ key: 'users', label: 'New Users', color: 'var(--primary)' }
						]}
						title=""
					/>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">No data available</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Building2 class="h-4 w-4" />
					Business Growth
				</Card.Title>
				<Card.Description>New business registrations by day</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if businessGrowthChartData.length > 0}
					<BarChart
						data={businessGrowthChartData}
						xKey="date"
						series={[
							{ key: 'businesses', label: 'New Businesses', color: 'var(--primary)' }
						]}
						title=""
					/>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">No data available</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
