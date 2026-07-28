<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import BulkActionBar from '$lib/components/admin/bulk-action-bar.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import { bulkBusinessAction } from '$lib/api/admin';
	import type { PageData } from './$types';

	import { SearchInput, FilterBar, FilterDropdown, type Filter } from '$lib/components/search';
	import { StatusPill, EmptyState, LiveCounter } from '$lib/components/data-display';

	import Eye from '@lucide/svelte/icons/eye';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Download from '@lucide/svelte/icons/download';
	import { exportAdminBusinesses } from '$lib/api/admin';
	import { downloadBlob } from '$lib/utils/export';
	import { formatDate } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state(data.filters.search || '');
	let statusFilter = $state(data.filters.status || '');
	let typeFilter = $state(data.filters.type || '');

	// Bulk selection state
	let selectedIds = $state<Set<string>>(new Set());
	let bulkDialogOpen = $state(false);
	let bulkAction = $state('');

	const allSelected = $derived(
		data.data.length > 0 && data.data.every((b: any) => selectedIds.has(b.id))
	);

	const someSelected = $derived(
		data.data.length > 0 && data.data.some((b: any) => selectedIds.has(b.id)) && !allSelected
	);

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(data.data.map((b: any) => b.id));
		}
	}

	function handleBulkAction(action: string) {
		bulkAction = action;
		bulkDialogOpen = true;
	}

	async function confirmBulkAction() {
		try {
			const result = await bulkBusinessAction({ ids: [...selectedIds], action: bulkAction });
			toast.success(
				`${result.processed} business${result.processed !== 1 ? 'es' : ''} ${bulkAction === 'suspend' ? 'suspended' : 'activated'}`
			);
			if (result.failed > 0) {
				toast.warning(
					`${result.failed} business${result.failed !== 1 ? 'es' : ''} failed to update`
				);
			}
			selectedIds = new Set();
			bulkDialogOpen = false;
			await invalidate('app:admin-businesses');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Bulk action failed'));
		}
	}

	// Debounced search effect
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		// Don't run on initial load if search matches URL
		if (searchQuery === (data.filters.search || '')) return;

		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			updateFilters({ search: searchQuery || undefined });
		}, 300);
	});

	function updateFilters(updates: Record<string, string | undefined>) {
		const params = new URLSearchParams($page.url.searchParams);
		for (const [key, value] of Object.entries(updates)) {
			if (value) {
				params.set(key, value);
			} else {
				params.delete(key);
			}
		}
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleSearch(query: string) {
		searchQuery = query;
		updateFilters({ search: query || undefined });
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		updateFilters({ status: value || undefined });
	}

	function handleTypeChange(value: string) {
		typeFilter = value;
		updateFilters({ type: value || undefined });
	}

	function handleClearFilters() {
		searchQuery = '';
		statusFilter = '';
		typeFilter = '';
		goto('/admin/businesses');
	}

	function handleRemoveFilter(id: string) {
		if (id === 'search') {
			searchQuery = '';
			updateFilters({ search: undefined });
		} else if (id === 'status') {
			statusFilter = '';
			updateFilters({ status: undefined });
		} else if (id === 'type') {
			typeFilter = '';
			updateFilters({ type: undefined });
		}
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	// Filter options
	const statusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'suspended', label: 'Suspended' },
		{ value: 'inactive', label: 'Inactive' }
	];

	const typeOptions = [
		{ value: 'restaurant', label: 'Restaurant' },
		{ value: 'salon', label: 'Salon' },
		{ value: 'gym', label: 'Gym' },
		{ value: 'cafe', label: 'Cafe' },
		{ value: 'retail', label: 'Retail' }
	];

	// Active filters for chips
	const activeFilters = $derived<Filter[]>([
		...(searchQuery ? [{ id: 'search', label: 'Search', value: searchQuery }] : []),
		...(statusFilter
			? [
					{
						id: 'status',
						label: 'Status',
						value: statusOptions.find((s) => s.value === statusFilter)?.label || statusFilter,
						variant: (statusFilter === 'active'
							? 'primary'
							: statusFilter === 'suspended'
								? 'destructive'
								: 'default') as Filter['variant']
					}
				]
			: []),
		...(typeFilter
			? [
					{
						id: 'type',
						label: 'Type',
						value: typeOptions.find((t) => t.value === typeFilter)?.label || typeFilter
					}
				]
			: [])
	]);

	// Business type icons
	const typeIcons: Record<string, typeof Building2> = {
		restaurant: UtensilsCrossed,
		cafe: Coffee,
		salon: Scissors,
		gym: Dumbbell,
		retail: Store
	};

	function getTypeIcon(type: string) {
		return typeIcons[type] || Building2;
	}

	function getStatusPillStatus(status: string): 'success' | 'error' | 'warning' {
		if (status === 'active') return 'success';
		if (status === 'suspended') return 'error';
		return 'warning';
	}

	async function handleExportBusinesses() {
		try {
			const blob = await exportAdminBusinesses({
				status: statusFilter || undefined,
				type: typeFilter || undefined,
				search: searchQuery || undefined
			});
			downloadBlob(blob, `businesses-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Businesses exported successfully');
		} catch {
			toast.error('Failed to export businesses');
		}
	}
</script>

<svelte:head>
	<title>Manage Businesses | Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Businesses</h1>
			<p class="text-muted-foreground">Manage all businesses on the platform</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" size="sm" onclick={handleExportBusinesses}>
				<Download class="mr-2 h-4 w-4" />
				Export CSV
			</Button>
			<div class="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
				<Building2 class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-medium">
					<LiveCounter value={data.total} /> businesses
				</span>
			</div>
		</div>
	</div>

	<!-- Search and Filters -->
	<FilterBar
		filters={activeFilters}
		showFilterButton={false}
		onRemoveFilter={handleRemoveFilter}
		onClearAll={handleClearFilters}
	>
		{#snippet leading()}
			<SearchInput
				bind:value={searchQuery}
				placeholder="Search by name or slug..."
				debounceMs={300}
				showShortcut
				shortcut="/"
				resultCount={searchQuery ? data.total : null}
				onClear={() => handleSearch('')}
			/>
		{/snippet}

		{#snippet trailing()}
			<div class="flex items-center gap-2">
				<FilterDropdown
					options={statusOptions}
					value={statusFilter}
					placeholder="Status"
					allOptionLabel="All Statuses"
					onValueChange={handleStatusChange}
				/>
				<FilterDropdown
					options={typeOptions}
					value={typeFilter}
					placeholder="Type"
					allOptionLabel="All Types"
					onValueChange={handleTypeChange}
				/>
			</div>
		{/snippet}
	</FilterBar>

	<!-- Table -->
	<Card.Root>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[40px]">
						<Checkbox
							checked={allSelected}
							indeterminate={someSelected}
							onCheckedChange={toggleSelectAll}
							aria-label="Select all businesses"
						/>
					</Table.Head>
					<Table.Head>Business</Table.Head>
					<Table.Head>Type</Table.Head>
					<Table.Head>Owner</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Orders</Table.Head>
					<Table.Head class="text-right">Team</Table.Head>
					<Table.Head>Created</Table.Head>
					<Table.Head class="w-[80px]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.data as business}
					{@const TypeIcon = getTypeIcon(business.type)}
					<Table.Row class="group">
						<Table.Cell>
							<Checkbox
								checked={selectedIds.has(business.id)}
								onCheckedChange={() => toggleSelect(business.id)}
								aria-label="Select {business.name}"
							/>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted ring-2 ring-background"
								>
									{#if business.logo}
										<img
											src={business.logo}
											alt={business.name}
											loading="lazy"
											class="h-10 w-10 rounded-lg object-cover"
										/>
									{:else}
										<TypeIcon class="h-5 w-5 text-muted-foreground" />
									{/if}
								</div>
								<div>
									<a href="/admin/businesses/{business.id}" class="font-medium hover:underline">
										{business.name}
									</a>
									<p class="text-xs text-muted-foreground">{business.slug}</p>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class="gap-1 capitalize">
								<TypeIcon class="h-3 w-3" />
								{business.type}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							<div>
								<p class="text-sm">{business.owner.name || 'Unnamed'}</p>
								<p class="text-xs text-muted-foreground">{business.owner.email}</p>
							</div>
						</Table.Cell>
						<Table.Cell>
							<StatusPill
								label={business.status}
								status={getStatusPillStatus(business.status)}
								size="sm"
							/>
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{business._count.orders}</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{business._count.businessUsers}</Table.Cell>
						<Table.Cell class="text-sm text-muted-foreground">
							{formatDate(business.createdAt)}
						</Table.Cell>
						<Table.Cell>
							<Button
								variant="ghost"
								size="sm"
								href="/admin/businesses/{business.id}"
								class="opacity-0 transition-opacity group-hover:opacity-100"
							>
								<Eye class="h-4 w-4" />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={9}>
							<EmptyState
								type="no-results"
								title="No businesses found"
								description={searchQuery || statusFilter || typeFilter
									? 'Try adjusting your search or filters'
									: 'No businesses have been registered yet'}
								actionLabel={searchQuery || statusFilter || typeFilter
									? 'Clear filters'
									: undefined}
								onAction={searchQuery || statusFilter || typeFilter
									? handleClearFilters
									: undefined}
								size="sm"
							/>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Root>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Showing <span class="font-medium">{(data.page - 1) * data.limit + 1}</span> to
				<span class="font-medium">{Math.min(data.page * data.limit, data.total)}</span> of
				<span class="font-medium">{data.total}</span> businesses
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={data.page <= 1}
					onclick={() => goToPage(data.page - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</Button>

				<!-- Page numbers -->
				<div class="flex items-center gap-1">
					{#each Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
						const start = Math.max(1, Math.min(data.page - 2, data.totalPages - 4));
						return start + i;
					}) as pageNum}
						<Button
							variant={pageNum === data.page ? 'default' : 'ghost'}
							size="sm"
							class="w-9"
							onclick={() => goToPage(pageNum)}
						>
							{pageNum}
						</Button>
					{/each}
				</div>

				<Button
					variant="outline"
					size="sm"
					disabled={data.page >= data.totalPages}
					onclick={() => goToPage(data.page + 1)}
				>
					Next
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- Bulk Action Bar -->
<BulkActionBar
	selectedCount={selectedIds.size}
	actions={[
		{ label: 'Suspend Selected', value: 'suspend', variant: 'destructive' },
		{ label: 'Activate Selected', value: 'activate' }
	]}
	onAction={handleBulkAction}
	onClear={() => (selectedIds = new Set())}
/>

<!-- Bulk Action Confirm Dialog -->
<ConfirmDialog
	bind:open={bulkDialogOpen}
	title={bulkAction === 'suspend' ? 'Suspend Selected Businesses' : 'Activate Selected Businesses'}
	description={bulkAction === 'suspend'
		? `Are you sure you want to suspend ${selectedIds.size} business${selectedIds.size !== 1 ? 'es' : ''}? They will be unable to operate until reactivated.`
		: `Are you sure you want to activate ${selectedIds.size} business${selectedIds.size !== 1 ? 'es' : ''}?`}
	confirmLabel={bulkAction === 'suspend'
		? `Suspend ${selectedIds.size} Businesses`
		: `Activate ${selectedIds.size} Businesses`}
	variant={bulkAction === 'suspend' ? 'destructive' : 'default'}
	onConfirm={confirmBulkAction}
/>
