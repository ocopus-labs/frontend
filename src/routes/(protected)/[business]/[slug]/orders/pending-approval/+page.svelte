<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import { IconRefresh } from '@tabler/icons-svelte';
	import { page } from '$app/stores';
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { updateOrderStatus } from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import type { Order } from '$lib/api/order';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { connectSocket, onOrderCreated, onOrderUpdated } from '$lib/socket';

	let { data }: { data: PageData } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	// Local mutable list for optimistic updates
	let orders = $state<Order[]>([...(data.orders ?? [])]);

	// Keep in sync when server data re-validates
	$effect(() => {
		orders = [...(data.orders ?? [])];
	});

	let isRefreshing = $state(false);

	// ──────────────────────────────────────────────
	// Time-elapsed helper
	// ──────────────────────────────────────────────
	function timeAgo(iso: string): string {
		const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	// ──────────────────────────────────────────────
	// Items summary helper
	// ──────────────────────────────────────────────
	function itemsSummary(items: Order['items']): string {
		const first = items.slice(0, 3).map((i) => `${i.quantity}x ${i.name}`);
		const rest = items.length - 3;
		return rest > 0 ? `${first.join(', ')} +${rest} more` : first.join(', ');
	}

	// ──────────────────────────────────────────────
	// Phone last-4 helper
	// ──────────────────────────────────────────────
	function phoneLast4(phone?: string): string {
		if (!phone) return '';
		const digits = phone.replace(/\D/g, '');
		return digits.length >= 4 ? `···${digits.slice(-4)}` : phone;
	}

	// ──────────────────────────────────────────────
	// Approve
	// ──────────────────────────────────────────────
	async function handleApprove(order: Order) {
		// Optimistically remove
		orders = orders.filter((o) => o.id !== order.id);
		try {
			const businessId = ($page.data.business as any).id;
			await updateOrderStatus(businessId, order.id, 'active');
			toast.success(`Order ${order.orderNumber} approved`);
		} catch (err: any) {
			// Rollback
			orders = [order, ...orders];
			toast.error(userFriendlyError(err, 'Failed to approve order'));
		}
	}

	// ──────────────────────────────────────────────
	// Reject dialog
	// ──────────────────────────────────────────────
	let rejectDialogOpen = $state(false);
	let rejectTarget = $state<Order | null>(null);
	let rejectReason = $state('');

	function openRejectDialog(order: Order) {
		rejectTarget = order;
		rejectReason = '';
		rejectDialogOpen = true;
	}

	async function confirmReject() {
		if (!rejectTarget) return;
		const order = rejectTarget;
		rejectDialogOpen = false;

		// Optimistically remove
		orders = orders.filter((o) => o.id !== order.id);
		try {
			const businessId = ($page.data.business as any).id;
			await updateOrderStatus(businessId, order.id, 'cancelled', rejectReason || undefined);
			toast.success(`Order ${order.orderNumber} rejected`);
		} catch (err: any) {
			// Rollback
			orders = [order, ...orders];
			toast.error(userFriendlyError(err, 'Failed to reject order'));
		} finally {
			rejectTarget = null;
			rejectReason = '';
		}
	}

	// ──────────────────────────────────────────────
	// Refresh
	// ──────────────────────────────────────────────
	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:pending-approval-orders');
		isRefreshing = false;
	}

	// ──────────────────────────────────────────────
	// Real-time updates via socket.io
	// Socket events matched from backend order.gateway.ts:
	//   'order:created'  – emitOrderCreated
	//   'order:updated'  – emitOrderUpdated
	// ──────────────────────────────────────────────
	let cleanupCreated: (() => void) | null = null;
	let cleanupUpdated: (() => void) | null = null;
	// Polling fallback timer
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		const socket = await connectSocket();

		if (socket) {
			// Subscribe to order:created — prepend if online + pending_approval
			cleanupCreated = await onOrderCreated((order) => {
				if (
					order.status === 'pending_approval' &&
					(order.orderType === 'online' || order.orderSource === 'online')
				) {
					// Only prepend if not already in the list
					if (!orders.find((o) => o.id === order.id)) {
						orders = [order as Order, ...orders];
						// TODO: play a short audio ping here (e.g. new Audio('/sounds/ping.mp3').play())
					}
				}
			});

			// Subscribe to order:updated — remove if no longer pending_approval
			cleanupUpdated = await onOrderUpdated((order) => {
				if (order.status !== 'pending_approval') {
					orders = orders.filter((o) => o.id !== order.id);
				}
			});
		} else {
			// TODO: socket.io subscription recommended — falling back to 30s polling
			pollTimer = setInterval(() => {
				invalidate('app:pending-approval-orders');
			}, 30_000);
		}
	});

	onDestroy(() => {
		cleanupCreated?.();
		cleanupUpdated?.();
		if (pollTimer) clearInterval(pollTimer);
	});

	const pendingCount = $derived(orders.length);
</script>

<div class="flex flex-1 flex-col">
	<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
		<!-- Header -->
		<PageHeader
			title="Pending Approval"
			description="Online orders awaiting staff approval before entering the kitchen"
		>
			{#snippet actions()}
				<div class="flex items-center gap-3">
					{#if pendingCount > 0}
						<Badge variant="destructive" class="tabular-nums">
							{pendingCount}
						</Badge>
					{/if}
					<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
						<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
						{isRefreshing ? 'Refreshing…' : 'Refresh'}
					</Button>
				</div>
			{/snippet}
		</PageHeader>

		<!-- Order list -->
		{#if orders.length === 0}
			<div
				class="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground"
			>
				<span class="text-5xl" aria-hidden="true">🎉</span>
				<p class="text-lg font-medium">No pending orders</p>
				<p class="text-sm">New online orders will appear here automatically.</p>
			</div>
		{:else}
			<div class="flex flex-col gap-3 px-4 md:px-6">
				{#each orders as order (order.id)}
					<div
						class="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-opacity sm:flex-row sm:items-start sm:justify-between"
					>
						<!-- Left: order info -->
						<div class="flex min-w-0 flex-col gap-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-mono text-sm font-semibold tracking-tight">
									#{order.orderNumber}
								</span>
								<Badge variant="outline" class="text-xs">Online</Badge>
								<span class="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</span>
							</div>

							<p class="truncate text-sm font-medium">
								{order.customerInfo?.name || 'Guest'}
								{#if order.customerInfo?.phone}
									<span class="ml-1 font-normal text-muted-foreground">
										{phoneLast4(order.customerInfo.phone)}
									</span>
								{/if}
							</p>

							<p class="line-clamp-2 text-xs text-muted-foreground">
								{itemsSummary(order.items)}
							</p>

							<p class="mt-1 text-sm font-semibold">
								{formatCurrency(order.pricing.total)}
							</p>
						</div>

						<!-- Right: actions -->
						<div class="flex shrink-0 gap-2 sm:flex-col sm:items-end">
							<Button
								size="sm"
								variant="default"
								class="flex-1 sm:min-w-24 sm:flex-none"
								onclick={() => handleApprove(order)}
							>
								Approve
							</Button>
							<Button
								size="sm"
								variant="outline"
								class="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground sm:min-w-24 sm:flex-none"
								onclick={() => openRejectDialog(order)}
							>
								Reject
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Reject reason dialog -->
<Dialog.Root bind:open={rejectDialogOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Reject Order</Dialog.Title>
			<Dialog.Description>
				Optionally provide a reason for rejecting order
				{#if rejectTarget}
					<span class="font-mono font-semibold">#{rejectTarget.orderNumber}</span>
				{/if}. The customer will be notified.
			</Dialog.Description>
		</Dialog.Header>

		<Textarea
			placeholder="Reason (optional)"
			bind:value={rejectReason}
			rows={3}
			class="resize-none"
		/>

		<Dialog.Footer class="gap-2">
			<Button
				variant="outline"
				onclick={() => {
					rejectDialogOpen = false;
					rejectTarget = null;
				}}
			>
				Cancel
			</Button>
			<Button variant="destructive" onclick={confirmReject}>Confirm Reject</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
