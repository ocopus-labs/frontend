<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import {
		IconEye,
		IconDownload,
		IconRefresh,
		IconChevronLeft,
		IconChevronRight
	} from '@tabler/icons-svelte';
	import StatCard from '$lib/components/global/stat-card.svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import QrBadge from '$lib/components/global/qr-badge.svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Order } from '$lib/api/order';
	import { exportOrders } from '$lib/api/order';
	import { downloadBlob } from '$lib/utils/export';
	import { userFriendlyError } from '$lib/utils/error';
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
			type: formatOrderType(order.orderType),
			status: order.status,
			total: order.pricing.total,
			date: new Date(order.createdAt).toLocaleDateString(),
			time: new Date(order.createdAt).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit'
			}),
			items: order.items.map((item) => item.name),
			orderSource: order.orderSource
		}))
	);

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

	function getStatusPillStatus(
		status: string
	): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
		switch (status) {
			case 'completed':
				return 'success';
			case 'ready':
				return 'success';
			case 'serving':
				return 'success';
			case 'cancelled':
				return 'error';
			case 'refunded':
				return 'error';
			case 'preparing':
				return 'warning';
			case 'active':
				return 'info';
			default:
				return 'neutral';
		}
	}

	function viewOrder(orderId: string) {
		goto(`/${$page.params.business}/${$page.params.slug}/orders/${orderId}`);
	}

	async function exportHistory() {
		try {
			const blob = await exportOrders(data.businessId, {
				status: statusFilter !== 'all' ? statusFilter : undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined
			});
			downloadBlob(blob, `orders-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Orders exported successfully');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to export orders'));
		}
	}

	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:orders');
		isRefreshing = false;
	}

	const paginationLimit = $derived(data.pagination?.limit || 50);
	const paginationOffset = $derived(data.pagination?.offset || 0);
	const totalOrders = $derived(data.total || 0);
	const currentPage = $derived(Math.floor(paginationOffset / paginationLimit) + 1);
	const totalPages = $derived(Math.max(1, Math.ceil(totalOrders / paginationLimit)));

	function applyDateFilter() {
		const url = new URL($page.url);
		if (startDate) url.searchParams.set('from', startDate);
		else url.searchParams.delete('from');
		if (endDate) url.searchParams.set('to', endDate);
		else url.searchParams.delete('to');
		url.searchParams.delete('offset');
		goto(url.toString(), { replaceState: true });
	}

	function goToPage(pageNum: number) {
		const url = new URL($page.url);
		const newOffset = (pageNum - 1) * paginationLimit;
		if (newOffset > 0) url.searchParams.set('offset', String(newOffset));
		else url.searchParams.delete('offset');
		goto(url.toString(), { replaceState: true });
	}
</script>

<PageShell title="Order History" description="Complete history of all orders">
	{#snippet actions()}
		<Button variant="outline" size="sm" onclick={refreshOrders} disabled={isRefreshing}>
			<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
			Refresh
		</Button>
		<Button onclick={exportHistory}>
			<IconDownload class="mr-2 h-4 w-4" />
			Export History
		</Button>
	{/snippet}

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<StatCard label="Total Orders" value={stats.total} />
		<StatCard label="Completed" value={stats.completed} />
		<StatCard label="Cancelled/Refunded" value={stats.cancelled + stats.refunded} />
		<StatCard label="Revenue" value={formatCurrency(stats.revenue)} />
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
			<SearchInput
				bind:value={searchQuery}
				placeholder="Search orders..."
				debounceMs={300}
				class="max-w-sm"
			/>
			<div class="flex flex-wrap gap-2">
				<FilterDropdown
					bind:value={statusFilter}
					placeholder="All Status"
					allOptionLabel="All Status"
					options={[
						{ value: 'active', label: 'Active' },
						{ value: 'preparing', label: 'Preparing' },
						{ value: 'ready', label: 'Ready' },
						{ value: 'serving', label: 'Serving' },
						{ value: 'completed', label: 'Completed' },
						{ value: 'cancelled', label: 'Cancelled' },
						{ value: 'refunded', label: 'Refunded' }
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
				<Input
					type="date"
					bind:value={startDate}
					class="w-auto"
					placeholder="Start date"
					onchange={applyDateFilter}
				/>
				<Input
					type="date"
					bind:value={endDate}
					class="w-auto"
					placeholder="End date"
					onchange={applyDateFilter}
				/>
			</div>
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
					<Table.Head>Status</Table.Head>
					<Table.Head class="hidden md:table-cell">Date & Time</Table.Head>
					<Table.Head class="text-right">Action</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredOrders as order (order.id)}
					<Table.Row>
						<Table.Cell class="font-medium">
							<div class="flex items-center gap-1.5">
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
						<Table.Cell class="hidden lg:table-cell">
							<div class="max-w-[200px] truncate text-sm text-muted-foreground">
								{order.items.join(', ')}
							</div>
						</Table.Cell>
						<Table.Cell class="font-medium">{formatCurrency(order.total)}</Table.Cell>
						<Table.Cell>
							<StatusPill
								label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
								status={getStatusPillStatus(order.status)}
							/>
						</Table.Cell>
						<Table.Cell class="hidden md:table-cell">
							<div class="text-sm">
								<div>{order.date}</div>
								<div class="text-muted-foreground">{order.time}</div>
							</div>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="ghost"
								size="icon"
								onclick={() => viewOrder(order.orderId)}
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

	{#if filteredOrders.length === 0}
		<EmptyState
			type="no-results"
			title="No orders found"
			description="Try adjusting your filters or date range."
		/>
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Showing {paginationOffset + 1}–{Math.min(paginationOffset + paginationLimit, totalOrders)} of
				{totalOrders} orders
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					<IconChevronLeft class="mr-1 h-4 w-4" />
					Previous
				</Button>
				<span class="text-sm">
					Page {currentPage} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					Next
					<IconChevronRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</PageShell>
