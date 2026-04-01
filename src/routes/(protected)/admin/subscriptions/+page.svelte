<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import BulkActionBar from '$lib/components/admin/bulk-action-bar.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import type { PageData } from './$types';

	import { formatCurrency } from '$lib/utils/i18n';
	import { formatDate, getStatusBadgeVariant } from '$lib/utils/formatting';
	import { cancelAdminSubscription, extendAdminTrial, bulkSubscriptionAction } from '$lib/api/admin';

	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import Download from '@lucide/svelte/icons/download';
	import { exportAdminSubscriptions } from '$lib/api/admin';
	import { downloadBlob } from '$lib/utils/export';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state(data.filters.status || '');

	// Cancel dialog state
	let cancelDialogOpen = $state(false);
	let cancelTargetId = $state('');
	let cancelTargetName = $state('');

	// Extend trial dialog state
	let extendDialogOpen = $state(false);
	let extendTargetId = $state('');
	let extendTargetName = $state('');
	let extendDays = $state(7);

	let isActioning = $state(false);

	// Bulk selection state
	let selectedIds = $state<Set<string>>(new Set());
	let bulkDialogOpen = $state(false);
	let bulkAction = $state('');

	const allSelected = $derived(
		data.data.length > 0 && data.data.every((s: any) => selectedIds.has(s.id))
	);

	const someSelected = $derived(
		data.data.length > 0 && data.data.some((s: any) => selectedIds.has(s.id)) && !allSelected
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
			selectedIds = new Set(data.data.map((s: any) => s.id));
		}
	}

	function handleBulkAction(action: string) {
		bulkAction = action;
		bulkDialogOpen = true;
	}

	async function confirmBulkAction() {
		try {
			const result = await bulkSubscriptionAction({ ids: [...selectedIds], action: bulkAction });
			toast.success(`${result.processed} subscription${result.processed !== 1 ? 's' : ''} canceled`);
			if (result.failed > 0) {
				toast.warning(`${result.failed} subscription${result.failed !== 1 ? 's' : ''} failed to cancel`);
			}
			selectedIds = new Set();
			bulkDialogOpen = false;
			await invalidate('app:subscriptions');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Bulk action failed'));
		}
	}

	function formatCurrencyValue(value: string | number, currency: string = 'USD'): string {
		return formatCurrency(Number(value), currency as any);
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

	function handleStatusChange(value: string) {
		statusFilter = value;
		updateFilters({ status: value || undefined });
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	function triggerCancel(id: string, userName: string) {
		cancelTargetId = id;
		cancelTargetName = userName;
		cancelDialogOpen = true;
	}

	async function confirmCancel() {
		isActioning = true;
		try {
			await cancelAdminSubscription(cancelTargetId);
			toast.success('Subscription canceled');
			await invalidate('app:subscriptions');
		} catch {
			toast.error('Failed to cancel subscription');
		} finally {
			isActioning = false;
		}
	}

	function triggerExtendTrial(id: string, userName: string) {
		extendTargetId = id;
		extendTargetName = userName;
		extendDays = 7;
		extendDialogOpen = true;
	}

	async function confirmExtendTrial() {
		isActioning = true;
		try {
			await extendAdminTrial(extendTargetId, extendDays);
			toast.success(`Trial extended by ${extendDays} days`);
			await invalidate('app:subscriptions');
		} catch {
			toast.error('Failed to extend trial');
		} finally {
			isActioning = false;
		}
	}

	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'canceled', label: 'Canceled' },
		{ value: 'past_due', label: 'Past Due' },
		{ value: 'trialing', label: 'Trialing' }
	];

	async function handleExportSubscriptions() {
		try {
			const blob = await exportAdminSubscriptions({
				status: statusFilter || undefined
			});
			downloadBlob(blob, `subscriptions-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Subscriptions exported successfully');
		} catch {
			toast.error('Failed to export subscriptions');
		}
	}
</script>

<svelte:head>
	<title>Subscriptions | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Subscriptions</h1>
			<p class="text-muted-foreground">Manage all platform subscriptions</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" size="sm" onclick={handleExportSubscriptions}>
				<Download class="mr-2 h-4 w-4" />
				Export CSV
			</Button>
			<Badge variant="secondary" class="text-lg px-4 py-2">
				{data.total} total
			</Badge>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-wrap gap-4">
				<Select.Root type="single" value={statusFilter} onValueChange={(v) => handleStatusChange(v)}>
					<Select.Trigger class="w-[180px]">
						{statusOptions.find(o => o.value === statusFilter)?.label || 'All Statuses'}
					</Select.Trigger>
					<Select.Content>
						{#each statusOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Table -->
	<Card.Root>
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[40px]">
							<Checkbox
								checked={allSelected}
								indeterminate={someSelected}
								onCheckedChange={toggleSelectAll}
								aria-label="Select all subscriptions"
							/>
						</Table.Head>
						<Table.Head>User</Table.Head>
						<Table.Head>Plan</Table.Head>
						<Table.Head>Price</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Period End</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head class="w-[140px]">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.data as subscription}
						<Table.Row>
							<Table.Cell>
								<Checkbox
									checked={selectedIds.has(subscription.id)}
									onCheckedChange={() => toggleSelect(subscription.id)}
									aria-label="Select subscription for {subscription.user.name || subscription.user.email}"
								/>
							</Table.Cell>
							<Table.Cell>
								<div>
									<a
										href="/admin/users/{subscription.user.id}"
										class="font-medium hover:underline"
									>
										{subscription.user.name || 'Unnamed User'}
									</a>
									<p class="text-xs text-muted-foreground">{subscription.user.email}</p>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<CreditCard class="h-4 w-4 text-muted-foreground" />
									<span class="font-medium">{subscription.plan.displayName}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="font-mono">
								{formatCurrencyValue(subscription.plan.priceMonthly, subscription.plan.currency || 'USD')}/mo
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusBadgeVariant(subscription.status)}>
									{subscription.status}
								</Badge>
								{#if subscription.cancelAtPeriodEnd}
									<Badge variant="outline" class="ml-1">Canceling</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm">
								{formatDate(subscription.currentPeriodEnd)}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm">
								{formatDate(subscription.createdAt)}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									{#if subscription.status === 'active' && !subscription.cancelAtPeriodEnd}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => triggerCancel(subscription.id, subscription.user.name || subscription.user.email)}
											disabled={isActioning}
											aria-label="Cancel subscription"
										>
											<XCircle class="h-4 w-4 text-destructive" />
										</Button>
									{/if}
									{#if subscription.status === 'trialing'}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => triggerExtendTrial(subscription.id, subscription.user.name || subscription.user.email)}
											disabled={isActioning}
											aria-label="Extend trial"
										>
											<CalendarPlus class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={8} class="text-center py-12 text-muted-foreground">
								No subscriptions found
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Root>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Showing {(data.page - 1) * data.limit + 1} to {Math.min(
					data.page * data.limit,
					data.total
				)} of {data.total} subscriptions
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

<!-- Bulk Action Bar -->
<BulkActionBar
	selectedCount={selectedIds.size}
	actions={[
		{ label: 'Cancel Selected', value: 'cancel', variant: 'destructive' }
	]}
	onAction={handleBulkAction}
	onClear={() => (selectedIds = new Set())}
/>

<!-- Bulk Cancel Confirm Dialog -->
<ConfirmDialog
	bind:open={bulkDialogOpen}
	title="Cancel Selected Subscriptions"
	description={`Are you sure you want to cancel ${selectedIds.size} subscription${selectedIds.size !== 1 ? 's' : ''}? This will take effect at the end of each billing period.`}
	confirmLabel={`Cancel ${selectedIds.size} Subscriptions`}
	variant="destructive"
	onConfirm={confirmBulkAction}
/>

<!-- Cancel Subscription Dialog -->
<ConfirmDialog
	bind:open={cancelDialogOpen}
	title="Cancel Subscription"
	description="Are you sure you want to cancel the subscription for {cancelTargetName}? This will take effect at the end of the current billing period."
	confirmLabel="Cancel Subscription"
	variant="destructive"
	onConfirm={confirmCancel}
/>

<!-- Extend Trial Dialog -->
<ConfirmDialog
	bind:open={extendDialogOpen}
	title="Extend Trial"
	description="Extend the trial period for {extendTargetName} by {extendDays} days."
	confirmLabel="Extend Trial"
	showInput={true}
	inputLabel="Days to extend (1-90)"
	inputPlaceholder="7"
	onConfirm={(val) => { extendDays = Number(val) || 7; confirmExtendTrial(); }}
/>
