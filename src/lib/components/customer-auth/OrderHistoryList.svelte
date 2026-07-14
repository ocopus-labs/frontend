<script lang="ts">
	import type { CustomerOrder } from '$lib/api/customer-me';
	import { getOrders, reorder } from '$lib/api/customer-me';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import StarIcon from '@lucide/svelte/icons/star';
	import { Shimmer } from '@shimmer-from-structure/svelte';
	import { ReviewOrderDialog } from '$lib/components/reviews';

	// Placeholder rows rendered while loading so <Shimmer> can measure the real
	// row layout and generate a structure-accurate skeleton (their text is made
	// transparent by the library — only the layout/width is used).
	const placeholderOrders: CustomerOrder[] = Array.from({ length: 3 }, (_, i) => ({
		id: `skeleton-${i}`,
		orderNumber: '0000',
		status: 'pending',
		paymentStatus: 'pending',
		orderChannel: null,
		items: [],
		pricing: { total: 0 },
		createdAt: new Date(0).toISOString(),
		restaurantId: 'skeleton',
		restaurant: { slug: 'skeleton', name: 'Restaurant name' }
	}));

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
	let reordering = $state<Record<string, boolean>>({});

	// ── Review dialog ──
	let reviewOpen = $state(false);
	let reviewOrderId = $state('');
	let reviewSlug = $state('');
	let reviewItems = $state<Array<{ menuItemId: string; name: string }>>([]);

	// Distinct rateable items from an order's items JSON.
	function orderItems(order: CustomerOrder): Array<{ menuItemId: string; name: string }> {
		const raw = (order.items as Array<{ menuItemId?: string; name?: string }>) ?? [];
		const seen = new Map<string, { menuItemId: string; name: string }>();
		for (const it of raw) {
			if (it?.menuItemId && !seen.has(it.menuItemId)) {
				seen.set(it.menuItemId, { menuItemId: it.menuItemId, name: it.name ?? 'Item' });
			}
		}
		return [...seen.values()];
	}

	function openReview(order: CustomerOrder) {
		reviewOrderId = order.id;
		reviewSlug = order.restaurant?.slug ?? slug;
		reviewItems = orderItems(order);
		reviewOpen = true;
	}

	async function handleReorder(order: CustomerOrder) {
		reordering = { ...reordering, [order.id]: true };
		try {
			const result = await reorder(order.id);
			if (result.items.length === 0) {
				toast.error('None of these items are available to reorder right now.');
				return;
			}
			// Hydrate the same localStorage cart the ordering page reads on load.
			const cartItems = result.items.map((it) => ({
				cartId: crypto.randomUUID(),
				menuItemId: it.menuItemId,
				name: it.name,
				image: it.image,
				quantity: it.quantity,
				basePrice: it.basePrice,
				unitPrice: it.unitPrice
			}));
			localStorage.setItem(`online-cart:${result.slug}`, JSON.stringify(cartItems));

			if (result.unavailable.length > 0) {
				const names = result.unavailable.map((u) => u.name).join(', ');
				toast.warning(`Some items are no longer available: ${names}`);
			} else {
				toast.success('Items added to your cart');
			}
			await goto(`/order-online/${result.slug}`);
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to reorder');
		} finally {
			reordering = { ...reordering, [order.id]: false };
		}
	}

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
				return 'bg-success/15 text-success';
			case 'cancelled':
			case 'rejected':
				return 'bg-destructive/15 text-destructive';
			case 'pending':
				return 'bg-warning/15 text-warning';
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
			: 'bg-muted text-muted-foreground hover:bg-muted'}"
		onclick={() => (activeTab = 'restaurant')}
	>
		This restaurant
	</button>
	<button
		class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-all {activeTab === 'all'
			? 'bg-primary text-primary-foreground shadow-sm'
			: 'bg-muted text-muted-foreground hover:bg-muted'}"
		onclick={() => (activeTab = 'all')}
	>
		All restaurants
	</button>
</div>

{#if error}
	<p class="text-sm text-destructive">{error}</p>
{:else if !loading && orders.length === 0}
	<p class="text-sm text-muted-foreground">No orders found.</p>
{:else}
	<Shimmer {loading}>
		<div class="space-y-3">
			{#each loading ? placeholderOrders : orders as order (order.id)}
				<div
					class="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 dark:bg-muted/40"
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
					<div class="flex shrink-0 flex-col items-end gap-2">
						<span class="text-sm font-bold text-primary">{getTotal(order)}</span>
						{#if !loading}
							<div class="flex items-center gap-1.5">
								{#if order.status.toLowerCase() === 'completed'}
									<button
										class="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-warning transition-all hover:bg-warning/10 active:scale-[0.98]"
										onclick={() => openReview(order)}
									>
										<StarIcon class="h-3 w-3" />
										Rate
									</button>
								{/if}
								<button
									class="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/10 active:scale-[0.98] disabled:opacity-50"
									onclick={() => handleReorder(order)}
									disabled={reordering[order.id]}
								>
									{#if reordering[order.id]}
										<Loader2Icon class="h-3 w-3 animate-spin" />
									{:else}
										<RotateCcwIcon class="h-3 w-3" />
									{/if}
									Reorder
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</Shimmer>

	{#if !loading && nextCursor}
		<button
			class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-60"
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

<ReviewOrderDialog
	bind:open={reviewOpen}
	slug={reviewSlug}
	orderId={reviewOrderId}
	items={reviewItems}
/>
