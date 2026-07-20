<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Badge } from '$lib/components/ui/badge';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import { EmptyState, StatusPill, TrendBadge } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { deleteBusiness } from '$lib/api';
	import { formatCurrency, type CurrencyCode } from '$lib/utils/i18n';
	import type { PageData } from './$types';

	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import Settings from '@lucide/svelte/icons/settings';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Users from '@lucide/svelte/icons/users';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Wine from '@lucide/svelte/icons/wine';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import X from '@lucide/svelte/icons/x';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Clock from '@lucide/svelte/icons/clock';

	let { data }: { data: PageData } = $props();

	const businesses = $derived(data.businesses ?? []);

	// Keyed by business id and merged onto the real records at the point of use.
	// Absent when the summary call failed — the grid degrades to the business
	// records alone rather than failing outright.
	const summaries = $derived(
		new Map((data.summaries ?? []).map((summary) => [summary.businessId, summary]))
	);

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

	// --- filtering / search / sort ---------------------------------------------
	let search = $state('');
	let typeFilter = $state('all');
	let statusFilter = $state('all');
	let sortBy = $state('revenue');

	const typeOptions = $derived([
		{ value: 'all', label: 'All types' },
		// Only offer types the account actually has — an empty filter is a dead end.
		...Array.from(new Set(businesses.map((b) => b.type)))
			.sort()
			.map((type) => ({
				value: type,
				label: type.charAt(0).toUpperCase() + type.slice(1)
			}))
	]);

	const statusOptions = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'open', label: 'Open now' },
		{ value: 'closed', label: 'Closed' },
		{ value: 'attention', label: 'Needs attention' }
	];

	const sortOptions = [
		{ value: 'revenue', label: "Today's revenue" },
		{ value: 'name', label: 'Name (A–Z)' },
		{ value: 'newest', label: 'Newest first' },
		{ value: 'type', label: 'Type' }
	];

	const hasActiveFilters = $derived(
		search.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all'
	);

	function clearFilters() {
		search = '';
		typeFilter = 'all';
		statusFilter = 'all';
	}

	const visibleBusinesses = $derived.by(() => {
		const query = search.trim().toLowerCase();

		const filtered = businesses.filter((business) => {
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

			if (statusFilter !== 'all') {
				const summary = summaries.get(business.id);
				if (statusFilter === 'open' && !summary?.isOpenNow) return false;
				if (statusFilter === 'closed' && summary?.isOpenNow) return false;
				if (statusFilter === 'attention' && !summary?.alerts.length) return false;
			}

			return true;
		});

		return filtered.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'newest':
					return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
				case 'type':
					return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
				case 'revenue':
				default:
					return (
						(summaries.get(b.id)?.todayRevenue ?? 0) - (summaries.get(a.id)?.todayRevenue ?? 0)
					);
			}
		});
	});

	// --- formatting -------------------------------------------------------------
	// Each business bills in its own currency, so the card formats with the one
	// the summary reports rather than an account-wide default.
	function money(amount: number, currency = 'INR') {
		return formatCurrency(amount, currency as CurrencyCode);
	}

	function locationLabel(business: (typeof businesses)[number]) {
		return [business.address?.city, business.address?.country].filter(Boolean).join(', ');
	}

	function sparklinePath(points: number[], width = 100, height = 28): string {
		if (points.length < 2) return '';
		const max = Math.max(...points);
		const min = Math.min(...points);
		const range = max - min || 1;
		const step = width / (points.length - 1);
		return points
			.map((value, i) => {
				const x = i * step;
				const y = height - 2 - ((value - min) / range) * (height - 4);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	}

	// --- navigation / actions ---------------------------------------------------
	function navigateToBusiness(business: any) {
		goto(`/${business.type}/${business.slug}/dashboard`);
	}

	function openBusinessSettings(business: any) {
		goto(`/${business.type}/${business.slug}/settings`);
	}

	function openTeam(business: any) {
		goto(`/${business.type}/${business.slug}/team`);
	}

	let businessToDelete: any = $state(null);
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	function openDeleteDialog(business: any) {
		businessToDelete = business;
		// Defer to next frame so the dropdown fully closes
		// before the AlertDialog opens (avoids Radix dismiss race)
		setTimeout(() => {
			deleteDialogOpen = true;
		}, 0);
	}

	async function confirmDelete() {
		if (!businessToDelete) return;
		isDeleting = true;
		try {
			await deleteBusiness(businessToDelete.id);
			toast.success(`"${businessToDelete.name}" deleted successfully`);
			deleteDialogOpen = false;
			businessToDelete = null;
			await invalidate('app:user-businesses');
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to delete business. Please try again.');
		} finally {
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>My Businesses | POS</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5">
	<PageHeader
		title="My Businesses"
		description="Manage all your businesses in one place."
		gutter={false}
	>
		{#snippet actions()}
			<Button href="/business/setup">
				<Plus class="mr-1.5 size-4" />
				Add business
			</Button>
		{/snippet}
	</PageHeader>

	{#if businesses.length > 0}
		<!-- ── Search + filters ──────────────────────────────────────────────── -->
		<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
			<InputGroup.Root class="w-full sm:max-w-xs">
				<InputGroup.Addon>
					<Search class="size-4 text-muted-foreground" />
				</InputGroup.Addon>
				<InputGroup.Input
					placeholder="Search businesses…"
					bind:value={search}
					aria-label="Search businesses"
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
				<FilterSelect
					value={statusFilter}
					options={statusOptions}
					onValueChange={(v) => (statusFilter = v)}
					class="w-[160px]"
				/>
				<FilterSelect
					value={sortBy}
					options={sortOptions}
					onValueChange={(v) => (sortBy = v)}
					class="w-[160px]"
				/>
			</div>

			<div class="flex items-center gap-3 sm:ml-auto">
				<span class="text-sm text-muted-foreground tabular-nums">
					{visibleBusinesses.length} of {businesses.length}
				</span>
				{#if hasActiveFilters}
					<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
				{/if}
			</div>
		</div>

		<!-- ── Business cards ────────────────────────────────────────────────── -->
		{#if visibleBusinesses.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each visibleBusinesses as business (business.id)}
					{@const Icon = getBusinessIcon(business.type)}
					{@const summary = summaries.get(business.id)}
					{@const location = locationLabel(business)}
					{@const path = sparklinePath(summary?.sparkline ?? [])}
					<Card.Root
						class="group flex flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
					>
						<!-- Identity -->
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
										class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"
									>
										<Icon class="size-5 text-primary" />
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
										{#if summary}
											<StatusPill
												label={summary.isOpenNow ? 'Open now' : 'Closed'}
												status={summary.isOpenNow ? 'success' : 'neutral'}
												size="sm"
												pulse={summary.isOpenNow}
											/>
										{/if}
									</div>
								</div>

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
										<DropdownMenu.Item onclick={() => navigateToBusiness(business)}>
											<ExternalLink class="mr-2 size-4" />
											Open dashboard
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => openTeam(business)}>
											<Users class="mr-2 size-4" />
											Team
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => openBusinessSettings(business)}>
											<Settings class="mr-2 size-4" />
											Settings
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive focus:text-destructive"
											onclick={() => openDeleteDialog(business)}
										>
											<Trash2 class="mr-2 size-4" />
											Delete
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>

							{#if location}
								<div class="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
									<MapPin class="size-3 shrink-0" />
									<span class="truncate">{location}</span>
								</div>
							{/if}
						</Card.Header>

						<!-- Today's numbers -->
						{#if summary}
							<Card.Content class="flex-1 space-y-4 border-t border-border pt-4">
								<div class="flex items-end justify-between gap-3">
									<div class="min-w-0">
										<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
											Today
										</p>
										<div class="mt-1 flex flex-wrap items-baseline gap-2">
											<span class="text-xl font-semibold tabular-nums">
												{money(summary.todayRevenue, summary.currency)}
											</span>
											<TrendBadge
												value={summary.revenueChange}
												changePercent={summary.revenueChange}
												format="percent"
												size="sm"
											/>
										</div>
										<p class="mt-0.5 text-xs text-muted-foreground tabular-nums">
											{summary.todayOrders} orders
											{#if summary.pendingOrders > 0}
												· <span class="text-warning">{summary.pendingOrders} pending</span>
											{/if}
										</p>
									</div>

									{#if path}
										<svg
											class="h-7 w-24 shrink-0 {summary.revenueChange >= 0
												? 'text-success'
												: 'text-destructive'}"
											viewBox="0 0 100 28"
											preserveAspectRatio="none"
											aria-hidden="true"
										>
											<path
												d={path}
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{/if}
								</div>

								{#if summary.alerts.length > 0}
									<div class="space-y-1.5">
										{#each summary.alerts as alert (alert.kind)}
											<div
												class="flex items-start gap-2 rounded-md px-2 py-1.5 {alert.severity ===
												'destructive'
													? 'bg-destructive/10 text-destructive'
													: 'bg-warning/10 text-warning'}"
											>
												<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
												<span class="text-xs font-medium">{alert.message}</span>
											</div>
										{/each}
									</div>
								{/if}
							</Card.Content>

							<!-- Footer meta + primary action -->
							<Card.Footer
								class="flex items-center justify-between gap-3 border-t border-border pt-4"
							>
								<div class="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
									<span class="flex items-center gap-1 tabular-nums">
										<Users class="size-3.5 shrink-0" />
										{summary.activeStaffNow}/{summary.staffCount}
									</span>
									{#if summary.lastActivityMinutesAgo !== null}
										<span class="flex items-center gap-1 truncate tabular-nums">
											<Clock class="size-3.5 shrink-0" />
											{summary.lastActivityMinutesAgo}m ago
										</span>
									{/if}
								</div>
								<Button
									variant="outline"
									size="sm"
									class="shrink-0"
									onclick={() => navigateToBusiness(business)}
								>
									Open
								</Button>
							</Card.Footer>
						{/if}
					</Card.Root>
				{/each}
			</div>
		{:else}
			<EmptyState
				type="no-results"
				title="No businesses match your filters"
				description="Try a different search term, or clear the filters to see everything."
				actionLabel="Clear filters"
				onAction={clearFilters}
			/>
		{/if}
	{:else}
		<EmptyState
			type="empty"
			title="No businesses yet"
			description="Get started by creating your first business."
			actionLabel="Create your first business"
			onAction={() => goto('/business/setup')}
			icon={Building2}
		/>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root
	bind:open={deleteDialogOpen}
	onOpenChange={(open) => {
		if (!open) businessToDelete = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Business</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>{businessToDelete?.name}</strong>? This action
				cannot be undone and all associated data will be permanently removed.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isDeleting}
				onclick={confirmDelete}
			>
				{isDeleting ? 'Deleting...' : 'Delete Business'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
