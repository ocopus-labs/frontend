<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as InputGroup from '$lib/components/ui/input-group';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import { EmptyState, StatusPill } from '$lib/components/data-display';

	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Network from '@lucide/svelte/icons/network';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchises = $derived(data.franchises ?? []);

	// --- filtering / search / sort ---------------------------------------------
	let search = $state('');
	let statusFilter = $state('all');
	let sortBy = $state('name');

	const statusOptions = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'suspended', label: 'Suspended' }
	];

	const sortOptions = [
		{ value: 'name', label: 'Name (A–Z)' },
		{ value: 'locations', label: 'Most locations' },
		{ value: 'staff', label: 'Most staff' }
	];

	const hasActiveFilters = $derived(search.trim() !== '' || statusFilter !== 'all');

	function clearFilters() {
		search = '';
		statusFilter = 'all';
	}

	const visibleFranchises = $derived.by(() => {
		const query = search.trim().toLowerCase();

		const filtered = franchises.filter((franchise) => {
			if (query) {
				const haystack = [franchise.name, franchise.slug, franchise.description]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				if (!haystack.includes(query)) return false;
			}

			if (statusFilter !== 'all' && franchise.status !== statusFilter) return false;

			return true;
		});

		return filtered.sort((a, b) => {
			switch (sortBy) {
				case 'locations':
					return (
						(b._count?.businesses ?? 0) - (a._count?.businesses ?? 0) ||
						a.name.localeCompare(b.name)
					);
				case 'staff':
					return (b._count?.staff ?? 0) - (a._count?.staff ?? 0) || a.name.localeCompare(b.name);
				case 'name':
				default:
					return a.name.localeCompare(b.name);
			}
		});
	});
</script>

<svelte:head>
	<title>Franchises | POS</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5">
	<PageHeader
		title="Franchises"
		description="Manage your franchise networks and locations."
		gutter={false}
	>
		{#snippet actions()}
			<Button href="/franchise/create">
				<Plus class="mr-1.5 size-4" />
				Create franchise
			</Button>
		{/snippet}
	</PageHeader>

	{#if franchises.length > 0}
		<!-- ── Search + filters ──────────────────────────────────────────────── -->
		<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
			<InputGroup.Root class="w-full sm:max-w-xs">
				<InputGroup.Addon>
					<Search class="size-4 text-muted-foreground" />
				</InputGroup.Addon>
				<InputGroup.Input
					placeholder="Search franchises…"
					bind:value={search}
					aria-label="Search franchises"
				/>
				{#if search}
					<InputGroup.Button size="icon-sm" onclick={() => (search = '')} aria-label="Clear search">
						<X class="size-4" />
					</InputGroup.Button>
				{/if}
			</InputGroup.Root>

			<div class="flex flex-wrap items-center gap-2">
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
					{visibleFranchises.length} of {franchises.length}
				</span>
				{#if hasActiveFilters}
					<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
				{/if}
			</div>
		</div>

		<!-- ── Franchise cards ───────────────────────────────────────────────── -->
		{#if visibleFranchises.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each visibleFranchises as franchise (franchise.id)}
					{@const locations = franchise._count?.businesses ?? 0}
					{@const staff = franchise._count?.staff ?? 0}
					<Card.Root
						class="group flex flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
					>
						<Card.Header class="gap-0 space-y-0 pb-4">
							<div class="flex items-start gap-3">
								{#if franchise.logo}
									<Avatar.Root class="size-12 shrink-0 rounded-xl">
										<Avatar.Image src={franchise.logo} alt={franchise.name} class="object-cover" />
										<Avatar.Fallback class="rounded-xl bg-primary/10">
											<Network class="size-5 text-primary" />
										</Avatar.Fallback>
									</Avatar.Root>
								{:else}
									<span
										class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"
									>
										<Network class="size-5 text-primary" />
									</span>
								{/if}

								<div class="min-w-0 flex-1">
									<a
										href="/franchise/{franchise.slug}"
										class="truncate text-base font-semibold no-underline hover:underline"
									>
										{franchise.name}
									</a>
									<div class="mt-1 flex flex-wrap items-center gap-1.5">
										<StatusPill
											label={franchise.status}
											status={franchise.status === 'active' ? 'success' : 'warning'}
											size="sm"
										/>
									</div>
								</div>
							</div>

							{#if franchise.description}
								<p class="mt-3 line-clamp-2 text-sm text-muted-foreground">
									{franchise.description}
								</p>
							{/if}
						</Card.Header>

						<Card.Footer
							class="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4"
						>
							<div class="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
								<span class="flex items-center gap-1 tabular-nums">
									<MapPin class="size-3.5 shrink-0" />
									{locations}
									{locations === 1 ? 'location' : 'locations'}
								</span>
								<span class="flex items-center gap-1 tabular-nums">
									<Users class="size-3.5 shrink-0" />
									{staff} staff
								</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								class="shrink-0"
								href="/franchise/{franchise.slug}"
							>
								Open
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<EmptyState
				type="no-results"
				title="No franchises match your filters"
				description="Try a different search term, or clear the filters to see everything."
				actionLabel="Clear filters"
				onAction={clearFilters}
			/>
		{/if}
	{:else}
		<EmptyState
			type="empty"
			title="No franchises yet"
			description="Create your first franchise to manage multiple locations under one brand."
			actionLabel="Create franchise"
			onAction={() => goto('/franchise/create')}
			icon={Network}
		/>
	{/if}
</div>
