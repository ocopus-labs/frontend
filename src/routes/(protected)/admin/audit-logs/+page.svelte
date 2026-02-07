<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Search from '@lucide/svelte/icons/search';
	import Download from '@lucide/svelte/icons/download';
	import { toast } from 'svelte-sonner';
	import { exportAdminAuditLogs } from '$lib/api/admin';
	import { downloadBlob } from '$lib/utils/export';

	let { data }: { data: PageData } = $props();

	let resourceFilter = $state(data.filters.resource || '');
	let actionFilter = $state(data.filters.action || '');
	let startDate = $state(data.filters.startDate || '');
	let endDate = $state(data.filters.endDate || '');
	let userSearch = $state(data.filters.userId || '');

	// Detail dialog state
	let detailDialogOpen = $state(false);
	let selectedLogDetails: Record<string, unknown> | null = $state(null);
	let selectedLogAction = $state('');

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
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

	function handleResourceChange(value: string) {
		resourceFilter = value;
		updateFilters({ resource: value || undefined });
	}

	function handleActionChange(value: string) {
		actionFilter = value;
		updateFilters({ action: value || undefined });
	}

	function applyDateFilter() {
		updateFilters({
			startDate: startDate || undefined,
			endDate: endDate || undefined
		});
	}

	function applyUserSearch() {
		updateFilters({ userId: userSearch || undefined });
	}

	function handleUserSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			applyUserSearch();
		}
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	function showDetails(log: any) {
		selectedLogDetails = log.details;
		selectedLogAction = log.action;
		detailDialogOpen = true;
	}

	const resourceOptions = [
		{ value: '', label: 'All Resources' },
		{ value: 'business', label: 'Business' },
		{ value: 'user', label: 'User' },
		{ value: 'order', label: 'Order' },
		{ value: 'payment', label: 'Payment' },
		{ value: 'menu', label: 'Menu' },
		{ value: 'inventory', label: 'Inventory' },
		{ value: 'subscription', label: 'Subscription' }
	];

	const actionOptions = [
		{ value: '', label: 'All Actions' },
		{ value: 'business.create', label: 'Business Create' },
		{ value: 'business.update', label: 'Business Update' },
		{ value: 'business.delete', label: 'Business Delete' },
		{ value: 'business.status_update', label: 'Business Status Update' },
		{ value: 'order.create', label: 'Order Create' },
		{ value: 'payment.create', label: 'Payment Create' },
		{ value: 'payment.split', label: 'Payment Split' },
		{ value: 'payment.refund', label: 'Payment Refund' },
		{ value: 'user.role_update', label: 'User Role Update' },
		{ value: 'subscription.cancel', label: 'Subscription Cancel' },
		{ value: 'subscription.extend_trial', label: 'Subscription Extend Trial' }
	];

	function getActionBadgeVariant(action: string): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (action.endsWith('.create')) return 'default';
		if (action.endsWith('.delete') || action.endsWith('.cancel')) return 'destructive';
		if (action.includes('.update') || action.includes('.split') || action.includes('.extend')) return 'secondary';
		if (action.includes('.refund')) return 'destructive';
		return 'outline';
	}

	async function handleExportAuditLogs() {
		try {
			const blob = await exportAdminAuditLogs({
				userId: userSearch || undefined,
				resource: resourceFilter || undefined,
				action: actionFilter || undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined
			});
			downloadBlob(blob, `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Audit logs exported successfully');
		} catch {
			toast.error('Failed to export audit logs');
		}
	}
</script>

<svelte:head>
	<title>Audit Logs | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
			<p class="text-muted-foreground">View all system activity logs</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" size="sm" onclick={handleExportAuditLogs}>
				<Download class="mr-2 h-4 w-4" />
				Export CSV
			</Button>
			<div class="flex items-center gap-2">
				<ScrollText class="h-5 w-5 text-muted-foreground" />
				<Badge variant="secondary" class="text-lg px-4 py-2">
					{data.total} entries
				</Badge>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-wrap gap-4 items-end">
				<Select.Root type="single" value={resourceFilter} onValueChange={(v) => handleResourceChange(v)}>
					<Select.Trigger class="w-[180px]">
						{resourceOptions.find(o => o.value === resourceFilter)?.label || 'All Resources'}
					</Select.Trigger>
					<Select.Content>
						{#each resourceOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<Select.Root type="single" value={actionFilter} onValueChange={(v) => handleActionChange(v)}>
					<Select.Trigger class="w-[220px]">
						{actionOptions.find(o => o.value === actionFilter)?.label || 'All Actions'}
					</Select.Trigger>
					<Select.Content>
						{#each actionOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<div class="space-y-1">
					<Label for="startDate" class="text-xs">Start Date</Label>
					<Input type="date" id="startDate" bind:value={startDate} class="w-[150px] h-10" />
				</div>
				<div class="space-y-1">
					<Label for="endDate" class="text-xs">End Date</Label>
					<Input type="date" id="endDate" bind:value={endDate} class="w-[150px] h-10" />
				</div>
				<Button variant="outline" size="sm" onclick={applyDateFilter} class="h-10">
					Apply Dates
				</Button>

				<div class="space-y-1">
					<Label for="userSearch" class="text-xs">User ID</Label>
					<div class="flex gap-1">
						<Input
							type="text"
							id="userSearch"
							bind:value={userSearch}
							placeholder="Filter by user ID..."
							class="w-[200px] h-10"
							onkeydown={handleUserSearchKeydown}
						/>
						<Button variant="outline" size="icon" class="h-10 w-10" onclick={applyUserSearch} aria-label="Search user">
							<Search class="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Table -->
	<Card.Root>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Time</Table.Head>
					<Table.Head>User</Table.Head>
					<Table.Head>Action</Table.Head>
					<Table.Head>Resource</Table.Head>
					<Table.Head>Business</Table.Head>
					<Table.Head>Details</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.data as log}
					<Table.Row>
						<Table.Cell class="text-muted-foreground text-sm whitespace-nowrap">
							{formatDate(log.createdAt)}
						</Table.Cell>
						<Table.Cell>
							{#if log.user}
								<div>
									<p class="text-sm">{log.user.name || 'Unnamed'}</p>
									<p class="text-xs text-muted-foreground">{log.user.email}</p>
								</div>
							{:else}
								<span class="text-muted-foreground text-sm">System</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<Badge variant={getActionBadgeVariant(log.action)}>
								{log.action}
							</Badge>
						</Table.Cell>
						<Table.Cell class="capitalize">{log.resource}</Table.Cell>
						<Table.Cell>
							{#if log.restaurant}
								<a
									href="/admin/businesses/{log.restaurant.id}"
									class="text-sm hover:underline"
								>
									{log.restaurant.name}
								</a>
							{:else}
								<span class="text-muted-foreground text-sm">-</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if log.details}
								<button
									onclick={() => showDetails(log)}
									class="text-left cursor-pointer hover:bg-muted rounded px-1 py-0.5 transition-colors"
								>
									<code class="text-xs bg-muted px-1 py-0.5 rounded">
										{JSON.stringify(log.details).slice(0, 50)}{JSON.stringify(log.details).length > 50 ? '...' : ''}
									</code>
								</button>
							{:else}
								<span class="text-muted-foreground text-sm">-</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="text-center py-12 text-muted-foreground">
							No audit logs found
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
				Showing {(data.page - 1) * data.limit + 1} to {Math.min(
					data.page * data.limit,
					data.total
				)} of {data.total} logs
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
				<span class="text-sm">
					Page {data.page} of {data.totalPages}
				</span>
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

<!-- Detail Dialog -->
<Dialog.Root bind:open={detailDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Audit Log Details</Dialog.Title>
			<Dialog.Description>
				Details for action: <Badge variant="outline">{selectedLogAction}</Badge>
			</Dialog.Description>
		</Dialog.Header>
		<div class="max-h-[400px] overflow-auto">
			<pre class="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLogDetails, null, 2)}</pre>
		</div>
	</Dialog.Content>
</Dialog.Root>
