<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconPlus,
		IconSend,
		IconPackage,
		IconX,
		IconChevronLeft,
		IconChevronRight,
		IconLoader2,
		IconEye
	} from '@tabler/icons-svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		markPurchaseOrderSent,
		receivePurchaseOrderItems,
		cancelPurchaseOrder,
		getPurchaseOrder,
		type PurchaseOrder,
		type PurchaseOrderStatus,
		type PurchaseOrderItem
	} from '$lib/api';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { formatDate } from '$lib/utils/formatting';
	import { userFriendlyError } from '$lib/utils/error';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { canModify } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	const userRole = $derived((data as any).userRole as string ?? '');
	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	let orders = $derived<PurchaseOrder[]>((data as any).orders || []);
	let searchQuery = $state('');
	let statusFilter = $state('all');
	let isSubmitting = $state(false);

	// Detail dialog
	let viewingOrder = $state<PurchaseOrder | null>(null);
	let detailLoading = $state(false);

	// Receive dialog
	let receivingOrder = $state<PurchaseOrder | null>(null);
	let receiveQuantities = $state<Record<string, number>>({});

	// Cancel confirmation
	let cancelDialogOpen = $state(false);
	let cancelTargetId = $state('');

	const statusOptions: { value: PurchaseOrderStatus; label: string }[] = [
		{ value: 'draft', label: 'Draft' },
		{ value: 'sent', label: 'Sent' },
		{ value: 'partially_received', label: 'Partially Received' },
		{ value: 'received', label: 'Received' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	function getStatusBadge(status: PurchaseOrderStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string } {
		switch (status) {
			case 'draft':
				return { variant: 'outline', label: 'Draft' };
			case 'sent':
				return { variant: 'default', label: 'Sent' };
			case 'partially_received':
				return { variant: 'secondary', label: 'Partially Received' };
			case 'received':
				return { variant: 'default', label: 'Received' };
			case 'cancelled':
				return { variant: 'destructive', label: 'Cancelled' };
			default:
				return { variant: 'outline', label: status };
		}
	}

	const filteredOrders = $derived(
		orders.filter((order) => {
			const matchesSearch =
				order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				order.supplierId.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	// Pagination
	const currentPage = $derived((data as any).page || 1);
	const totalPages = $derived((data as any).totalPages || 1);
	const totalItems = $derived((data as any).total || 0);
	const paginationLimit = $derived((data as any).limit || 25);

	function goToPage(pageNum: number) {
		const url = new URL($page.url);
		if (pageNum > 1) url.searchParams.set('page', String(pageNum));
		else url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true });
	}

	async function viewDetail(order: PurchaseOrder) {
		detailLoading = true;
		try {
			const result = await getPurchaseOrder(data.businessId, order.id);
			viewingOrder = result.purchaseOrder;
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to load purchase order details'));
		} finally {
			detailLoading = false;
		}
	}

	async function handleSend(orderId: string) {
		isSubmitting = true;
		try {
			await markPurchaseOrderSent(data.businessId, orderId);
			toast.success('Purchase order marked as sent');
			await invalidate('app:purchase-orders');
			viewingOrder = null;
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to send purchase order'));
		} finally {
			isSubmitting = false;
		}
	}

	function openReceiveDialog(order: PurchaseOrder) {
		receivingOrder = order;
		receiveQuantities = {};
		for (const item of order.items) {
			receiveQuantities[item.id] = 0;
		}
	}

	async function handleReceive() {
		if (!receivingOrder) return;

		const items = Object.entries(receiveQuantities)
			.filter(([, qty]) => qty > 0)
			.map(([purchaseOrderItemId, receivedQuantity]) => ({
				purchaseOrderItemId,
				receivedQuantity
			}));

		if (items.length === 0) {
			toast.error('Enter at least one quantity to receive');
			return;
		}

		isSubmitting = true;
		try {
			await receivePurchaseOrderItems(data.businessId, receivingOrder.id, { items });
			toast.success('Items received successfully');
			receivingOrder = null;
			await invalidate('app:purchase-orders');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to receive items'));
		} finally {
			isSubmitting = false;
		}
	}

	function triggerCancel(orderId: string) {
		cancelTargetId = orderId;
		cancelDialogOpen = true;
	}

	async function confirmCancel() {
		if (!cancelTargetId) return;
		isSubmitting = true;
		try {
			await cancelPurchaseOrder(data.businessId, cancelTargetId);
			toast.success('Purchase order cancelled');
			viewingOrder = null;
			await invalidate('app:purchase-orders');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to cancel purchase order'));
		} finally {
			isSubmitting = false;
			cancelTargetId = '';
		}
	}

	function navigateToNew() {
		const base = $page.url.pathname.replace(/\/$/, '');
		goto(`${base}/new`);
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Purchase Orders" description="Create and manage purchase orders for inventory replenishment">
				{#snippet actions()}
					{#if canModify(userRole)}
						<Button onclick={navigateToNew}>
							<IconPlus class="mr-2 h-4 w-4" />
							New Purchase Order
						</Button>
					{/if}
				{/snippet}
			</PageHeader>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<SearchInput
					bind:value={searchQuery}
					placeholder="Search by order number or supplier..."
					debounceMs={300}
					class="max-w-sm"
				/>
				<FilterDropdown
					bind:value={statusFilter}
					placeholder="All Statuses"
					allOptionLabel="All Statuses"
					options={statusOptions}
				/>
			</div>

			<!-- Order List -->
			{#if filteredOrders.length > 0}
				<!-- Mobile: Card list -->
				<div class="flex flex-col gap-2 px-4 md:hidden">
					{#each filteredOrders as order (order.id)}
						{@const badge = getStatusBadge(order.status)}
						<button
							class="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
							onclick={() => viewDetail(order)}
						>
							<div class="flex items-center justify-between">
								<span class="font-medium text-sm">{order.orderNumber}</span>
								<Badge variant={badge.variant}>{badge.label}</Badge>
							</div>
							<div class="mt-1 flex items-center justify-between text-sm text-muted-foreground">
								<span>{formatDate(order.orderDate)}</span>
								<span class="font-medium text-foreground">{formatCurrency(order.totalAmount)}</span>
							</div>
						</button>
					{/each}
				</div>

				<!-- Desktop: Table -->
				<div class="hidden md:block px-6">
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Order Number</Table.Head>
									<Table.Head>Supplier</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Order Date</Table.Head>
									<Table.Head>Expected Date</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredOrders as order (order.id)}
									{@const badge = getStatusBadge(order.status)}
									<Table.Row class="cursor-pointer hover:bg-accent/50" onclick={() => viewDetail(order)}>
										<Table.Cell class="font-medium">{order.orderNumber}</Table.Cell>
										<Table.Cell class="text-muted-foreground">{order.supplierId}</Table.Cell>
										<Table.Cell>
											<Badge variant={badge.variant}>{badge.label}</Badge>
										</Table.Cell>
										<Table.Cell>{formatDate(order.orderDate)}</Table.Cell>
										<Table.Cell>{order.expectedDate ? formatDate(order.expectedDate) : '-'}</Table.Cell>
										<Table.Cell class="text-right font-medium">{formatCurrency(order.totalAmount)}</Table.Cell>
										<Table.Cell class="text-right">
											<div role="toolbar" tabindex="-1" class="flex justify-end gap-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
												<Button variant="ghost" size="icon" onclick={() => viewDetail(order)} title="View details" aria-label="View details">
													<IconEye class="h-4 w-4" />
												</Button>
												{#if canModify(userRole)}
													{#if order.status === 'draft'}
														<Button variant="ghost" size="sm" class="h-8" onclick={() => handleSend(order.id)} title="Mark as sent">
															<IconSend class="mr-1 h-4 w-4" />
															Send
														</Button>
													{/if}
													{#if order.status === 'sent' || order.status === 'partially_received'}
														<Button variant="ghost" size="sm" class="h-8" onclick={() => openReceiveDialog(order)} title="Receive items">
															<IconPackage class="mr-1 h-4 w-4" />
															Receive
														</Button>
													{/if}
													{#if order.status !== 'received' && order.status !== 'cancelled'}
														<Button
															variant="ghost"
															size="icon"
															class="text-destructive hover:text-destructive"
															onclick={() => triggerCancel(order.id)}
															title="Cancel order"
															aria-label="Cancel order"
														>
															<IconX class="h-4 w-4" />
														</Button>
													{/if}
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<EmptyState
					type="empty"
					title="No purchase orders"
					description="Create your first purchase order to start tracking inventory replenishment."
				/>
			{/if}

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-between px-6">
					<p class="text-sm text-muted-foreground">
						Showing {(currentPage - 1) * paginationLimit + 1}--{Math.min(currentPage * paginationLimit, totalItems)} of {totalItems} {totalItems === 1 ? 'order' : 'orders'}
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage <= 1}
							onclick={() => goToPage(currentPage - 1)}
						>
							<IconChevronLeft class="mr-1 h-4 w-4" />
							Previous
						</Button>
						<span class="text-sm">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage >= totalPages}
							onclick={() => goToPage(currentPage + 1)}
						>
							Next
							<IconChevronRight class="ml-1 h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Detail Dialog -->
<Dialog.Root open={!!viewingOrder} onOpenChange={(open) => !open && (viewingOrder = null)}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Purchase Order Details</Dialog.Title>
			<Dialog.Description>
				{viewingOrder?.orderNumber} - {viewingOrder ? getStatusBadge(viewingOrder.status).label : ''}
			</Dialog.Description>
		</Dialog.Header>
		{#if viewingOrder}
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
					<div>
						<p class="text-muted-foreground">Order Date</p>
						<p class="font-medium">{formatDate(viewingOrder.orderDate)}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Expected Date</p>
						<p class="font-medium">{viewingOrder.expectedDate ? formatDate(viewingOrder.expectedDate) : '-'}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Supplier</p>
						<p class="font-medium">{viewingOrder.supplierId}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Total</p>
						<p class="font-medium">{formatCurrency(viewingOrder.totalAmount)}</p>
					</div>
				</div>
				{#if viewingOrder.notes}
					<div class="text-sm">
						<p class="text-muted-foreground">Notes</p>
						<p>{viewingOrder.notes}</p>
					</div>
				{/if}
				<div class="max-h-60 overflow-y-auto rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Item</Table.Head>
								<Table.Head>SKU</Table.Head>
								<Table.Head class="text-right">Ordered</Table.Head>
								<Table.Head class="text-right">Received</Table.Head>
								<Table.Head class="text-right">Unit Price</Table.Head>
								<Table.Head class="text-right">Line Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each viewingOrder.items as item (item.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{item.inventoryItem.name}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{item.inventoryItem.sku}</Table.Cell>
									<Table.Cell class="text-right">{item.quantity} {item.inventoryItem.unit}</Table.Cell>
									<Table.Cell class="text-right">
										<span class={Number(item.receivedQuantity) >= Number(item.quantity) ? 'text-green-600 dark:text-green-400' : Number(item.receivedQuantity) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
											{item.receivedQuantity} {item.inventoryItem.unit}
										</span>
									</Table.Cell>
									<Table.Cell class="text-right">{formatCurrency(item.unitPrice)}</Table.Cell>
									<Table.Cell class="text-right">{formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
			<Dialog.Footer>
				{#if canModify(userRole)}
					{#if viewingOrder.status === 'draft'}
						<Button variant="outline" onclick={() => handleSend(viewingOrder!.id)} disabled={isSubmitting}>
							{#if isSubmitting}
								<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							<IconSend class="mr-2 h-4 w-4" />
							Mark as Sent
						</Button>
					{/if}
					{#if viewingOrder.status === 'sent' || viewingOrder.status === 'partially_received'}
						<Button onclick={() => { openReceiveDialog(viewingOrder!); viewingOrder = null; }}>
							<IconPackage class="mr-2 h-4 w-4" />
							Receive Items
						</Button>
					{/if}
					{#if viewingOrder.status !== 'received' && viewingOrder.status !== 'cancelled'}
						<Button variant="destructive" onclick={() => { triggerCancel(viewingOrder!.id); viewingOrder = null; }} disabled={isSubmitting}>
							Cancel Order
						</Button>
					{/if}
				{/if}
				<Button variant="outline" onclick={() => (viewingOrder = null)}>Close</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Receive Items Dialog -->
<Dialog.Root open={!!receivingOrder} onOpenChange={(open) => !open && (receivingOrder = null)}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Receive Items</Dialog.Title>
			<Dialog.Description>
				{receivingOrder?.orderNumber} - Enter quantities being received
			</Dialog.Description>
		</Dialog.Header>
		{#if receivingOrder}
			<div class="grid gap-4 py-4">
				<div class="max-h-80 overflow-y-auto">
					{#each receivingOrder.items as item (item.id)}
						{@const remaining = Number(item.quantity) - Number(item.receivedQuantity)}
						<div class="flex items-center gap-4 border-b py-3 last:border-b-0">
							<div class="flex-1 min-w-0">
								<p class="font-medium text-sm truncate">{item.inventoryItem.name}</p>
								<p class="text-xs text-muted-foreground">
									Ordered: {item.quantity} {item.inventoryItem.unit}
									{#if Number(item.receivedQuantity) > 0}
										| Already received: {item.receivedQuantity}
									{/if}
									| Remaining: {remaining}
								</p>
							</div>
							<div class="w-28 shrink-0">
								<Input
									type="number"
									min="0"
									max={remaining}
									step="0.01"
									placeholder="0"
									value={receiveQuantities[item.id] || ''}
									oninput={(e) => {
										const val = parseFloat((e.target as HTMLInputElement).value) || 0;
										receiveQuantities[item.id] = Math.min(Math.max(0, val), remaining);
									}}
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (receivingOrder = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={handleReceive} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Confirm Receipt
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={cancelDialogOpen}
	title="Cancel Purchase Order"
	description="Are you sure you want to cancel this purchase order? This action cannot be undone."
	confirmLabel="Cancel Order"
	variant="destructive"
	onConfirm={confirmCancel}
/>
