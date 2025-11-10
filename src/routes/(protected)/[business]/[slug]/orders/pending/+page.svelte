<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { IconSearch, IconFilter, IconEye, IconPrinter } from '@tabler/icons-svelte';

	// Sample orders data
	let orders = $state([
		{
			id: 'ORD-001',
			customer: 'John Doe',
			table: 'T-05',
			type: 'Dine-In',
			status: 'completed',
			total: 45.67,
			date: '2024-11-06',
			time: '14:30',
			items: 3
		},
		{
			id: 'ORD-002',
			customer: 'Jane Smith',
			table: 'Takeaway',
			type: 'Takeaway',
			status: 'preparing',
			total: 23.45,
			date: '2024-11-06',
			time: '15:15',
			items: 2
		},
		{
			id: 'ORD-003',
			customer: 'Mike Johnson',
			table: 'T-12',
			type: 'Dine-In',
			status: 'pending',
			total: 67.89,
			date: '2024-11-06',
			time: '16:00',
			items: 4
		},
		{
			id: 'ORD-004',
			customer: 'Sarah Wilson',
			table: 'Delivery',
			type: 'Delivery',
			status: 'completed',
			total: 34.56,
			date: '2024-11-05',
			time: '19:45',
			items: 2
		},
		{
			id: 'ORD-005',
			customer: 'Tom Brown',
			table: 'T-08',
			type: 'Dine-In',
			status: 'cancelled',
			total: 12.34,
			date: '2024-11-05',
			time: '18:20',
			items: 1
		}
	]);

	let searchQuery = $state('');
	let statusFilter = $state('all');
	let typeFilter = $state('all');

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
				return { variant: 'default', text: 'Completed' };
			case 'preparing':
				return { variant: 'secondary', text: 'Preparing' };
			case 'pending':
				return { variant: 'outline', text: 'Pending' };
			case 'cancelled':
				return { variant: 'destructive', text: 'Cancelled' };
			default:
				return { variant: 'outline', text: status };
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
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2">
				<h1 class="text-2xl font-bold">Orders</h1>
				<p class="text-muted-foreground">Manage and track all your restaurant orders</p>
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
