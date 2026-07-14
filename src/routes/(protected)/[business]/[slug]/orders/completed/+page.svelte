<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { IconEye, IconPrinter, IconReceipt, IconCheck, IconRefresh } from '@tabler/icons-svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { EmptyState } from '$lib/components/data-display';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import QrBadge from '$lib/components/global/qr-badge.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Order } from '$lib/api/order';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { formatOrderType } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

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
			time: new Date(order.createdAt).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit'
			}),
			items: order.items.length,
			paymentMethod: order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus,
			completedAt: order.actualCompletionTime
				? new Date(order.actualCompletionTime).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit'
					})
				: new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			orderSource: order.orderSource
		}))
	);

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
		goto(`/${$page.params.business}/${$page.params.slug}/orders/${orderId}`);
	}

	function printReceipt(orderId: string) {
		goto(`/${$page.params.business}/${$page.params.slug}/orders/${orderId}?print=true`);
	}

	function onDateFilterChange(value: string) {
		dateFilter = value;
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

<PageShell title="Completed Orders" description="View all successfully completed orders">
	{#snippet actions()}
		<div aria-live="polite">
			<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
				<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
				{isRefreshing ? 'Refreshing...' : 'Refresh'}
			</Button>
		</div>
	{/snippet}

	<!-- Stats -->
	<div class="flex gap-4">
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Orders Completed</p>
			<p class="text-2xl font-bold">{filteredOrders.length}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Revenue</p>
			<p class="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<SearchInput
			bind:value={searchQuery}
			placeholder="Search orders..."
			debounceMs={300}
			class="max-w-sm"
		/>
		<div class="flex gap-2">
			<FilterDropdown
				value={dateFilter}
				placeholder="Date"
				allOptionLabel="All Time"
				onValueChange={onDateFilterChange}
				options={[
					{ value: 'today', label: 'Today' },
					{ value: 'yesterday', label: 'Yesterday' }
				]}
			/>
			<FilterDropdown
				bind:value={typeFilter}
				placeholder="All Types"
				allOptionLabel="All Types"
				options={[
					{ value: 'Dine-In', label: 'Dine-In' },
					{ value: 'Takeaway', label: 'Takeaway' },
					{ value: 'Delivery', label: 'Delivery' }
				]}
			/>
		</div>
	</div>

	<!-- Orders Table -->
	<div class="overflow-x-auto rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Order ID</Table.Head>
					<Table.Head class="hidden sm:table-cell">Customer</Table.Head>
					<Table.Head class="hidden lg:table-cell">Type</Table.Head>
					<Table.Head class="hidden lg:table-cell">Items</Table.Head>
					<Table.Head>Total</Table.Head>
					<Table.Head>Payment</Table.Head>
					<Table.Head class="hidden md:table-cell">Completed At</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredOrders as order (order.id)}
					<Table.Row>
						<Table.Cell class="font-medium">
							<div class="flex items-center gap-2">
								<IconCheck class="h-4 w-4 text-success" />
								{order.id}
								{#if order.orderSource === 'customer_qr'}
									<QrBadge />
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="hidden sm:table-cell">{order.customer}</Table.Cell>
						<Table.Cell class="hidden lg:table-cell">
							<Badge variant="outline">{order.type}</Badge>
						</Table.Cell>
						<Table.Cell class="hidden lg:table-cell"
							>{order.items} {order.items === 1 ? 'item' : 'items'}</Table.Cell
						>
						<Table.Cell class="font-medium">{formatCurrency(order.total)}</Table.Cell>
						<Table.Cell>{order.paymentMethod}</Table.Cell>
						<Table.Cell class="hidden md:table-cell">
							<div class="text-sm">
								<div>{order.date}</div>
								<div class="text-muted-foreground">{order.completedAt}</div>
							</div>
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button
									variant="ghost"
									size="icon"
									onclick={() => viewOrder(order.orderId)}
									aria-label="View order"
								>
									<IconEye class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => printReceipt(order.orderId)}
									aria-label="Print receipt"
								>
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
		<EmptyState
			type="no-results"
			title="No completed orders"
			description="Completed orders will appear here."
		/>
	{/if}
</PageShell>
