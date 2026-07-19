<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Alert from '$lib/components/ui/alert';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import KpiCard from '$lib/components/global/kpi-card.svelte';
	import KpiGrid from '$lib/components/global/kpi-grid.svelte';
	import LocationMap, { type MapLocation } from '$lib/components/global/location-map.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { getFranchiseAnalytics, getFranchiseBusinesses } from '$lib/api/franchise';
	import { formatCurrency, type CurrencyCode } from '$lib/utils/i18n';
	import { formatMoney } from '$lib/utils/money';
	import type { FranchiseAnalytics, Business } from '$lib/api/types';

	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Store from '@lucide/svelte/icons/store';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);

	let analytics = $state<FranchiseAnalytics | null>(null);
	let businesses = $state<Business[]>([]);
	let loading = $state(true);
	let loadError = $state(false);

	$effect(() => {
		const id = franchise?.id;
		if (!id) return;

		loading = true;
		loadError = false;

		Promise.all([
			getFranchiseAnalytics(id),
			// Needed for coordinates — the analytics payload carries no address.
			getFranchiseBusinesses(id).catch(() => ({ businesses: [] as Business[] }))
		])
			.then(([analyticsRes, businessRes]) => {
				analytics = analyticsRes.analytics;
				businesses = businessRes.businesses;
			})
			.catch(() => {
				analytics = null;
				loadError = true;
			})
			.finally(() => {
				loading = false;
			});
	});

	// Each location carries its own currency, so a location's figure formats in
	// that location's currency and the network total renders as per-currency
	// buckets. Formatting everything with location #1's currency mislabelled
	// every other location's money.
	function money(amount: number, currency: string) {
		return formatCurrency(amount, currency as CurrencyCode);
	}

	const CHART_ACCENTS = [
		'chart-1',
		'chart-2',
		'chart-3',
		'chart-4',
		'chart-5',
		'chart-6',
		'chart-7',
		'chart-8'
	];

	const businessById = $derived(new Map(businesses.map((b) => [b.id, b])));

	/** Ranked by revenue, with each location's share of the franchise total. */
	const rankedLocations = $derived.by(() => {
		const rows = [...(analytics?.locationBreakdown ?? [])].sort((a, b) => b.revenue - a.revenue);
		const total = rows.reduce((sum, r) => sum + r.revenue, 0);
		return rows.map((row, i) => ({
			...row,
			share: total > 0 ? row.revenue / total : 0,
			accent: CHART_ACCENTS[i % CHART_ACCENTS.length],
			business: businessById.get(row.businessId)
		}));
	});

	const mapLocations = $derived<MapLocation[]>(
		rankedLocations
			.filter((row) => row.business?.address?.lat != null && row.business?.address?.lng != null)
			.map((row) => ({
				id: row.businessId,
				name: row.businessName,
				lat: row.business!.address!.lat as number,
				lng: row.business!.address!.lng as number,
				subtitle: `${money(row.revenue, row.currency)} · ${row.orders} orders`,
				accent: row.accent,
				href: row.business ? `/${row.business.type}/${row.business.slug}/dashboard` : undefined
			}))
	);
</script>

<svelte:head>
	<title>{franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

{#if loadError}
	<Alert.Root variant="destructive">
		<AlertTriangle class="size-4" />
		<Alert.Title>Couldn't load franchise data</Alert.Title>
		<Alert.Description>
			Analytics for this franchise are unavailable right now. Try refreshing the page.
		</Alert.Description>
	</Alert.Root>
{/if}

<!-- Headline KPIs -->
{#if loading}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each [1, 2, 3, 4] as i (i)}
			<Card.Root class="p-4">
				<div class="flex items-start justify-between">
					<Skeleton class="h-3 w-20" />
					<Skeleton class="size-8 rounded-lg" />
				</div>
				<Skeleton class="mt-3 h-7 w-24" />
				<Skeleton class="mt-3 h-3 w-28" />
			</Card.Root>
		{/each}
	</div>
{:else}
	<KpiGrid columns={4}>
		<KpiCard
			label="Network revenue"
			value={formatMoney(analytics?.totalRevenue)}
			description="Across all locations"
			icon={IndianRupee}
			accent="chart-1"
			emphasize
		/>
		<KpiCard
			label="Total orders"
			value={(analytics?.totalOrders ?? 0).toLocaleString('en-IN')}
			description="Across all locations"
			icon={ShoppingCart}
			accent="chart-3"
		/>
		<KpiCard
			label="Locations"
			value={analytics?.totalLocations ?? 0}
			description="Active in this franchise"
			icon={MapPin}
			accent="chart-4"
			href="/franchise/{franchise?.slug}/locations"
		/>
		<KpiCard
			label="Team members"
			value={analytics?.totalStaff ?? 0}
			description="Franchise-level staff"
			icon={Users}
			accent="chart-5"
			href="/franchise/{franchise?.slug}/team"
		/>
	</KpiGrid>
{/if}

<!-- Map + ranked locations -->
<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
	<Card.Root class="lg:col-span-2">
		<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
			<div>
				<Card.Title class="text-section-title">Location map</Card.Title>
				<Card.Description>
					{mapLocations.length} of {rankedLocations.length} locations mapped
				</Card.Description>
			</div>
			<Button variant="outline" size="sm" href="/franchise/{franchise?.slug}/locations">
				Manage
			</Button>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<Skeleton class="h-[360px] w-full rounded-lg" />
			{:else}
				<LocationMap
					locations={mapLocations}
					height="360px"
					emptyTitle="No locations mapped yet"
					emptyDescription="Locations appear here once their address has coordinates."
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="flex max-h-[520px] flex-col">
		<Card.Header class="space-y-0">
			<Card.Title class="text-section-title">Top locations</Card.Title>
			<Card.Description>Ranked by revenue</Card.Description>
		</Card.Header>
		<Card.Content class="flex-1 space-y-3 overflow-y-auto">
			{#if loading}
				{#each [1, 2, 3, 4] as i (i)}
					<div class="flex items-center gap-3">
						<Skeleton class="size-8 rounded-md" />
						<div class="flex-1 space-y-1.5">
							<Skeleton class="h-3.5 w-28" />
							<Skeleton class="h-2.5 w-20" />
						</div>
					</div>
				{/each}
			{:else if rankedLocations.length === 0}
				<EmptyState
					type="no-data"
					icon={Store}
					title="No location data"
					description="Revenue appears here once locations start taking orders."
					size="sm"
				/>
			{:else}
				{#each rankedLocations as location, i (location.businessId)}
					<div class="space-y-1.5">
						<div class="flex items-center gap-3">
							<span
								class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground tabular-nums"
							>
								{i + 1}
							</span>
							<div class="min-w-0 flex-1">
								{#if location.business}
									<a
										href="/{location.business.type}/{location.business.slug}/dashboard"
										class="truncate text-sm font-medium no-underline hover:underline"
									>
										{location.businessName}
									</a>
								{:else}
									<p class="truncate text-sm font-medium">{location.businessName}</p>
								{/if}
								<p class="text-xs text-muted-foreground tabular-nums">
									{location.orders} orders · {Math.round(location.share * 100)}%
								</p>
							</div>
							<span class="shrink-0 text-sm font-semibold tabular-nums">
								{money(location.revenue, location.currency)}
							</span>
						</div>
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full"
								style="width: {Math.max(
									location.share * 100,
									2
								)}%; background-color: var(--{location.accent})"
							></div>
						</div>
					</div>
				{/each}
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Full breakdown -->
{#if !loading && rankedLocations.length > 0}
	<div class="space-y-3">
		<SectionHeader
			title="Location performance"
			description="Every location in this franchise, ranked by revenue"
		/>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each rankedLocations as location (location.businessId)}
				<Card.Root class="transition-all hover:border-primary/40 hover:shadow-md">
					<Card.Content class="space-y-3 p-4">
						<div class="flex items-start gap-3">
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-lg"
								style="background-color: color-mix(in oklch, var(--{location.accent}) 12%, transparent); color: var(--{location.accent})"
							>
								<Store class="size-4" />
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{location.businessName}</p>
								{#if location.business?.address}
									<p class="truncate text-xs text-muted-foreground">
										{[location.business.address.city, location.business.address.country]
											.filter(Boolean)
											.join(', ') || 'No address'}
									</p>
								{/if}
							</div>
						</div>
						<div class="flex items-end justify-between gap-3">
							<div>
								<p class="text-lg font-semibold tabular-nums">
									{money(location.revenue, location.currency)}
								</p>
								<p class="text-xs text-muted-foreground tabular-nums">
									{location.orders} orders
								</p>
							</div>
							{#if location.business}
								<Button
									variant="outline"
									size="sm"
									href="/{location.business.type}/{location.business.slug}/dashboard"
								>
									Open
								</Button>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>
{/if}
