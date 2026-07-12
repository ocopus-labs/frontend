<script lang="ts">
	import type { CustomerOrder } from '$lib/api/customer-me';
	import { getOrders } from '$lib/api/customer-me';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		slug: string;
	}

	let { slug }: Props = $props();

	type FilterTab = 'restaurant' | 'all';

	let activeTab = $state<FilterTab>('restaurant');
	let orders = $state<CustomerOrder[]>([]);
	let nextCursor = $state<string | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');

	async function fetchOrders(cursor?: string) {
		try {
			const result = await getOrders({
				slug: activeTab === 'restaurant' ? slug : undefined,
				cursor,
				limit: 10
			});
			if (cursor) {
				orders = [...orders, ...result.orders];
			} else {
				orders = result.orders;
			}
			nextCursor = result.nextCursor;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to load orders.';
		}
	}

	$effect(() => {
		loading = true;
		error = '';
		// reset when tab changes
		void fetchOrders().finally(() => {
			loading = false;
		});
	});

	async function loadMore() {
		if (!nextCursor || loadingMore) return;
		loadingMore = true;
		await fetchOrders(nextCursor);
		loadingMore = false;
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function statusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'completed':
			case 'delivered':
				return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
			case 'cancelled':
			case 'rejected':
				return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
			case 'pending':
				return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
			default:
				return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
		}
	}

	function getTotal(order: CustomerOrder): string {
		const pricing = order.pricing as Record<string, unknown> | null;
		const total = pricing?.total ?? pricing?.subtotal;
		if (typeof total === 'number') {
			return new Intl.NumberFormat('en-IN', {
				style: 'currency',
				currency: 'INR',
				minimumFractionDigits: 0
			}).format(total);
		}
		return '--';
	}
</script>

<!-- Tab strip -->
<div class="mb-4 flex gap-2">
	<button
		class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-all {activeTab === 'restaurant'
			? 'bg-primary text-primary-foreground shadow-sm'
			: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-muted-foreground'}"
		onclick={() => (activeTab = 'restaurant')}
	>
		This restaurant
	</button>
	<button
		class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-all {activeTab === 'all'
			? 'bg-primary text-primary-foreground shadow-sm'
			: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-muted-foreground'}"
		onclick={() => (activeTab = 'all')}
	>
		All restaurants
	</button>
</div>

{#if loading}
	<div class="space-y-3">
		{#each [1, 2, 3] as _}
			<div class="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-muted"></div>
		{/each}
	</div>
{:else if error}
	<p class="text-sm text-destructive">{error}</p>
{:else if orders.length === 0}
	<p class="text-sm text-muted-foreground">No orders found.</p>
{:else}
	<div class="space-y-3">
		{#each orders as order (order.id)}
			<div
				class="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-border dark:bg-muted/40"
			>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-semibold">#{order.orderNumber}</span>
						<span
							class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize {statusColor(
								order.status
							)}"
						>
							{order.status}
						</span>
					</div>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{formatDate(order.createdAt)}
						{#if order.restaurant?.name && activeTab === 'all'}
							· {order.restaurant.name}
						{/if}
					</p>
				</div>
				<span class="shrink-0 text-sm font-bold text-primary">{getTotal(order)}</span>
			</div>
		{/each}
	</div>

	{#if nextCursor}
		<button
			class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60 dark:border-border dark:bg-card dark:text-foreground"
			onclick={loadMore}
			disabled={loadingMore}
		>
			{#if loadingMore}
				<Loader2Icon class="h-4 w-4 animate-spin" />
				Loading...
			{:else}
				Load more
			{/if}
		</button>
	{/if}
{/if}
