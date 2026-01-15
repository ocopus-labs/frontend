<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { IconSearch, IconFilter, IconEye, IconPrinter, IconRefresh } from '@tabler/icons-svelte';
	import { invalidate } from '$app/navigation';
	import type { Order } from '$lib/api/order';

	let { data }: { data: PageData } = $props();

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
			items: order.items.length
		}))
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

	function viewOrder(orderId: string) {
		// TODO: Navigate to order details
		console.log('View order:', orderId);
	}

	function printOrder(orderId: string) {
		// TODO: Print order
		console.log('Print order:', orderId);
	}

	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:orders');
		isRefreshing = false;
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-2xl font-bold">Orders</h1>
						<p class="text-muted-foreground">Manage and track all your restaurant orders</p>
					</div>
					<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
						<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
						Refresh
					</Button>
				</div>
			</div>

			<!-- Filters and Search -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
					<div class="relative max-w-sm flex-1">
						<IconSearch
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input placeholder="Search orders..." bind:value={searchQuery} class="pl-9" />
					</div>
				</div>

				<div class="flex gap-2">
					<select
						bind:value={statusFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Status</option>
						<option value="pending">Pending</option>
						<option value="preparing">Preparing</option>
						<option value="completed">Completed</option>
						<option value="cancelled">Cancelled</option>
					</select>

					<select
						bind:value={typeFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Types</option>
						<option value="Dine-In">Dine-In</option>
						<option value="Takeaway">Takeaway</option>
						<option value="Delivery">Delivery</option>
					</select>
				</div>
			</div>

			<!-- Orders Table -->
			<div class="rounded-md border">
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
								<Table.Cell class="font-medium">{order.id}</Table.Cell>
								<Table.Cell>{order.customer}</Table.Cell>
								<Table.Cell>{order.table}</Table.Cell>
								<Table.Cell>
									<Badge variant={getStatusBadge(order.status).variant}>
										{getStatusBadge(order.status).text}
									</Badge>
								</Table.Cell>
								<Table.Cell>{order.items}</Table.Cell>
								<Table.Cell>${order.total.toFixed(2)}</Table.Cell>
								<Table.Cell>
									<div class="text-sm">
										<div>{order.date}</div>
										<div class="text-muted-foreground">{order.time}</div>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => viewOrder(order.id)}>
											<IconEye class="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="sm" onclick={() => printOrder(order.id)}>
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
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconSearch class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No orders found</h3>
					<p class="text-muted-foreground">Try adjusting your search or filter criteria.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
