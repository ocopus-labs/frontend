<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Alert from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import LocationMap, { type MapLocation } from '$lib/components/global/location-map.svelte';
	import { StatusPill, EmptyState } from '$lib/components/data-display';
	import {
		getFranchiseBusinesses,
		removeBusinessFromFranchise,
		pushMenuToLocations,
		addBusinessToFranchise
	} from '$lib/api/franchise';
	import { getUserBusinesses } from '$lib/api/business';
	import { toast } from 'svelte-sonner';
	import type { Business } from '$lib/api/types';

	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Store from '@lucide/svelte/icons/store';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import X from '@lucide/svelte/icons/x';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Building2 from '@lucide/svelte/icons/building-2';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Wine from '@lucide/svelte/icons/wine';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const isOwner = $derived(userRole === 'franchise_owner');

	// Carry franchise context into the shared setup wizard so the new business
	// is attached to this franchise instead of created standalone.
	const addLocationHref = $derived(
		franchise
			? `/business/setup?franchise=${franchise.id}&franchiseSlug=${franchise.slug}` +
					`&franchiseName=${encodeURIComponent(franchise.name)}`
			: '/business/setup'
	);

	let businesses = $state<Business[]>([]);
	let loading = $state(true);
	let loadError = $state(false);
	let syncingMenu = $state(false);

	$effect(() => {
		if (franchise?.id) {
			getFranchiseBusinesses(franchise.id)
				.then((res) => {
					businesses = res.businesses;
					loadError = false;
				})
				.catch(() => {
					businesses = [];
					loadError = true;
				})
				.finally(() => {
					loading = false;
				});
		}
	});

	// --- presentation maps -----------------------------------------------------
	const businessTypeIcons: Record<string, any> = {
		restaurant: UtensilsCrossed,
		cafe: Coffee,
		bar: Wine,
		salon: Scissors,
		spa: Sparkles,
		gym: Dumbbell,
		retail: Store,
		clinic: Stethoscope,
		other: Building2
	};

	function getBusinessIcon(type: string) {
		return businessTypeIcons[type] || Building2;
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

	function locationLabel(business: Business) {
		return [business.address?.city, business.address?.country].filter(Boolean).join(', ');
	}

	// --- search / filter --------------------------------------------------------
	let search = $state('');
	let typeFilter = $state('all');

	const typeOptions = $derived([
		{ value: 'all', label: 'All types' },
		// Only offer types this franchise actually has — an empty filter is a dead end.
		...Array.from(new Set(businesses.map((b) => b.type)))
			.sort()
			.map((type) => ({
				value: type,
				label: type.charAt(0).toUpperCase() + type.slice(1)
			}))
	]);

	const hasActiveFilters = $derived(search.trim() !== '' || typeFilter !== 'all');

	function clearFilters() {
		search = '';
		typeFilter = 'all';
	}

	const visibleBusinesses = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return businesses.filter((business) => {
			if (query) {
				const haystack = [
					business.name,
					business.slug,
					business.type,
					business.address?.city,
					business.address?.country
				]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				if (!haystack.includes(query)) return false;
			}

			if (typeFilter !== 'all' && business.type !== typeFilter) return false;

			return true;
		});
	});

	/** Only locations whose address carries real coordinates can be plotted. */
	const mapLocations = $derived<MapLocation[]>(
		visibleBusinesses
			.filter((b) => b.address?.lat != null && b.address?.lng != null)
			.map((b, i) => ({
				id: b.id,
				name: b.name,
				lat: b.address.lat as number,
				lng: b.address.lng as number,
				subtitle: locationLabel(b) || undefined,
				accent: CHART_ACCENTS[i % CHART_ACCENTS.length],
				href: `/${b.type}/${b.slug}/dashboard`
			}))
	);

	// --- transfer flow ----------------------------------------------------------
	let transferDialogOpen = $state(false);
	let transferableBusinesses = $state<Business[]>([]);
	let loadingTransferable = $state(false);
	let transferringId = $state<string | null>(null);

	let businessToTransfer = $state<Business | null>(null);
	let transferConfirmOpen = $state(false);

	async function openTransferDialog() {
		transferDialogOpen = true;
		loadingTransferable = true;
		try {
			const res = await getUserBusinesses();
			transferableBusinesses = res.businesses.filter((b) => !b.franchiseId);
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to load businesses');
			transferableBusinesses = [];
		} finally {
			loadingTransferable = false;
		}
	}

	function openTransferConfirm(business: Business) {
		businessToTransfer = business;
		transferConfirmOpen = true;
	}

	async function handleTransfer() {
		const businessId = businessToTransfer?.id;
		if (!franchise?.id || !businessId) return;

		transferringId = businessId;
		try {
			const res = await addBusinessToFranchise(franchise.id, { businessId });
			businesses = [...businesses, res.business];
			transferableBusinesses = transferableBusinesses.filter((b) => b.id !== businessId);
			toast.success('Business transferred to franchise');
			transferConfirmOpen = false;
			businessToTransfer = null;
			if (transferableBusinesses.length === 0) transferDialogOpen = false;
		} catch (err: any) {
			toast.error(err?.message ?? 'Transfer failed');
		} finally {
			transferringId = null;
		}
	}

	// --- remove flow ------------------------------------------------------------
	let businessToRemove = $state<Business | null>(null);
	let removeDialogOpen = $state(false);
	let isRemoving = $state(false);

	function openRemoveDialog(business: Business) {
		businessToRemove = business;
		// Defer to the next frame so the dropdown fully closes before the
		// AlertDialog opens (avoids the Radix dismiss race).
		setTimeout(() => {
			removeDialogOpen = true;
		}, 0);
	}

	async function handleRemove() {
		const businessId = businessToRemove?.id;
		if (!franchise?.id || !businessId) return;

		isRemoving = true;
		try {
			await removeBusinessFromFranchise(franchise.id, businessId);
			businesses = businesses.filter((b) => b.id !== businessId);
			toast.success('Location removed from franchise');
			removeDialogOpen = false;
			businessToRemove = null;
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to remove location from franchise');
		} finally {
			isRemoving = false;
		}
	}

	// --- menu sync --------------------------------------------------------------
	let syncDialogOpen = $state(false);

	async function handleSyncMenu() {
		if (!franchise?.id) return;

		syncingMenu = true;
		syncDialogOpen = false;
		try {
			const result = await pushMenuToLocations(franchise.id);
			toast.success(result.message ?? 'Menu pushed to all locations');
		} catch (err: any) {
			toast.error(err?.message ?? 'Menu sync failed');
		} finally {
			syncingMenu = false;
		}
	}
</script>

<svelte:head>
	<title>Locations - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

{#if loadError}
	<Alert.Root variant="destructive">
		<AlertTriangle class="size-4" />
		<Alert.Title>Couldn't load locations</Alert.Title>
		<Alert.Description>
			The locations for this franchise are unavailable right now. Try refreshing the page.
		</Alert.Description>
	</Alert.Root>
{/if}

<!-- ── Toolbar: search + type filter + owner actions ─────────────────────────── -->
<div class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
	<InputGroup.Root class="w-full lg:max-w-xs">
		<InputGroup.Addon>
			<Search class="size-4 text-muted-foreground" />
		</InputGroup.Addon>
		<InputGroup.Input
			placeholder="Search locations…"
			bind:value={search}
			aria-label="Search locations"
		/>
		{#if search}
			<InputGroup.Button size="icon-sm" onclick={() => (search = '')} aria-label="Clear search">
				<X class="size-4" />
			</InputGroup.Button>
		{/if}
	</InputGroup.Root>

	<div class="flex flex-wrap items-center gap-2">
		<FilterSelect
			value={typeFilter}
			options={typeOptions}
			onValueChange={(v) => (typeFilter = v)}
			class="w-[150px]"
		/>
		<span class="text-sm text-muted-foreground tabular-nums">
			{visibleBusinesses.length} of {businesses.length}
		</span>
		{#if hasActiveFilters}
			<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
		{/if}
	</div>

	{#if isOwner}
		<div class="flex flex-wrap items-center gap-2 lg:ml-auto">
			<Button variant="outline" disabled={syncingMenu} onclick={() => (syncDialogOpen = true)}>
				<RefreshCw class="mr-1.5 size-4 {syncingMenu ? 'animate-spin' : ''}" />
				{syncingMenu ? 'Syncing…' : 'Sync Menu'}
			</Button>
			<Button variant="outline" onclick={openTransferDialog}>
				<ArrowRightLeft class="mr-1.5 size-4" />
				Transfer Existing
			</Button>
			<Button onclick={() => goto(addLocationHref)}>
				<Plus class="mr-1.5 size-4" />
				Add Location
			</Button>
		</div>
	{/if}
</div>

<!-- ── Map ───────────────────────────────────────────────────────────────────── -->
<Card.Root>
	<Card.Header class="space-y-0">
		<Card.Title class="text-section-title">Location map</Card.Title>
		<Card.Description class="tabular-nums">
			{mapLocations.length} of {visibleBusinesses.length} locations mapped
		</Card.Description>
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

<!-- ── Location cards ────────────────────────────────────────────────────────── -->
{#if loading}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each [1, 2, 3] as i (i)}
			<Card.Root>
				<Card.Header class="gap-0 space-y-0 pb-4">
					<div class="flex items-start gap-3">
						<Skeleton class="size-12 shrink-0 rounded-xl" />
						<div class="flex-1 space-y-2">
							<Skeleton class="h-4 w-32" />
							<Skeleton class="h-5 w-20 rounded-full" />
						</div>
					</div>
					<Skeleton class="mt-3 h-3 w-28" />
				</Card.Header>
				<Card.Content class="border-t border-border pt-4">
					<Skeleton class="h-8 w-20" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{:else if businesses.length === 0}
	<EmptyState
		type="empty"
		title="No locations yet"
		description="Add your first location to this franchise."
		actionLabel={isOwner ? 'Add Location' : undefined}
		onAction={isOwner ? () => goto(addLocationHref) : undefined}
		icon={MapPin}
	/>
{:else if visibleBusinesses.length === 0}
	<EmptyState
		type="no-results"
		title="No locations match your filters"
		description="Try a different search term, or clear the filters to see every location."
		actionLabel="Clear filters"
		onAction={clearFilters}
	/>
{:else}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each visibleBusinesses as business, i (business.id)}
			{@const Icon = getBusinessIcon(business.type)}
			{@const accent = CHART_ACCENTS[i % CHART_ACCENTS.length]}
			{@const place = locationLabel(business)}
			<Card.Root
				class="group flex flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
			>
				<Card.Header class="gap-0 space-y-0 pb-4">
					<div class="flex items-start gap-3">
						{#if business.logo}
							<Avatar.Root class="size-12 shrink-0 rounded-xl">
								<Avatar.Image src={business.logo} alt={business.name} class="object-cover" />
								<Avatar.Fallback class="rounded-xl bg-muted">
									<Icon class="size-5 text-muted-foreground" />
								</Avatar.Fallback>
							</Avatar.Root>
						{:else}
							<span
								class="flex size-12 shrink-0 items-center justify-center rounded-xl"
								style="background-color: color-mix(in oklch, var(--{accent}) 12%, transparent); color: var(--{accent})"
							>
								<Icon class="size-5" />
							</span>
						{/if}

						<div class="min-w-0 flex-1">
							<a
								href="/{business.type}/{business.slug}/dashboard"
								class="truncate text-base font-semibold no-underline hover:underline"
							>
								{business.name}
							</a>
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								<Badge variant="outline" class="capitalize">{business.type}</Badge>
								<StatusPill
									label={business.status}
									status={business.status === 'active' ? 'success' : 'warning'}
									size="sm"
								/>
								{#if business.configSource}
									<Badge variant="secondary" class="capitalize">
										{business.configSource} config
									</Badge>
								{/if}
							</div>
						</div>

						{#if isOwner}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button
										variant="ghost"
										size="icon"
										class="size-8 shrink-0"
										aria-label="Options for {business.name}"
									>
										<MoreHorizontal class="size-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item
										onclick={() => goto(`/${business.type}/${business.slug}/dashboard`)}
									>
										<ExternalLink class="mr-2 size-4" />
										Open dashboard
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive focus:text-destructive"
										onclick={() => openRemoveDialog(business)}
									>
										<Trash2 class="mr-2 size-4" />
										Remove from franchise
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>

					{#if place}
						<div class="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
							<MapPin class="size-3 shrink-0" />
							<span class="truncate">{place}</span>
						</div>
					{/if}
				</Card.Header>

				<Card.Footer class="mt-auto justify-end border-t border-border pt-4">
					<Button
						variant="outline"
						size="sm"
						onclick={() => goto(`/${business.type}/${business.slug}/dashboard`)}
					>
						<ExternalLink class="mr-1.5 size-3.5" />
						Open
					</Button>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>
{/if}

<!-- ── Transfer picker ───────────────────────────────────────────────────────── -->
<Dialog.Root bind:open={transferDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Transfer business into franchise</Dialog.Title>
			<Dialog.Description>
				Select a standalone business you own to move it into {franchise?.name}. Once transferred,
				the business will follow franchise-level settings.
			</Dialog.Description>
		</Dialog.Header>
		<div class="max-h-80 overflow-y-auto">
			{#if loadingTransferable}
				<div class="space-y-2 py-2">
					{#each [1, 2] as i (i)}
						<div
							class="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
						>
							<div class="space-y-2">
								<Skeleton class="h-4 w-32" />
								<Skeleton class="h-3 w-20" />
							</div>
							<Skeleton class="h-8 w-20 rounded-md" />
						</div>
					{/each}
				</div>
			{:else if transferableBusinesses.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">
					No standalone businesses available to transfer.
				</p>
			{:else}
				<div class="space-y-2 py-2">
					{#each transferableBusinesses as b (b.id)}
						<div
							class="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
						>
							<div class="min-w-0">
								<div class="truncate text-sm font-medium">{b.name}</div>
								<div class="text-xs text-muted-foreground capitalize">{b.type}</div>
							</div>
							<Button
								size="sm"
								disabled={transferringId === b.id}
								onclick={() => openTransferConfirm(b)}
							>
								{transferringId === b.id ? 'Transferring...' : 'Transfer'}
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- ── Transfer confirmation ─────────────────────────────────────────────────── -->
<AlertDialog.Root
	bind:open={transferConfirmOpen}
	onOpenChange={(open) => {
		if (!open) businessToTransfer = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Transfer into franchise</AlertDialog.Title>
			<AlertDialog.Description>
				Move <strong>{businessToTransfer?.name}</strong> into {franchise?.name}? It will inherit
				franchise settings going forward.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={transferringId !== null}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action disabled={transferringId !== null} onclick={handleTransfer}>
				{transferringId !== null ? 'Transferring...' : 'Transfer'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- ── Remove confirmation ───────────────────────────────────────────────────── -->
<AlertDialog.Root
	bind:open={removeDialogOpen}
	onOpenChange={(open) => {
		if (!open) businessToRemove = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove from franchise</AlertDialog.Title>
			<AlertDialog.Description>
				Remove <strong>{businessToRemove?.name}</strong> from {franchise?.name}? It will become an
				independent business and stop inheriting franchise settings.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isRemoving}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isRemoving}
				onclick={handleRemove}
			>
				{isRemoving ? 'Removing...' : 'Remove'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- ── Sync-menu confirmation ────────────────────────────────────────────────── -->
<AlertDialog.Root bind:open={syncDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Push menu to all locations</AlertDialog.Title>
			<AlertDialog.Description>
				This pushes the franchise menu template to every location under {franchise?.name} and will overwrite
				their existing menu categories. This can't be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={syncingMenu}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action disabled={syncingMenu} onclick={handleSyncMenu}>
				{syncingMenu ? 'Syncing...' : 'Push menu'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
