<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconClock,
		IconCheck,
		IconFlame,
		IconAlertTriangle,
		IconRefresh
	} from '@tabler/icons-svelte';
	import { invalidate } from '$app/navigation';
	import { updateItemStatus, updateOrderStatus, type Order, type OrderItem } from '$lib/api';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	let isRefreshing = $state(false);
	let processingItems = $state<Set<string>>(new Set());

	// Transform API orders to kitchen display format
	interface KitchenOrder {
		id: string;
		orderId: string;
		table: string;
		type: string;
		createdAt: string;
		elapsed: number;
		priority: string;
		items: Array<{
			id: string;
			name: string;
			quantity: number;
			notes: string | null;
			status: string;
		}>;
	}

	let orders = $derived<KitchenOrder[]>(
		(data.orders || []).map((order: Order) => {
			const createdAt = new Date(order.createdAt);
			const elapsed = Math.floor((Date.now() - createdAt.getTime()) / 60000);

			return {
				id: order.orderNumber,
				orderId: order.id,
				table: order.tableNumber || formatOrderType(order.orderType),
				type: formatOrderType(order.orderType),
				createdAt: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				elapsed,
				priority: order.priority,
				items: order.items.map((item: OrderItem) => ({
					id: item.id,
					name: item.name,
					quantity: item.quantity,
					notes: item.modifiers?.specialInstructions || null,
					status: item.status
				}))
			};
		})
	);

	function formatOrderType(type: string): string {
		switch (type) {
			case 'dine_in': return 'Dine-In';
			case 'takeaway': return 'Takeaway';
			case 'delivery': return 'Delivery';
			case 'online': return 'Online';
			default: return type;
		}
	}

	function getElapsedColor(elapsed: number) {
		if (elapsed >= 15) return 'text-red-500';
		if (elapsed >= 10) return 'text-yellow-500';
		return 'text-green-500';
	}

	function getPriorityBadge(priority: string) {
		switch (priority) {
			case 'urgent':
				return { variant: 'destructive' as const, text: 'URGENT' };
			case 'high':
				return { variant: 'secondary' as const, text: 'HIGH' };
			default:
				return null;
		}
	}

	function getItemStatusColor(status: string) {
		switch (status) {
			case 'ready':
			case 'served':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'preparing':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
		}
	}

	async function updateItem(orderId: string, itemId: string, status: 'pending' | 'preparing' | 'ready') {
		const key = `${orderId}-${itemId}`;
		if (processingItems.has(key)) return;

		processingItems.add(key);
		processingItems = new Set(processingItems);

		try {
			await updateItemStatus(data.businessId, orderId, itemId, status);
			await invalidate('app:orders');
			toast.success(`Item marked as ${status}`);
		} catch (error) {
			console.error('Failed to update item status:', error);
			toast.error('Failed to update item status');
		} finally {
			processingItems.delete(key);
			processingItems = new Set(processingItems);
		}
	}

	async function completeOrder(orderId: string) {
		try {
			await updateOrderStatus(data.businessId, orderId, 'completed');
			await invalidate('app:orders');
			toast.success('Order completed!');
		} catch (error) {
			console.error('Failed to complete order:', error);
			toast.error('Failed to complete order');
		}
	}

	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:orders');
		isRefreshing = false;
	}
</script>

<div class="flex flex-1 flex-col bg-muted/30">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Kitchen Display</h1>
					<p class="text-muted-foreground">Active orders queue for kitchen staff ({orders.length} orders)</p>
				</div>
				<Button onclick={refreshOrders} variant="outline" disabled={isRefreshing}>
					<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
					Refresh
				</Button>
			</div>

			<!-- Orders Grid -->
			<div class="grid grid-cols-1 gap-4 px-6 md:grid-cols-2 xl:grid-cols-3">
				{#each orders as order (order.id)}
					{@const allReady = order.items.every((i) => i.status === 'ready')}
					<Card.Root
						class="relative overflow-hidden {order.priority === 'urgent'
							? 'ring-2 ring-red-500'
							: ''}"
					>
						{#if order.priority === 'urgent'}
							<div class="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
						{:else if order.priority === 'high'}
							<div class="absolute top-0 left-0 right-0 h-1 bg-yellow-500"></div>
						{/if}

						<Card.Header class="pb-2">
							<div class="flex items-start justify-between">
								<div>
									<Card.Title class="flex items-center gap-2 text-lg">
										{order.id}
										{#if getPriorityBadge(order.priority)}
											<Badge variant={getPriorityBadge(order.priority)!.variant}>
												{getPriorityBadge(order.priority)!.text}
											</Badge>
										{/if}
									</Card.Title>
									<Card.Description class="flex items-center gap-2">
										<Badge variant="outline">{order.table}</Badge>
										<span class="text-xs">{order.type}</span>
									</Card.Description>
								</div>
								<div class="text-right">
									<div class="flex items-center gap-1 {getElapsedColor(order.elapsed)}">
										<IconClock class="h-4 w-4" />
										<span class="font-mono text-lg font-bold">{order.elapsed}m</span>
									</div>
									<p class="text-xs text-muted-foreground">since {order.createdAt}</p>
								</div>
							</div>
						</Card.Header>

						<Card.Content class="space-y-2">
							{#each order.items as item, i}
								<div
									class="flex items-center justify-between rounded-md p-2 {getItemStatusColor(
										item.status
									)}"
								>
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<span class="font-medium">
												{item.quantity}x {item.name}
											</span>
										</div>
										{#if item.notes}
											<p class="mt-1 text-xs opacity-75">Note: {item.notes}</p>
										{/if}
									</div>
									<div class="ml-2">
										{#if item.status === 'pending'}
											<Button size="sm" variant="outline" onclick={() => updateItem(order.orderId, item.id, 'preparing')}>
												Start
											</Button>
										{:else if item.status === 'preparing'}
											<Button size="sm" onclick={() => updateItem(order.orderId, item.id, 'ready')}>
												<IconCheck class="mr-1 h-3 w-3" />
												Done
											</Button>
										{:else}
											<IconCheck class="h-5 w-5 text-green-600" />
										{/if}
									</div>
								</div>
							{/each}
						</Card.Content>

						<Card.Footer>
							{#if allReady}
								<Button class="w-full" onclick={() => completeOrder(order.orderId)}>
									<IconCheck class="mr-2 h-4 w-4" />
									Complete Order
								</Button>
							{:else}
								<div class="w-full text-center text-sm text-muted-foreground">
									{order.items.filter((i) => i.status === 'ready').length} / {order.items.length} items
									ready
								</div>
							{/if}
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>

			{#if orders.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconCheck class="h-12 w-12 text-green-500" />
					<h3 class="mt-4 text-lg font-semibold">All caught up!</h3>
					<p class="text-muted-foreground">No pending orders in the queue.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
