<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	import {
		SearchInput,
		FilterBar,
		FilterDropdown,
		type Filter
	} from '$lib/components/search';
	import { StatusPill, EmptyState, LiveCounter } from '$lib/components/data-display';

	import Eye from '@lucide/svelte/icons/eye';
	import Shield from '@lucide/svelte/icons/shield';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import MailX from '@lucide/svelte/icons/mail-x';
	import Users from '@lucide/svelte/icons/users';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state(data.filters.search || '');
	let statusFilter = $state(data.filters.banned || '');
	let roleFilter = $state(data.filters.role || '');

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

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getInitials(name: string | null, email: string): string {
		if (name) {
			return name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return email[0].toUpperCase();
	}

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
		updateFilters({ banned: value || undefined });
	}

	function handleRoleChange(value: string) {
		roleFilter = value;
		updateFilters({ role: value || undefined });
	}

	function handleClearFilters() {
		searchQuery = '';
		statusFilter = '';
		roleFilter = '';
		goto('/admin/users');
	}

	function handleRemoveFilter(id: string) {
		if (id === 'search') {
			searchQuery = '';
			updateFilters({ search: undefined });
		} else if (id === 'status') {
			statusFilter = '';
			updateFilters({ banned: undefined });
		} else if (id === 'role') {
			roleFilter = '';
			updateFilters({ role: undefined });
		}
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	// Filter options
	const statusOptions = [
		{ value: 'false', label: 'Active' },
		{ value: 'true', label: 'Banned' }
	];

	const roleOptions = [
		{ value: 'super_admin', label: 'Super Admin' },
		{ value: 'franchise_owner', label: 'Franchise Owner' },
		{ value: 'restaurant_owner', label: 'Business Owner' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'staff', label: 'Staff' }
	];

	// Active filters for chips
	const activeFilters = $derived<Filter[]>([
		...(searchQuery ? [{ id: 'search', label: 'Search', value: searchQuery }] : []),
		...(statusFilter ? [{
			id: 'status',
			label: 'Status',
			value: statusFilter === 'true' ? 'Banned' : 'Active',
			variant: statusFilter === 'true' ? 'destructive' : 'primary' as const
		}] : []),
		...(roleFilter ? [{
			id: 'role',
			label: 'Role',
			value: roleOptions.find(r => r.value === roleFilter)?.label || roleFilter
		}] : [])
	]);

	function getRoleBadgeVariant(role: string | null): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (role === 'super_admin') return 'destructive';
		if (role === 'franchise_owner') return 'default';
		return 'secondary';
	}
</script>

<svelte:head>
	<title>Manage Users | Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Users</h1>
			<p class="text-muted-foreground">Manage all users on the platform</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
				<Users class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-medium">
					<LiveCounter value={data.total} /> users
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
				placeholder="Search by name or email..."
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
					allOptionLabel="All Users"
					onValueChange={handleStatusChange}
				/>
				<FilterDropdown
					options={roleOptions}
					value={roleFilter}
					placeholder="Role"
					allOptionLabel="All Roles"
					onValueChange={handleRoleChange}
				/>
			</div>
		{/snippet}
	</FilterBar>

	<!-- Table -->
	<Card.Root>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>User</Table.Head>
					<Table.Head>Role</Table.Head>
					<Table.Head>Email</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Businesses</Table.Head>
					<Table.Head class="text-right">Orders</Table.Head>
					<Table.Head>Joined</Table.Head>
					<Table.Head class="w-[80px]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.data as user}
					<Table.Row class="group">
						<Table.Cell>
							<div class="flex items-center gap-3">
								<Avatar.Root class="h-10 w-10 ring-2 ring-background">
									<Avatar.Image src={user.image || undefined} alt={user.name || user.email} />
									<Avatar.Fallback>{getInitials(user.name, user.email)}</Avatar.Fallback>
								</Avatar.Root>
								<div>
									<a
										href="/admin/users/{user.id}"
										class="font-medium hover:underline"
									>
										{user.name || 'Unnamed User'}
									</a>
									<p class="text-xs text-muted-foreground">{user.email}</p>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if user.role}
								<Badge variant={getRoleBadgeVariant(user.role)} class="capitalize">
									{#if user.role === 'super_admin'}
										<Shield class="h-3 w-3 mr-1" />
									{/if}
									{user.role.replace('_', ' ')}
								</Badge>
							{:else}
								<span class="text-muted-foreground text-sm">No role</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if user.emailVerified}
								<StatusPill label="Verified" status="success" size="sm" />
							{:else}
								<StatusPill label="Unverified" status="warning" size="sm" />
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if user.banned}
								<StatusPill label="Banned" status="error" size="sm" />
							{:else}
								<StatusPill label="Active" status="success" size="sm" />
							{/if}
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{user._count.businessUsers}</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{user._count.orders}</Table.Cell>
						<Table.Cell class="text-muted-foreground text-sm">
							{formatDate(user.createdAt)}
						</Table.Cell>
						<Table.Cell>
							<Button
								variant="ghost"
								size="sm"
								href="/admin/users/{user.id}"
								class="opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<Eye class="h-4 w-4" />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={8}>
							<EmptyState
								type="no-results"
								title="No users found"
								description={searchQuery || statusFilter || roleFilter
									? "Try adjusting your search or filters"
									: "No users have registered yet"}
								actionLabel={searchQuery || statusFilter || roleFilter ? "Clear filters" : undefined}
								onAction={searchQuery || statusFilter || roleFilter ? handleClearFilters : undefined}
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
				<span class="font-medium">{data.total}</span> users
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
							variant={pageNum === data.page ? "default" : "ghost"}
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
