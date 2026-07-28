<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import BulkActionBar from '$lib/components/admin/bulk-action-bar.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import { bulkUserAction, impersonateUser } from '$lib/api/admin';
	import type { PageData } from './$types';

	import { SearchInput, FilterBar, FilterDropdown, type Filter } from '$lib/components/search';
	import { StatusPill, EmptyState, LiveCounter } from '$lib/components/data-display';

	import Eye from '@lucide/svelte/icons/eye';
	import Shield from '@lucide/svelte/icons/shield';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import MailX from '@lucide/svelte/icons/mail-x';
	import Users from '@lucide/svelte/icons/users';
	import UserRoundCog from '@lucide/svelte/icons/user-round-cog';
	import Download from '@lucide/svelte/icons/download';
	import { exportAdminUsers } from '$lib/api/admin';
	import { downloadBlob } from '$lib/utils/export';
	import { formatDate } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state(data.filters.search || '');
	let statusFilter = $state(data.filters.banned || '');
	let roleFilter = $state(data.filters.role || '');

	// Bulk selection state
	let selectedIds = $state<Set<string>>(new Set());
	let bulkDialogOpen = $state(false);
	let bulkAction = $state('');

	const allSelected = $derived(
		data.data.length > 0 && data.data.every((u: any) => selectedIds.has(u.id))
	);

	const someSelected = $derived(
		data.data.length > 0 && data.data.some((u: any) => selectedIds.has(u.id)) && !allSelected
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
			selectedIds = new Set(data.data.map((u: any) => u.id));
		}
	}

	function handleBulkAction(action: string) {
		bulkAction = action;
		bulkDialogOpen = true;
	}

	async function confirmBulkAction() {
		try {
			const result = await bulkUserAction({ ids: [...selectedIds], action: bulkAction });
			toast.success(
				`${result.processed} user${result.processed !== 1 ? 's' : ''} ${bulkAction === 'ban' ? 'banned' : 'unbanned'}`
			);
			if (result.failed > 0) {
				toast.warning(`${result.failed} user${result.failed !== 1 ? 's' : ''} failed to update`);
			}
			selectedIds = new Set();
			bulkDialogOpen = false;
			await invalidate('app:admin-users');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Bulk action failed'));
		}
	}

	// Impersonation state
	let impersonateDialogOpen = $state(false);
	let impersonateTargetId = $state('');
	let impersonateTargetName = $state('');
	let impersonating = $state(false);

	function triggerImpersonate(userId: string, userName: string) {
		impersonateTargetId = userId;
		impersonateTargetName = userName;
		impersonateDialogOpen = true;
	}

	async function confirmImpersonate() {
		if (impersonating) return;
		impersonating = true;
		try {
			await impersonateUser(impersonateTargetId);
			toast.success(`Now impersonating ${impersonateTargetName}`);
			// Hard redirect to pick up new cookies
			window.location.href = '/dashboard';
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to start impersonation'));
			impersonating = false;
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

	import { ALL_ROLE_OPTIONS } from '$lib/constants/domain';
	const roleOptions = ALL_ROLE_OPTIONS;

	// Active filters for chips
	const activeFilters = $derived<Filter[]>([
		...(searchQuery ? [{ id: 'search', label: 'Search', value: searchQuery }] : []),
		...(statusFilter
			? [
					{
						id: 'status',
						label: 'Status',
						value: statusFilter === 'true' ? 'Banned' : 'Active',
						variant: (statusFilter === 'true' ? 'destructive' : 'primary') as Filter['variant']
					}
				]
			: []),
		...(roleFilter
			? [
					{
						id: 'role',
						label: 'Role',
						value: roleOptions.find((r) => r.value === roleFilter)?.label || roleFilter
					}
				]
			: [])
	]);

	function getRoleBadgeVariant(
		role: string | null
	): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (role === 'super_admin') return 'destructive';
		if (role === 'franchise_owner') return 'default';
		return 'secondary';
	}

	async function handleExportUsers() {
		try {
			const blob = await exportAdminUsers({
				banned: statusFilter || undefined,
				search: searchQuery || undefined,
				role: roleFilter || undefined
			});
			downloadBlob(blob, `users-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Users exported successfully');
		} catch {
			toast.error('Failed to export users');
		}
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
			<Button variant="outline" size="sm" onclick={handleExportUsers}>
				<Download class="mr-2 h-4 w-4" />
				Export CSV
			</Button>
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
					<Table.Head class="w-[40px]">
						<Checkbox
							checked={allSelected}
							indeterminate={someSelected}
							onCheckedChange={toggleSelectAll}
							aria-label="Select all users"
						/>
					</Table.Head>
					<Table.Head>User</Table.Head>
					<Table.Head>Role</Table.Head>
					<Table.Head>Email</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Businesses</Table.Head>
					<Table.Head class="text-right">Orders</Table.Head>
					<Table.Head>Joined</Table.Head>
					<Table.Head class="w-[100px]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.data as user}
					<Table.Row class="group">
						<Table.Cell>
							<Checkbox
								checked={selectedIds.has(user.id)}
								onCheckedChange={() => toggleSelect(user.id)}
								aria-label="Select {user.name || user.email}"
							/>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<Avatar.Root class="h-10 w-10 ring-2 ring-background">
									<Avatar.Image src={user.image || undefined} alt={user.name || user.email} />
									<Avatar.Fallback>{getInitials(user.name, user.email)}</Avatar.Fallback>
								</Avatar.Root>
								<div>
									<a href="/admin/users/{user.id}" class="font-medium hover:underline">
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
										<Shield class="mr-1 h-3 w-3" />
									{/if}
									{user.role.replace('_', ' ')}
								</Badge>
							{:else}
								<span class="text-sm text-muted-foreground">No role</span>
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
						<Table.Cell class="text-sm text-muted-foreground">
							{formatDate(user.createdAt)}
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									href="/admin/users/{user.id}"
									aria-label="View user details"
								>
									<Eye class="h-4 w-4" />
								</Button>
								{#if user.role !== 'super_admin'}
									<Button
										variant="ghost"
										size="icon"
										onclick={() => triggerImpersonate(user.id, user.name || user.email)}
										aria-label="Impersonate {user.name || user.email}"
									>
										<UserRoundCog class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={9}>
							<EmptyState
								type="no-results"
								title="No users found"
								description={searchQuery || statusFilter || roleFilter
									? 'Try adjusting your search or filters'
									: 'No users have registered yet'}
								actionLabel={searchQuery || statusFilter || roleFilter
									? 'Clear filters'
									: undefined}
								onAction={searchQuery || statusFilter || roleFilter
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
		{ label: 'Ban Selected', value: 'ban', variant: 'destructive' },
		{ label: 'Unban Selected', value: 'unban' }
	]}
	onAction={handleBulkAction}
	onClear={() => (selectedIds = new Set())}
/>

<!-- Bulk Action Confirm Dialog -->
<ConfirmDialog
	bind:open={bulkDialogOpen}
	title={bulkAction === 'ban' ? 'Ban Selected Users' : 'Unban Selected Users'}
	description={bulkAction === 'ban'
		? `Are you sure you want to ban ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}? They will be unable to access the platform.`
		: `Are you sure you want to unban ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}?`}
	confirmLabel={bulkAction === 'ban'
		? `Ban ${selectedIds.size} Users`
		: `Unban ${selectedIds.size} Users`}
	variant={bulkAction === 'ban' ? 'destructive' : 'default'}
	onConfirm={confirmBulkAction}
/>

<!-- Impersonation Confirm Dialog -->
<ConfirmDialog
	bind:open={impersonateDialogOpen}
	title="Impersonate User"
	description="You are about to log in as {impersonateTargetName}. You will see the platform exactly as they see it. All actions you take will be performed as this user. Use the yellow banner at the top of the page to stop impersonation and return to your admin session."
	confirmLabel={impersonating ? 'Starting...' : 'Start Impersonation'}
	variant="default"
	onConfirm={confirmImpersonate}
/>
