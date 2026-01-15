<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconSearch,
		IconEye,
		IconPrinter,
		IconReceipt,
		IconCheck,
		IconRefresh
	} from '@tabler/icons-svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Order } from '$lib/api/order';

	let { data }: { data: PageData } = $props();

	// Transform API orders to display format
	let orders = $derived(
		(data.orders || []).map((order: Order) => ({
			id: order.orderNumber,
			orderId: order.id,
			customer: order.customerInfo?.name || 'Walk-in',
			table: order.tableNumber || formatOrderType(order.orderType),
			type: formatOrderType(order.orderType),
			total: order.pricing.total,
			date: new Date(order.createdAt).toLocaleDateString(),
			time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			items: order.items.length,
			paymentMethod: order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus,
			completedAt: order.actualCompletionTime
				? new Date(order.actualCompletionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				: new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
	let typeFilter = $state('all');
	let dateFilter = $state(data.dateFilter || 'today');
	let isRefreshing = $state(false);

	const filteredOrders = $derived(
		orders.filter((order) => {
			const matchesSearch =
				order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				order.customer.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesType = typeFilter === 'all' || order.type === typeFilter;
			return matchesSearch && matchesType;
		})
	);

	const totalRevenue = $derived(filteredOrders.reduce((sum, order) => sum + order.total, 0));

	function viewOrder(orderId: string) {
		console.log('View order:', orderId);
	}

	function printReceipt(orderId: string) {
		console.log('Print receipt:', orderId);
	}

	function onDateFilterChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		dateFilter = select.value;
		const url = new URL($page.url);
		url.searchParams.set('date', dateFilter);
		goto(url.toString(), { replaceState: true });
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
			<div class="flex items-center justify-between px-6">
				<div class="flex flex-col gap-2">
					<h1 class="text-2xl font-bold">Completed Orders</h1>
					<p class="text-muted-foreground">View all successfully completed orders</p>
				</div>
				<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
					<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
					Refresh
				</Button>
			</div>

			<!-- Stats -->
			<div class="flex gap-4 px-6">
				<div class="rounded-lg border bg-card p-4">
					<p class="text-sm text-muted-foreground">Orders Completed</p>
					<p class="text-2xl font-bold">{filteredOrders.length}</p>
				</div>
				<div class="rounded-lg border bg-card p-4">
					<p class="text-sm text-muted-foreground">Total Revenue</p>
					<p class="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
				</div>
			</div>

			<!-- Filters and Search -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
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
						value={dateFilter}
						onchange={onDateFilterChange}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="today">Today</option>
						<option value="yesterday">Yesterday</option>
						<option value="all">All Time</option>
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
			<div class="px-6">
				<div class="rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Order ID</Table.Head>
								<Table.Head>Customer</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Items</Table.Head>
								<Table.Head>Total</Table.Head>
								<Table.Head>Payment</Table.Head>
								<Table.Head>Completed At</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredOrders as order (order.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										<div class="flex items-center gap-2">
											<IconCheck class="h-4 w-4 text-green-500" />
											{order.id}
										</div>
									</Table.Cell>
									<Table.Cell>{order.customer}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline">{order.type}</Badge>
									</Table.Cell>
									<Table.Cell>{order.items} items</Table.Cell>
									<Table.Cell class="font-medium">${order.total.toFixed(2)}</Table.Cell>
									<Table.Cell>{order.paymentMethod}</Table.Cell>
									<Table.Cell>
										<div class="text-sm">
											<div>{order.date}</div>
											<div class="text-muted-foreground">{order.completedAt}</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-2">
											<Button variant="ghost" size="sm" onclick={() => viewOrder(order.id)}>
												<IconEye class="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="sm" onclick={() => printReceipt(order.id)}>
												<IconPrinter class="h-4 w-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if filteredOrders.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconReceipt class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No completed orders found</h3>
					<p class="text-muted-foreground">Try adjusting your search or filter criteria.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
