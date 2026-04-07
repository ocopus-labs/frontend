<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { IconCheck, IconEye, IconPrinter, IconRefresh } from '@tabler/icons-svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { invalidate, invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { updateOrderStatus, acceptQrOrder, rejectQrOrder } from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import type { Order } from '$lib/api/order';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { formatOrderType } from '$lib/utils/formatting';
	import { canModify } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	const userRole = $derived((data as any).userRole as string ?? '');

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	// Transform API orders to display format
	let orders = $derived(
		(data.orders || []).map((order: Order) => ({
			id: order.orderNumber,
			orderId: order.id,
			customer: order.customerInfo?.name || 'Walk-in',
			table: order.tableNumber || (order.orderType === 'dine_in' ? 'Table' : order.orderType.replace('_', ' ')),
			type: formatOrderType(order.orderType),
			status: order.status,
			total: order.pricing.total,
			date: new Date(order.createdAt).toLocaleDateString(),
			time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			items: order.items.length,
			orderSource: order.orderSource
		}))
	);

	let searchQuery = $state('');
	let statusFilter = $state('all');
	let typeFilter = $state('all');
	let isRefreshing = $state(false);

	// Filter orders based on search and filters
	const filteredOrders = $derived(
		orders.filter((order) => {
			const matchesSearch =
				order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				order.customer.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
			const matchesType = typeFilter === 'all' || order.type === typeFilter;
			return matchesSearch && matchesStatus && matchesType;
		})
	);

	function getStatusPillStatus(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
		switch (status) {
			case 'completed': return 'success';
			case 'ready': return 'success';
			case 'serving': return 'success';
			case 'preparing': return 'warning';
			case 'active': return 'info';
			case 'pending_approval': return 'warning';
			case 'pending': return 'neutral';
			case 'cancelled': return 'error';
			case 'refunded': return 'error';
			default: return 'neutral';
		}
	}

	function viewOrder(orderId: string) {
		goto(`/${$page.params.business}/${$page.params.slug}/orders/${orderId}`);
	}

	function printOrder(orderId: string) {
		goto(`/${$page.params.business}/${$page.params.slug}/orders/${orderId}?print=true`);
	}

	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:orders');
		isRefreshing = false;
	}

	// Pull-to-refresh on mobile
	let pullStartY = 0;
	let pulling = $state(false);
	function onPullStart(e: TouchEvent) {
		const el = e.currentTarget as HTMLElement;
		if (el.scrollTop === 0) pullStartY = e.touches[0].clientY;
		else pullStartY = 0;
	}
	function onPullMove(e: TouchEvent) {
		if (pullStartY === 0 || isRefreshing) return;
		const dy = e.touches[0].clientY - pullStartY;
		if (dy > 80) pulling = true;
	}
	async function onPullEnd() {
		if (pulling) {
			pulling = false;
			await refreshOrders();
		}
		pullStartY = 0;
	}

	// Mark Complete state
	let completeDialogOpen = $state(false);
	let completeTargetId = $state('');

	function triggerCompleteOrder(orderId: string) {
		completeTargetId = orderId;
		completeDialogOpen = true;
	}

	async function confirmCompleteOrder() {
		if (!completeTargetId) return;

		try {
			const businessId = ($page.data.business as any).id;
			await updateOrderStatus(businessId, completeTargetId, 'completed');
			toast.success('Order marked as completed!');
			completeDialogOpen = false;
			completeTargetId = '';
			await invalidate('app:orders');
		} catch (error: any) {
			toast.error(userFriendlyError(error, 'Failed to complete order.'));
		}
	}

	async function handleAccept(orderId: string) {
		try {
			const businessId = ($page.data.business as any).id;
			await acceptQrOrder(businessId, orderId);
			toast.success('QR order accepted');
			await invalidateAll();
		} catch (err: any) {
			toast.error(err.message || 'Failed to accept order');
		}
	}

	async function handleReject(orderId: string) {
		const reason = prompt('Rejection reason (optional):');
		try {
			const businessId = ($page.data.business as any).id;
			await rejectQrOrder(businessId, orderId, reason || undefined);
			toast.success('QR order rejected');
			await invalidateAll();
		} catch (err: any) {
			toast.error(err.message || 'Failed to reject order');
		}
	}
</script>

<div class="flex flex-1 flex-col" ontouchstart={onPullStart} ontouchmove={onPullMove} ontouchend={onPullEnd}>
	{#if pulling || isRefreshing}
		<div class="flex items-center justify-center py-3 text-muted-foreground md:hidden">
			<IconRefresh class="h-4 w-4 animate-spin" />
			<span class="ml-2 text-sm">{isRefreshing ? 'Refreshing...' : 'Release to refresh'}</span>
		</div>
	{/if}
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Orders" description="Manage and track all your restaurant orders">
				{#snippet actions()}
					<div aria-live="polite">
						<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
							<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
							{isRefreshing ? 'Refreshing...' : 'Refresh'}
						</Button>
					</div>
				{/snippet}
			</PageHeader>

			<!-- Filters and Search -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<SearchInput
					bind:value={searchQuery}
					placeholder="Search orders..."
					debounceMs={300}
					class="max-w-sm"
				/>
				<div class="flex gap-2">
					<FilterDropdown
						bind:value={statusFilter}
						placeholder="All Status"
						allOptionLabel="All Status"
						options={[
							{ value: 'pending_approval', label: 'Pending Approval' },
							{ value: 'active', label: 'Active' },
							{ value: 'preparing', label: 'Preparing' },
							{ value: 'ready', label: 'Ready' },
							{ value: 'serving', label: 'Serving' }
						]}
					/>
					<FilterDropdown
						bind:value={typeFilter}
						placeholder="All Types"
						allOptionLabel="All Types"
						options={[
							{ value: 'Dine-In', label: 'Dine-In' },
							{ value: 'Takeaway', label: 'Takeaway' },
							{ value: 'Delivery', label: 'Delivery' }
						]}
					/>
				</div>
			</div>

			<!-- Mobile: Card list -->
			<div class="flex flex-col gap-2 md:hidden">
				{#each filteredOrders as order (order.id)}
					<button
						type="button"
						class="block w-full rounded-lg border bg-card p-3 text-left active:scale-[0.99] transition-transform"
						onclick={() => viewOrder(order.orderId)}
					>
						<div class="flex items-center justify-between">
							<span class="font-medium">
								{order.id}
								{#if order.orderSource === 'customer_qr'}
									<span class="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-200">QR</span>
								{/if}
							</span>
							<StatusPill
								label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
								status={getStatusPillStatus(order.status)}
							/>
						</div>
						<div class="mt-1 flex items-center justify-between text-sm text-muted-foreground">
							<span>{order.customer} · {order.items} items · {order.table}</span>
							<span class="font-medium text-foreground">{formatCurrency(order.total)}</span>
						</div>
						<div class="mt-1 text-xs text-muted-foreground">{order.time}</div>
						{#if order.status === 'pending_approval' && order.orderSource === 'customer_qr'}
							<div class="mt-2 flex gap-2">
								<Button size="sm" variant="default" class="flex-1" onclick={(e: MouseEvent) => { e.stopPropagation(); handleAccept(order.orderId); }}>Accept</Button>
								<Button size="sm" variant="destructive" class="flex-1" onclick={(e: MouseEvent) => { e.stopPropagation(); handleReject(order.orderId); }}>Reject</Button>
							</div>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Desktop: Table -->
			<div class="hidden md:block overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order ID</Table.Head>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Table/Type</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Items</Table.Head>
							<Table.Head>Total</Table.Head>
							<Table.Head>Date & Time</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredOrders as order (order.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<div class="flex items-center gap-1.5">
										{order.id}
										{#if order.orderSource === 'customer_qr'}
											<span class="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-200">QR</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{order.customer}</Table.Cell>
								<Table.Cell>{order.table}</Table.Cell>
								<Table.Cell>
									<StatusPill
										label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
										status={getStatusPillStatus(order.status)}
									/>
								</Table.Cell>
								<Table.Cell>{order.items}</Table.Cell>
								<Table.Cell>{formatCurrency(order.total)}</Table.Cell>
								<Table.Cell>
									<div class="text-sm">
										<div>{order.date}</div>
										<div class="text-muted-foreground">{order.time}</div>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										{#if order.status === 'pending_approval' && order.orderSource === 'customer_qr'}
											<Button size="sm" variant="default" onclick={() => handleAccept(order.orderId)}>
												Accept
											</Button>
											<Button size="sm" variant="destructive" onclick={() => handleReject(order.orderId)}>
												Reject
											</Button>
										{:else if canModify(userRole) && order.status && !['completed', 'cancelled', 'refunded'].includes(order.status)}
											<Button variant="ghost" size="icon" onclick={() => triggerCompleteOrder(order.orderId)} aria-label="Mark order complete" title="Mark Complete">
												<IconCheck class="h-4 w-4 text-green-600" />
											</Button>
										{/if}
										<Button variant="ghost" size="icon" onclick={() => viewOrder(order.orderId)} aria-label="View order">
											<IconEye class="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="icon" onclick={() => printOrder(order.orderId)} aria-label="Print order">
											<IconPrinter class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			{#if filteredOrders.length === 0}
				<EmptyState type="no-results" title="No active orders" description="Orders will appear here when placed." />
			{/if}
		</div>
	</div>
</div>

<ConfirmDialog
	open={completeDialogOpen}
	title="Mark Order as Complete"
	description="Are you sure you want to mark this order as completed? This action cannot be undone."
	confirmLabel="Complete Order"
	onConfirm={confirmCompleteOrder}
	onCancel={() => { completeDialogOpen = false; completeTargetId = ''; }}
/>
