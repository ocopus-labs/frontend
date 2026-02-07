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
		IconDeviceMobile,
		IconRefresh
	} from '@tabler/icons-svelte';
	import { EmptyState } from '$lib/components/data-display';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { toast } from 'svelte-sonner';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import type { Payment, PaymentMethod, PaymentSummary } from '$lib/api/payment';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	let searchQuery = $state('');
	let isRefreshing = $state(false);

	const payments = $derived(data.payments as Payment[]);
	const summary = $derived(data.summary as PaymentSummary | null);

	// Client-side search filtering on the current page of results
	const filteredPayments = $derived(
		searchQuery
			? payments.filter((payment) => {
					const q = searchQuery.toLowerCase();
					return (
						payment.paymentNumber.toLowerCase().includes(q) ||
						payment.orderNumber.toLowerCase().includes(q) ||
						(payment.customerInfo?.name?.toLowerCase().includes(q) ?? false)
					);
				})
			: payments
	);

	const totalAmount = $derived(
		filteredPayments.reduce((sum, payment) => {
			if (payment.status === 'completed') return sum + payment.amount;
			if (payment.status === 'refunded') return sum - payment.amount;
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
			case 'partially_refunded':
				return { variant: 'outline' as const, text: 'Partial Refund' };
			case 'failed':
				return { variant: 'destructive' as const, text: 'Failed' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function getPaymentIcon(method: PaymentMethod) {
		switch (method) {
			case 'card':
				return IconCreditCard;
			case 'cash':
				return IconCash;
			case 'upi':
				return IconDeviceMobile;
			default:
				return IconReceipt;
		}
	}

	function getPaymentMethodLabel(method: PaymentMethod): string {
		switch (method) {
			case 'card':
				return 'Card';
			case 'cash':
				return 'Cash';
			case 'upi':
				return 'UPI';
			case 'net_banking':
				return 'Net Banking';
			case 'wallet':
				return 'Wallet';
			default:
				return 'Other';
		}
	}

	function formatDateTime(dateString: string) {
		const date = new Date(dateString);
		return {
			date: date.toLocaleDateString(),
			time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		};
	}

	function viewTransaction(payment: Payment) {
		if (payment.orderId) {
			goto(`/${$page.params.business}/${$page.params.slug}/orders/${payment.orderId}`);
		} else {
			toast.info('No order linked to this payment');
		}
	}

	function escapeCSVField(value: unknown): string {
		const str = String(value ?? '');
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	}

	function exportTransactions() {
		const csvContent = [
			['Payment ID', 'Order Number', 'Customer', 'Method', 'Amount', 'Status', 'Date'].join(','),
			...filteredPayments.map((p) =>
				[
					escapeCSVField(p.paymentNumber),
					escapeCSVField(p.orderNumber),
					escapeCSVField(p.customerInfo?.name || 'Guest'),
					escapeCSVField(p.method),
					escapeCSVField(p.amount),
					escapeCSVField(p.status),
					escapeCSVField(new Date(p.createdAt).toISOString())
				].join(',')
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function refresh() {
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	function applyStatusFilter(status: string) {
		const params = new URLSearchParams($page.url.searchParams);
		if (status === 'all') {
			params.delete('status');
		} else {
			params.set('status', status);
		}
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function applyMethodFilter(method: string) {
		const params = new URLSearchParams($page.url.searchParams);
		if (method === 'all') {
			params.delete('method');
		} else {
			params.set('method', method);
		}
		params.set('page', '1');
		goto(`?${params.toString()}`);
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
				<div class="flex gap-2">
					<Button variant="outline" onclick={refresh} disabled={isRefreshing}>
						<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
						Refresh
					</Button>
					<Button onclick={exportTransactions}>
						<IconDownload class="mr-2 h-4 w-4" />
						Export
					</Button>
				</div>
			</div>

			<!-- Summary Cards -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Transactions</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{data.total}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Amount</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Average Transaction</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">
							{formatCurrency(
								filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0
							)}
						</div>
					</Card.Content>
				</Card.Root>
				{#if summary}
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm font-medium">Pending Amount</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{formatCurrency(summary.pendingAmount)}</div>
						</Card.Content>
					</Card.Root>
				{/if}
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
						value={data.statusFilter}
						onchange={(e) => applyStatusFilter(e.currentTarget.value)}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Status</option>
						<option value="completed">Completed</option>
						<option value="pending">Pending</option>
						<option value="refunded">Refunded</option>
						<option value="failed">Failed</option>
					</select>

					<select
						value={data.methodFilter}
						onchange={(e) => applyMethodFilter(e.currentTarget.value)}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Methods</option>
						<option value="card">Card</option>
						<option value="cash">Cash</option>
						<option value="upi">UPI</option>
						<option value="net_banking">Net Banking</option>
						<option value="wallet">Wallet</option>
					</select>
				</div>
			</div>

			<!-- Transactions Table -->
			<div class="px-6">
				<div class="overflow-x-auto rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Payment ID</Table.Head>
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
							{#each filteredPayments as payment (payment.id)}
								{@const dateTime = formatDateTime(payment.createdAt)}
								{@const PaymentIcon = getPaymentIcon(payment.method)}
								<Table.Row>
									<Table.Cell class="font-mono text-sm font-medium"
										>{payment.paymentNumber}</Table.Cell
									>
									<Table.Cell class="font-mono text-sm text-muted-foreground"
										>{payment.orderNumber}</Table.Cell
									>
									<Table.Cell>{payment.customerInfo?.name || 'Guest'}</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<PaymentIcon class="h-4 w-4" />
											{getPaymentMethodLabel(payment.method)}
										</div>
									</Table.Cell>
									<Table.Cell class="font-medium">{formatCurrency(payment.amount)}</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusBadge(payment.status).variant}>
											{getStatusBadge(payment.status).text}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="text-sm">
											<div>{dateTime.date}</div>
											<div class="text-muted-foreground">{dateTime.time}</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button
											variant="ghost"
											size="icon"
											onclick={() => viewTransaction(payment)}
											aria-label="View order"
										>
											<IconEye class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if filteredPayments.length === 0}
				<EmptyState
					type="no-results"
					title="No transactions found"
					description="Transactions will appear here after payments are processed."
				/>
			{/if}

			<!-- Pagination -->
			{#if data.totalPages > 1}
				<div class="flex items-center justify-between px-6">
					<p class="text-sm text-muted-foreground">
						Showing <span class="font-medium">{(data.page - 1) * data.limit + 1}</span> to
						<span class="font-medium">{Math.min(data.page * data.limit, data.total)}</span> of
						<span class="font-medium">{data.total}</span> transactions
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={data.page <= 1}
							onclick={() => goToPage(data.page - 1)}
						>
							<ChevronLeft class="h-4 w-4" />
							Previous
						</Button>

						<div class="flex items-center gap-1">
							{#each Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
								const start = Math.max(1, Math.min(data.page - 2, data.totalPages - 4));
								return start + i;
							}) as pageNum}
								<Button
									variant={pageNum === data.page ? 'default' : 'ghost'}
									size="sm"
									class="w-9"
									onclick={() => goToPage(pageNum)}
								>
									{pageNum}
								</Button>
							{/each}
						</div>

						<Button
							variant="outline"
							size="sm"
							disabled={data.page >= data.totalPages}
							onclick={() => goToPage(data.page + 1)}
						>
							Next
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
