<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import type { PageData } from './$types';
	import type { LiveStats, ActivityFeedItem } from '$lib/api/admin';
	import { getAdminLiveStats, getAdminActivityFeed } from '$lib/api/admin';
	import { formatMoney } from '$lib/utils/money';

	import BarChartLazy from '$lib/components/chart/lazy-bar-chart.svelte';
	import ActivityFeed from '$lib/components/admin/activity-feed.svelte';

	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Building2 from '@lucide/svelte/icons/building-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Clock from '@lucide/svelte/icons/clock';

	let { data }: { data: PageData } = $props();

	let stats: LiveStats | null = $state(data.liveStats ?? null);
	let activities: ActivityFeedItem[] = $state(data.activities ?? []);
	let loading = $state(!data.liveStats);
	let refreshing = $state(false);
	let paused = $state(false);
	let lastRefresh: Date | null = $state(data.liveStats ? new Date() : null);

	const POLL_INTERVAL = 10_000; // 10 seconds

	$effect(() => {
		if ((data as any).loadError) {
			toast.error('Failed to load monitoring data. Some data may be unavailable.');
		}
	});

	async function fetchLiveStats() {
		try {
			refreshing = true;
			const [newStats, activityResult] = await Promise.all([
				getAdminLiveStats(),
				getAdminActivityFeed(20)
			]);
			stats = newStats;
			activities = activityResult.activities;
			lastRefresh = new Date();
			loading = false;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to refresh monitoring data.'));
		} finally {
			refreshing = false;
		}
	}

	// Polling interval with $effect cleanup
	$effect(() => {
		if (paused) return;

		const interval = setInterval(() => {
			fetchLiveStats();
		}, POLL_INTERVAL);

		return () => clearInterval(interval);
	});

	function handleManualRefresh() {
		fetchLiveStats();
	}

	function togglePause() {
		paused = !paused;
		if (!paused) {
			// Immediately refresh when resuming
			fetchLiveStats();
		}
	}

	// Derived values
	const lastRefreshText = $derived(
		lastRefresh
			? lastRefresh.toLocaleTimeString('en-US', {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				})
			: 'Never'
	);

	const totalWebhookEvents = $derived(
		stats
			? stats.webhookHealth.processed + stats.webhookHealth.failed + stats.webhookHealth.pending
			: 0
	);

	const webhookProcessedPct = $derived(
		totalWebhookEvents > 0
			? Math.round((stats!.webhookHealth.processed / totalWebhookEvents) * 100)
			: 0
	);

	const webhookFailedPct = $derived(
		totalWebhookEvents > 0
			? Math.round((stats!.webhookHealth.failed / totalWebhookEvents) * 100)
			: 0
	);

	const webhookPendingPct = $derived(
		totalWebhookEvents > 0
			? Math.round((stats!.webhookHealth.pending / totalWebhookEvents) * 100)
			: 0
	);

	// These figures span every tenant on the platform, so they arrive as
	// per-currency buckets. The previous local formatter hardcoded USD and
	// rendered a mixed-currency sum as dollars.
</script>

<svelte:head>
	<title>Real-time Monitoring | Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold tracking-tight">Real-time Monitoring</h1>
				{#if !paused}
					<span class="flex items-center gap-1.5">
						<span class="relative flex h-2.5 w-2.5">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"
							></span>
							<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-success"></span>
						</span>
						<span class="text-xs font-medium text-success">Live</span>
					</span>
				{:else}
					<Badge variant="secondary">Paused</Badge>
				{/if}
			</div>
			<p class="text-muted-foreground">
				Platform activity dashboard &middot; Last refresh: {lastRefreshText}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={togglePause}
				aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
			>
				{#if paused}
					<Play class="mr-1.5 h-4 w-4" />
					Resume
				{:else}
					<Pause class="mr-1.5 h-4 w-4" />
					Pause
				{/if}
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={handleManualRefresh}
				disabled={refreshing}
				aria-label="Refresh now"
			>
				<RefreshCw class="mr-1.5 h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
				Refresh Now
			</Button>
		</div>
	</div>

	{#if loading && !stats}
		<!-- Loading Skeleton -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="h-4 w-4 rounded" />
					</Card.Header>
					<Card.Content>
						<Skeleton class="h-8 w-20" />
						<Skeleton class="mt-2 h-3 w-32" />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
		<div class="grid gap-4 lg:grid-cols-3">
			<div class="space-y-4 lg:col-span-2">
				<Skeleton class="h-80 w-full rounded-xl" />
				<Skeleton class="h-80 w-full rounded-xl" />
			</div>
			<div class="space-y-4">
				<Skeleton class="h-56 w-full rounded-xl" />
				<Skeleton class="h-56 w-full rounded-xl" />
			</div>
		</div>
	{:else if stats}
		<!-- Stat Cards -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<!-- Orders Today -->
			<Card.Root class="border-green-200 dark:border-green-900">
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Orders Today</Card.Title>
					<ShoppingCart class="h-4 w-4 text-green-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stats.ordersToday.count}</div>
					<p class="text-xs text-muted-foreground">
						{formatMoney(stats.ordersToday.revenue)} revenue
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Payments Today -->
			<Card.Root class="border-blue-200 dark:border-blue-900">
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Payments Today</Card.Title>
					<CreditCard class="h-4 w-4 text-blue-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stats.paymentsToday.count}</div>
					<p class="text-xs text-muted-foreground">
						{formatMoney(stats.paymentsToday.amount)} processed
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Active Businesses -->
			<Card.Root class="border-purple-200 dark:border-purple-900">
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Active Businesses</Card.Title>
					<Building2 class="h-4 w-4 text-purple-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stats.activeBusinesses}</div>
					<p class="text-xs text-muted-foreground">with orders today</p>
				</Card.Content>
			</Card.Root>

			<!-- New Users Today -->
			<Card.Root class="border-orange-200 dark:border-orange-900">
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">New Users Today</Card.Title>
					<UserPlus class="h-4 w-4 text-orange-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stats.newUsersToday}</div>
					<p class="text-xs text-muted-foreground">registered today</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Charts and Side Panel -->
		<div class="grid gap-4 lg:grid-cols-3">
			<!-- Left Column: Charts -->
			<div class="space-y-4 lg:col-span-2">
				<!-- Orders Per Hour Chart -->
				<BarChartLazy
					data={stats.ordersPerHour}
					xKey="hour"
					series={[{ key: 'count', label: 'Orders', color: 'hsl(var(--chart-1))' }]}
					title="Orders Per Hour"
					description="Order volume over the last 24 hours"
				/>

				<!-- Revenue Per Hour Chart -->
				<BarChartLazy
					data={stats.revenuePerHour}
					xKey="hour"
					series={[{ key: 'amount', label: 'Revenue ($)', color: 'hsl(var(--chart-2))' }]}
					title="Revenue Per Hour"
					description="Revenue trend over the last 24 hours"
				/>
			</div>

			<!-- Right Column: Webhook Health & Errors -->
			<div class="space-y-4">
				<!-- Webhook Health -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm font-medium">Webhook Health</Card.Title>
						<Card.Description>Event processing status</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Processed -->
						<div class="space-y-1.5">
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Processed</span>
								<span class="font-medium text-success">{stats.webhookHealth.processed}</span>
							</div>
							<Progress value={webhookProcessedPct} class="h-2" />
						</div>
						<!-- Failed -->
						<div class="space-y-1.5">
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Failed</span>
								<span class="font-medium text-destructive">{stats.webhookHealth.failed}</span>
							</div>
							<Progress value={webhookFailedPct} class="h-2" />
						</div>
						<!-- Pending -->
						<div class="space-y-1.5">
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Pending</span>
								<span class="font-medium text-warning">{stats.webhookHealth.pending}</span>
							</div>
							<Progress value={webhookPendingPct} class="h-2" />
						</div>
						{#if totalWebhookEvents > 0}
							<p class="text-xs text-muted-foreground">
								{totalWebhookEvents} total event{totalWebhookEvents === 1 ? '' : 's'}
							</p>
						{:else}
							<p class="text-xs text-muted-foreground">No webhook events recorded</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Recent Errors -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-sm font-medium">
							<AlertTriangle class="h-4 w-4 text-destructive" />
							Recent Errors
						</Card.Title>
						<Card.Description>Last 5 failed webhook events</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if stats.recentErrors.length === 0}
							<div class="flex flex-col items-center justify-center py-6 text-center">
								<p class="text-sm text-muted-foreground">No recent errors</p>
								<p class="mt-1 text-xs text-muted-foreground">
									All webhook events are processing normally
								</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each stats.recentErrors as error}
									<div class="rounded-md border border-destructive/30 bg-destructive/10 p-3">
										<p class="text-sm font-medium break-all text-destructive">
											{error.message}
										</p>
										<div class="mt-1 flex items-center gap-2 text-xs text-destructive/80">
											<Clock class="h-3 w-3" />
											<time
												>{new Date(error.timestamp).toLocaleString('en-US', {
													hour: '2-digit',
													minute: '2-digit',
													second: '2-digit',
													month: 'short',
													day: 'numeric'
												})}</time
											>
											<span>&middot;</span>
											<span>{error.source}</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Activity Stream -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0">
				<div>
					<Card.Title>Activity Stream</Card.Title>
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
	{:else}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-12 text-center">
				<AlertTriangle class="h-12 w-12 text-muted-foreground" />
				<h3 class="mt-4 text-lg font-semibold">Failed to load monitoring data</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Unable to fetch live statistics. Please try again.
				</p>
				<Button variant="outline" class="mt-4" onclick={handleManualRefresh}>
					<RefreshCw class="mr-1.5 h-4 w-4" />
					Retry
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
