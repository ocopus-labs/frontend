<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { PaymentDialog, ReceiptDialog, RefundDialog } from '$lib/components/pos';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		IconArrowLeft,
		IconCash,
		IconCheck,
		IconPrinter,
		IconReceipt,
		IconClock,
		IconReceiptRefund,
		IconHistory
	} from '@tabler/icons-svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import {
		createPayment,
		createSplitPayment,
		processRefund,
		updateOrderStatus,
		reprintKot,
		type PaymentMethod,
		type Payment
	} from '$lib/api';
	import { createI18nUtils, currencyToRegion } from '$lib/utils/i18n';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatOrderType } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	const region = $derived(
		currencyToRegion(($page.data.business as any)?.settings?.currency || 'USD')
	);
	const i18n = $derived(createI18nUtils(region));

	// Payment dialog state
	let showPaymentDialog = $state(false);
	let isProcessingPayment = $state(false);

	// Receipt dialog state
	let showReceiptDialog = $state(false);
	let selectedPaymentId = $state('');

	const order = $derived(data.order);
	const payments = $derived(data.payments as Payment[]);
	const balanceDue = $derived(order ? Number(order.balanceDue) : 0);

	// Auto-print handler (4.1) — checks for ?print=true URL param
	$effect(() => {
		const shouldPrint = $page.url.searchParams.get('print');
		if (shouldPrint === 'true' && payments.length > 0) {
			// Remove the print param from URL
			const url = new URL($page.url);
			url.searchParams.delete('print');
			history.replaceState({}, '', url.toString());

			// Open receipt for latest payment
			const latestPayment = payments[payments.length - 1];
			selectedPaymentId = latestPayment.id;
			showReceiptDialog = true;
		}
	});

	function getStatusBadge(status: string) {
		switch (status) {
			case 'completed':
				return { variant: 'default' as const, text: 'Completed' };
			case 'preparing':
				return { variant: 'secondary' as const, text: 'Preparing' };
			case 'active':
				return { variant: 'outline' as const, text: 'Active' };
			case 'pending':
				return { variant: 'outline' as const, text: 'Pending' };
			case 'cancelled':
				return { variant: 'destructive' as const, text: 'Cancelled' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function getPaymentStatusBadge(status: string) {
		switch (status) {
			case 'paid':
				return { variant: 'default' as const, text: 'Paid' };
			case 'partial':
				return { variant: 'secondary' as const, text: 'Partial' };
			case 'pending':
				return { variant: 'outline' as const, text: 'Pending' };
			case 'refunded':
				return { variant: 'destructive' as const, text: 'Refunded' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	// Back button with history fallback (3.1)
	function goBack() {
		if (history.length > 1) {
			history.back();
		} else {
			goto(`/${$page.params.business}/${$page.params.slug}/orders/pending`);
		}
	}

	function openPaymentDialog() {
		showPaymentDialog = true;
	}

	async function handlePaymentComplete(result: {
		paymentMethod: PaymentMethod;
		amount: number;
		change?: number;
		remainingBalance: number;
	}) {
		if (!order) return;

		isProcessingPayment = true;

		try {
			const businessId = $page.data.business.id;

			const paymentResult = await createPayment(businessId, {
				orderId: order.id,
				amount: result.amount,
				method: result.paymentMethod,
				cashReceived:
					result.paymentMethod === 'cash' ? result.amount + (result.change || 0) : undefined
			});

			if (result.change && result.change > 0) {
				toast.success(`Payment complete! Change: ${i18n.formatCurrency(result.change)}`, {
					duration: 10000,
					closeButton: true
				});
			} else {
				toast.success('Payment processed successfully!');
			}

			if (paymentResult.remainingBalance <= 0) {
				showPaymentDialog = false;
				toast.success('Order fully paid!');
			} else {
				toast.info(`Remaining balance: ${i18n.formatCurrency(paymentResult.remainingBalance)}`);
			}

			// Refresh the page data
			await invalidate('app:order');
			await invalidate((url) => url.pathname.includes('/orders/'));
		} catch (error) {
			console.error('Failed to process payment:', error);
			toast.error('Failed to process payment. Please try again.');
		} finally {
			isProcessingPayment = false;
		}
	}

	async function handleSplitPaymentComplete(result: {
		payments: { method: PaymentMethod; amount: number; cashReceived?: number }[];
		remainingBalance: number;
	}) {
		if (!order) return;

		isProcessingPayment = true;

		try {
			const businessId = $page.data.business.id;

			const paymentResult = await createSplitPayment(businessId, {
				orderId: order.id,
				payments: result.payments.map((p) => ({
					amount: p.amount,
					method: p.method,
					cashReceived: p.cashReceived
				}))
			});

			toast.success('Split payment processed successfully!');

			if (paymentResult.remainingBalance <= 0) {
				showPaymentDialog = false;
				toast.success('Order fully paid!');
			}

			await invalidate('app:order');
			await invalidate((url) => url.pathname.includes('/orders/'));
		} catch (error: any) {
			toast.error(userFriendlyError(error, 'Failed to process split payment.'));
		} finally {
			isProcessingPayment = false;
		}
	}

	function handlePaymentCancel() {
		showPaymentDialog = false;
	}

	function printOrder() {
		// Print the most recent payment if available
		if (payments.length > 0) {
			const latestPayment = payments[payments.length - 1];
			printPaymentReceipt(latestPayment.id);
		} else {
			toast.info('No payments to print. Complete a payment first.');
		}
	}

	function printPaymentReceipt(paymentId: string) {
		selectedPaymentId = paymentId;
		showReceiptDialog = true;
	}

	function handleReceiptClose() {
		showReceiptDialog = false;
		selectedPaymentId = '';
	}

	// Refund state
	let showRefundDialog = $state(false);
	let refundPayment = $state<Payment | null>(null);
	let isProcessingRefund = $state(false);

	function openRefundDialog(payment: Payment) {
		refundPayment = payment;
		showRefundDialog = true;
	}

	async function handleRefundComplete(result: { refundAmount: number }) {
		if (!refundPayment) return;

		isProcessingRefund = true;

		try {
			const businessId = $page.data.business.id;

			await processRefund(businessId, refundPayment.id, {
				amount: result.refundAmount,
				reason: '',
				refundMethod: refundPayment.method
			});

			toast.success(
				`Refund of ${i18n.formatCurrency(result.refundAmount)} processed successfully!`
			);
			showRefundDialog = false;
			refundPayment = null;

			// Refresh the page data
			await invalidate('app:order');
			await invalidate((url) => url.pathname.includes('/orders/'));
		} catch (error: any) {
			toast.error(userFriendlyError(error, 'Failed to process refund. Please try again.'));
		} finally {
			isProcessingRefund = false;
		}
	}

	function handleRefundCancel() {
		showRefundDialog = false;
		refundPayment = null;
	}

	// Mark Complete state
	let showCompleteDialog = $state(false);
	let isCompletingOrder = $state(false);

	function triggerCompleteOrder() {
		showCompleteDialog = true;
	}

	async function confirmCompleteOrder() {
		if (!order || isCompletingOrder) return;
		isCompletingOrder = true;

		try {
			const businessId = $page.data.business.id;
			await updateOrderStatus(businessId, order.id, 'completed');
			toast.success('Order marked as completed!');
			showCompleteDialog = false;
			await invalidate('app:order');
			await invalidate((url) => url.pathname.includes('/orders/'));
		} catch (error: any) {
			toast.error(userFriendlyError(error, 'Failed to complete order.'));
		} finally {
			isCompletingOrder = false;
		}
	}

	// Reprint KOT state
	let reprintLoading = $state(false);

	async function handleReprintKot() {
		if (!order) return;
		reprintLoading = true;
		try {
			await reprintKot($page.data.business.id, order.id);
			toast.success('KOT reprint logged');
		} catch (err: any) {
			toast.error(err.message || 'Failed to reprint KOT');
		} finally {
			reprintLoading = false;
		}
	}

	// Format relative time for audit trail
	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="flex flex-1 flex-col p-4 pt-0! md:p-6 lg:p-8">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button variant="ghost" size="icon" onclick={goBack} aria-label="Go back">
						<IconArrowLeft class="h-5 w-5" />
					</Button>
					<div>
						<h1 class="text-2xl font-bold flex items-center gap-2">
							Order #{order?.orderNumber || 'Unknown'}
							{#if order?.orderSource === 'customer_qr'}
								<span class="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-200">QR Order</span>
							{/if}
						</h1>
						<p class="text-muted-foreground">
							{order ? new Date(order.createdAt).toLocaleString() : ''}
						</p>
					</div>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={printOrder}>
						<IconPrinter class="mr-2 h-4 w-4" />
						Print
					</Button>
					{#if order?.status && !['cancelled', 'refunded'].includes(order.status)}
						<Button variant="outline" size="sm" onclick={handleReprintKot} disabled={reprintLoading}>
							<IconPrinter class="mr-2 h-4 w-4" />
							{reprintLoading ? 'Reprinting...' : 'Reprint KOT'}
						</Button>
					{/if}
					{#if order?.status && !['completed', 'cancelled', 'refunded'].includes(order.status)}
						<Button variant="outline" onclick={triggerCompleteOrder}>
							<IconCheck class="mr-2 h-4 w-4" />
							Mark Complete
						</Button>
					{/if}
					{#if balanceDue > 0 && order?.status !== 'cancelled'}
						<Button onclick={openPaymentDialog}>
							<IconCash class="mr-2 h-4 w-4" />
							Add Payment
						</Button>
					{/if}
				</div>
			</div>

			{#if data.error}
				<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
					<p class="text-destructive">{data.error}</p>
					<Button variant="outline" class="mt-2" onclick={goBack}>Go Back</Button>
				</div>
			{:else if order}
				<div class="grid gap-4 md:grid-cols-3">
					<!-- Order Info Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-lg">Order Details</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Type</span>
								<span class="font-medium">{formatOrderType(order.orderType)}</span>
							</div>
							{#if order.tableNumber}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Table</span>
									<span class="font-medium">{order.tableNumber}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Status</span>
								<Badge variant={getStatusBadge(order.status).variant}>
									{getStatusBadge(order.status).text}
								</Badge>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Staff</span>
								<span class="font-medium">{order.staffName}</span>
							</div>
							{#if order.customerInfo?.name}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Customer</span>
									<span class="font-medium">{order.customerInfo.name}</span>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Payment Info Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-lg">Payment Status</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Status</span>
								<Badge variant={getPaymentStatusBadge(order.paymentStatus).variant}>
									{getPaymentStatusBadge(order.paymentStatus).text}
								</Badge>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Total</span>
								<span class="font-medium">{i18n.formatCurrency(order.pricing.total)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Paid</span>
								<span class="font-medium text-success"
									>{i18n.formatCurrency(data.totalPaid || 0)}</span
								>
							</div>
							{#if balanceDue > 0}
								<div class="flex justify-between border-t pt-2">
									<span class="font-medium">Balance Due</span>
									<span class="font-bold text-orange-600">{i18n.formatCurrency(balanceDue)}</span>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Pricing Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-lg">Pricing Summary</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Subtotal</span>
								<span>{i18n.formatCurrency(order.pricing.subtotal)}</span>
							</div>
							{#if order.pricing.taxAmount > 0}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Tax ({order.pricing.taxRate}%)</span>
									<span>{i18n.formatCurrency(order.pricing.taxAmount)}</span>
								</div>
							{/if}
							{#if order.pricing.discountAmount > 0}
								<div class="flex justify-between text-success">
									<span>Discount</span>
									<span>-{i18n.formatCurrency(order.pricing.discountAmount)}</span>
								</div>
							{/if}
							<div class="flex justify-between border-t pt-2">
								<span class="font-medium">Total</span>
								<span class="font-bold">{i18n.formatCurrency(order.pricing.total)}</span>
							</div>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Order Items -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-lg">Order Items</Card.Title>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Item</Table.Head>
									<Table.Head>Modifiers</Table.Head>
									<Table.Head class="text-center">Qty</Table.Head>
									<Table.Head class="text-right">Price</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each order.items as item}
									<Table.Row>
										<Table.Cell class="font-medium">{item.name}</Table.Cell>
										<Table.Cell>
											{#if item.modifiers}
												<div class="text-sm text-muted-foreground">
													{#if item.modifiers.size}
														<span class="mr-2">{item.modifiers.size.name}</span>
													{/if}
													{#if item.modifiers.spiceLevel}
														<span class="mr-2">{item.modifiers.spiceLevel.name}</span>
													{/if}
													{#if item.modifiers.addOns?.length}
														<span>+{item.modifiers.addOns.map((a) => a.name).join(', ')}</span>
													{/if}
												</div>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-center">{item.quantity}</Table.Cell>
										<Table.Cell class="text-right">{i18n.formatCurrency(item.basePrice)}</Table.Cell
										>
										<Table.Cell class="text-right"
											>{i18n.formatCurrency(item.totalPrice)}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>

				<!-- Payment History -->
				{#if payments.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-lg">Payment History</Card.Title>
						</Card.Header>
						<Card.Content>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Payment #</Table.Head>
										<Table.Head>Method</Table.Head>
										<Table.Head>Date</Table.Head>
										<Table.Head>Status</Table.Head>
										<Table.Head class="text-right">Amount</Table.Head>
										<Table.Head class="text-center">Actions</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each payments as payment}
										<Table.Row>
											<Table.Cell class="font-medium">{payment.paymentNumber}</Table.Cell>
											<Table.Cell class="capitalize">{payment.method.replace('_', ' ')}</Table.Cell>
											<Table.Cell>{new Date(payment.createdAt).toLocaleString()}</Table.Cell>
											<Table.Cell>
												<Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
													{payment.status}
												</Badge>
											</Table.Cell>
											<Table.Cell class="text-right"
												>{i18n.formatCurrency(payment.amount)}</Table.Cell
											>
											<Table.Cell class="text-center">
												<div class="flex items-center justify-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onclick={() => printPaymentReceipt(payment.id)}
														title="Print receipt"
														aria-label="Print receipt"
													>
														<IconPrinter class="h-4 w-4" />
													</Button>
													{#if payment.status === 'completed'}
														<Button
															variant="ghost"
															size="icon"
															onclick={() => openRefundDialog(payment)}
															title="Process refund"
															aria-label="Process refund"
														>
															<IconReceiptRefund class="h-4 w-4 text-orange-500" />
														</Button>
													{/if}
												</div>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Audit Trail (3.5) -->
				{#if order.auditTrail && order.auditTrail.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2 text-lg">
								<IconHistory class="h-5 w-5" />
								Activity Log
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-0">
								{#each order.auditTrail as entry, idx}
									<div class="flex gap-3">
										<div class="flex flex-col items-center">
											<div class="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary"></div>
											{#if idx < order.auditTrail.length - 1}
												<div class="w-0.5 flex-1 bg-border"></div>
											{/if}
										</div>
										<div class="pb-4">
											<p class="text-sm font-medium capitalize">
												{entry.action.replace(/[._]/g, ' ')}
											</p>
											<p class="text-xs text-muted-foreground">
												{entry.performedBy} &middot; {formatRelativeTime(entry.performedAt)}
											</p>
											{#if entry.details && Object.keys(entry.details).length > 0}
												<p class="mt-1 text-xs text-muted-foreground">
													{Object.entries(entry.details)
														.map(([k, v]) => `${k}: ${v}`)
														.join(', ')}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- Payment Dialog -->
{#if order}
	<PaymentDialog
		open={showPaymentDialog}
		orderId={order.id}
		orderNumber={order.orderNumber}
		totalAmount={order.pricing.total}
		{balanceDue}
		onPaymentComplete={handlePaymentComplete}
		onSplitPaymentComplete={handleSplitPaymentComplete}
		onCancel={handlePaymentCancel}
		isProcessing={isProcessingPayment}
		{region}
		businessId={$page.data.business.id}
	/>
{/if}

<!-- Receipt Dialog -->
<ReceiptDialog
	open={showReceiptDialog}
	paymentId={selectedPaymentId}
	onClose={handleReceiptClose}
	{region}
/>

<!-- Refund Dialog -->
{#if refundPayment}
	<RefundDialog
		open={showRefundDialog}
		paymentId={refundPayment.id}
		paymentNumber={refundPayment.paymentNumber}
		paymentAmount={refundPayment.amount}
		paymentMethod={refundPayment.method}
		onRefundComplete={handleRefundComplete}
		onCancel={handleRefundCancel}
		isProcessing={isProcessingRefund}
		{region}
	/>
{/if}

<!-- Mark Complete Confirm Dialog -->
<ConfirmDialog
	open={showCompleteDialog}
	title="Mark Order as Complete"
	description="Are you sure you want to mark this order as completed? This action cannot be undone."
	confirmLabel="Complete Order"
	onConfirm={confirmCompleteOrder}
	onCancel={() => (showCompleteDialog = false)}
/>
