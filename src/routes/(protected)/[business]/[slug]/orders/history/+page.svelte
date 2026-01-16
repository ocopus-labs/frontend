<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import {
		IconSearch,
		IconEye,
		IconDownload,
		IconCalendar,
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
			type: formatOrderType(order.orderType),
			status: order.status,
			total: order.pricing.total,
			date: new Date(order.createdAt).toLocaleDateString(),
			time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			items: order.items.map((item) => item.name)
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
	let startDate = $state('');
	let endDate = $state('');
	let isRefreshing = $state(false);

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

	const stats = $derived({
		total: filteredOrders.length,
		completed: filteredOrders.filter((o) => o.status === 'completed').length,
		cancelled: filteredOrders.filter((o) => o.status === 'cancelled').length,
		refunded: filteredOrders.filter((o) => o.status === 'refunded').length,
		revenue: filteredOrders
			.filter((o) => o.status === 'completed')
			.reduce((sum, o) => sum + o.total, 0)
	});

	function getStatusBadge(status: string) {
		switch (status) {
			case 'completed':
				return { variant: 'default' as const, text: 'Completed' };
			case 'cancelled':
				return { variant: 'destructive' as const, text: 'Cancelled' };
			case 'refunded':
				return { variant: 'secondary' as const, text: 'Refunded' };
			case 'active':
				return { variant: 'outline' as const, text: 'Active' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function viewOrder(orderId: string) {
		goto(`/${$page.params.business}/${$page.params.slug}/orders/${orderId}`);
	}

	function exportHistory() {
		console.log('Export order history');
	}

	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:orders');
		isRefreshing = false;
	}

	function applyDateFilter() {
		const url = new URL($page.url);
		if (startDate) url.searchParams.set('from', startDate);
		else url.searchParams.delete('from');
		if (endDate) url.searchParams.set('to', endDate);
		else url.searchParams.delete('to');
		goto(url.toString(), { replaceState: true });
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Order History</h1>
					<p class="text-muted-foreground">Complete history of all orders</p>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
						<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
						Refresh
					</Button>
					<Button onclick={exportHistory}>
						<IconDownload class="mr-2 h-4 w-4" />
						Export History
					</Button>
				</div>
			</div>

			<!-- Stats Cards -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.total}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Completed</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-green-600">{stats.completed}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Cancelled/Refunded</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-red-600">{stats.cancelled + stats.refunded}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Revenue</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div class="relative max-w-sm flex-1">
						<IconSearch
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input placeholder="Search orders..." bind:value={searchQuery} class="pl-9" />
					</div>

					<div class="flex flex-wrap gap-2">
						<select
							bind:value={statusFilter}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="all">All Status</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
							<option value="refunded">Refunded</option>
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

						<Input type="date" bind:value={startDate} class="w-auto" placeholder="Start date" />
						<Input type="date" bind:value={endDate} class="w-auto" placeholder="End date" />
					</div>
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
								<Table.Head>Status</Table.Head>
								<Table.Head>Date & Time</Table.Head>
								<Table.Head class="text-right">Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredOrders as order (order.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{order.id}</Table.Cell>
									<Table.Cell>{order.customer}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline">{order.type}</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="max-w-[200px] truncate text-sm text-muted-foreground">
											{order.items.join(', ')}
										</div>
									</Table.Cell>
									<Table.Cell class="font-medium">${order.total.toFixed(2)}</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusBadge(order.status).variant}>
											{getStatusBadge(order.status).text}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="text-sm">
											<div>{order.date}</div>
											<div class="text-muted-foreground">{order.time}</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="ghost" size="sm" onclick={() => viewOrder(order.orderId)}>
											<IconEye class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if filteredOrders.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconCalendar class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No orders found</h3>
					<p class="text-muted-foreground">Try adjusting your search or filter criteria.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
