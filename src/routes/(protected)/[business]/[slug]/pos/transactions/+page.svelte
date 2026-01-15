<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import {
		IconSearch,
		IconDownload,
		IconEye,
		IconReceipt,
		IconCreditCard,
		IconCash,
		IconCalendar
	} from '@tabler/icons-svelte';

	// Dummy transactions data
	let transactions = $state([
		{
			id: 'TXN-001',
			orderId: 'ORD-001',
			customer: 'John Doe',
			amount: 45.67,
			paymentMethod: 'Card',
			cardLast4: '4242',
			status: 'completed',
			date: '2024-11-06',
			time: '14:35:22'
		},
		{
			id: 'TXN-002',
			orderId: 'ORD-002',
			customer: 'Jane Smith',
			amount: 23.45,
			paymentMethod: 'Cash',
			cardLast4: null,
			status: 'completed',
			date: '2024-11-06',
			time: '15:20:18'
		},
		{
			id: 'TXN-003',
			orderId: 'ORD-003',
			customer: 'Mike Johnson',
			amount: 67.89,
			paymentMethod: 'Card',
			cardLast4: '8765',
			status: 'pending',
			date: '2024-11-06',
			time: '16:05:44'
		},
		{
			id: 'TXN-004',
			orderId: 'ORD-004',
			customer: 'Sarah Wilson',
			amount: 34.56,
			paymentMethod: 'UPI',
			cardLast4: null,
			status: 'completed',
			date: '2024-11-05',
			time: '19:48:33'
		},
		{
			id: 'TXN-005',
			orderId: 'ORD-005',
			customer: 'Tom Brown',
			amount: 12.34,
			paymentMethod: 'Card',
			cardLast4: '1234',
			status: 'refunded',
			date: '2024-11-05',
			time: '18:22:11'
		},
		{
			id: 'TXN-006',
			orderId: 'ORD-006',
			customer: 'Emily Davis',
			amount: 89.99,
			paymentMethod: 'Cash',
			cardLast4: null,
			status: 'completed',
			date: '2024-11-05',
			time: '20:15:55'
		}
	]);

	let searchQuery = $state('');
	let statusFilter = $state('all');
	let paymentFilter = $state('all');

	const filteredTransactions = $derived(
		transactions.filter((txn) => {
			const matchesSearch =
				txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				txn.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
				txn.orderId.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
			const matchesPayment = paymentFilter === 'all' || txn.paymentMethod === paymentFilter;
			return matchesSearch && matchesStatus && matchesPayment;
		})
	);

	const totalAmount = $derived(
		filteredTransactions.reduce((sum, txn) => {
			if (txn.status === 'completed') return sum + txn.amount;
			if (txn.status === 'refunded') return sum - txn.amount;
			return sum;
		}, 0)
	);

	function getStatusBadge(status: string) {
		switch (status) {
			case 'completed':
				return { variant: 'default' as const, text: 'Completed' };
			case 'pending':
				return { variant: 'secondary' as const, text: 'Pending' };
			case 'refunded':
				return { variant: 'destructive' as const, text: 'Refunded' };
			case 'failed':
				return { variant: 'destructive' as const, text: 'Failed' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function getPaymentIcon(method: string) {
		switch (method) {
			case 'Card':
				return IconCreditCard;
			case 'Cash':
				return IconCash;
			default:
				return IconReceipt;
		}
	}

	function viewTransaction(txnId: string) {
		console.log('View transaction:', txnId);
	}

	function exportTransactions() {
		console.log('Export transactions');
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Transactions</h1>
					<p class="text-muted-foreground">View and manage all payment transactions</p>
				</div>
				<Button onclick={exportTransactions}>
					<IconDownload class="mr-2 h-4 w-4" />
					Export
				</Button>
			</div>

			<!-- Summary Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-3">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Transactions</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{filteredTransactions.length}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Amount</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Average Transaction</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">
							${filteredTransactions.length > 0 ? (totalAmount / filteredTransactions.length).toFixed(2) : '0.00'}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters and Search -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
					<div class="relative max-w-sm flex-1">
						<IconSearch
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input placeholder="Search transactions..." bind:value={searchQuery} class="pl-9" />
					</div>
				</div>

				<div class="flex gap-2">
					<select
						bind:value={statusFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Status</option>
						<option value="completed">Completed</option>
						<option value="pending">Pending</option>
						<option value="refunded">Refunded</option>
						<option value="failed">Failed</option>
					</select>

					<select
						bind:value={paymentFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Methods</option>
						<option value="Card">Card</option>
						<option value="Cash">Cash</option>
						<option value="UPI">UPI</option>
					</select>
				</div>
			</div>

			<!-- Transactions Table -->
			<div class="px-6">
				<div class="rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Transaction ID</Table.Head>
								<Table.Head>Order</Table.Head>
								<Table.Head>Customer</Table.Head>
								<Table.Head>Payment Method</Table.Head>
								<Table.Head>Amount</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Date & Time</Table.Head>
								<Table.Head class="text-right">Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredTransactions as txn (txn.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{txn.id}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{txn.orderId}</Table.Cell>
									<Table.Cell>{txn.customer}</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<svelte:component
												this={getPaymentIcon(txn.paymentMethod)}
												class="h-4 w-4"
											/>
											{txn.paymentMethod}
											{#if txn.cardLast4}
												<span class="text-muted-foreground">••••{txn.cardLast4}</span>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell class="font-medium">${txn.amount.toFixed(2)}</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusBadge(txn.status).variant}>
											{getStatusBadge(txn.status).text}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="text-sm">
											<div>{txn.date}</div>
											<div class="text-muted-foreground">{txn.time}</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="ghost" size="sm" onclick={() => viewTransaction(txn.id)}>
											<IconEye class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if filteredTransactions.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconReceipt class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No transactions found</h3>
					<p class="text-muted-foreground">Try adjusting your search or filter criteria.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
