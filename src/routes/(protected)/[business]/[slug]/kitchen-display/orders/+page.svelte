<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconClock,
		IconCheck,
		IconFlame,
		IconAlertTriangle,
		IconRefresh,
		IconWifi,
		IconWifiOff,
		IconPlayerPlay,
		IconMaximize,
		IconMinimize,
		IconVolume,
		IconVolumeOff,
		IconFilter
	} from '@tabler/icons-svelte';
	import { invalidate } from '$app/navigation';
	import { updateItemStatus, updateOrderStatus, type Order, type OrderItem } from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import {
		connectSocket,
		disconnectSocket,
		joinBusiness,
		leaveBusiness,
		onOrderCreated,
		onOrderUpdated,
		onOrderCompleted,
		onItemStatus,
		getSocket
	} from '$lib/socket';

	let { data }: { data: PageData } = $props();

	let isRefreshing = $state(false);
	let processingItems = $state<Set<string>>(new Set());
	let isConnected = $state(false);
	let now = $state(Date.now());
	let isFullscreen = $state(false);
	let soundEnabled = $state(browser ? localStorage.getItem('kitchen-sound') !== 'false' : true);
	let filter = $state<'all' | 'pending' | 'preparing' | 'ready'>('all');

	let tickInterval: ReturnType<typeof setInterval> | null = null;
	let audioCtx: AudioContext | null = null;

	function playBeep() {
		if (!soundEnabled || !browser) return;
		try {
			if (!audioCtx) audioCtx = new AudioContext();
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.frequency.value = 660;
			osc.type = 'sine';
			gain.gain.value = 0.3;
			osc.start();
			osc.stop(audioCtx.currentTime + 0.15);
			setTimeout(() => {
				const osc2 = audioCtx!.createOscillator();
				const gain2 = audioCtx!.createGain();
				osc2.connect(gain2);
				gain2.connect(audioCtx!.destination);
				osc2.frequency.value = 880;
				osc2.type = 'sine';
				gain2.gain.value = 0.3;
				osc2.start();
				osc2.stop(audioCtx!.currentTime + 0.15);
			}, 180);
		} catch {
			// AudioContext may not be available
		}
	}

	function toggleSound() {
		soundEnabled = !soundEnabled;
		if (browser) localStorage.setItem('kitchen-sound', String(soundEnabled));
	}

	async function toggleFullscreen() {
		if (!browser) return;
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
				isFullscreen = true;
			} else {
				await document.exitFullscreen();
				isFullscreen = false;
			}
		} catch {
			// Fullscreen may not be supported
		}
	}

	// WebSocket setup for real-time updates
	onMount(() => {
		tickInterval = setInterval(() => {
			now = Date.now();
		}, 1000);

		document.addEventListener('fullscreenchange', () => {
			isFullscreen = !!document.fullscreenElement;
		});

		const socket = connectSocket();

		if (socket) {
			socket.on('connect', () => {
				isConnected = true;
				joinBusiness(data.businessId);
				toast.success('Real-time updates connected');
			});

			socket.on('disconnect', () => {
				isConnected = false;
			});

			// Listen for new orders
			const unsubOrderCreated = onOrderCreated((order) => {
				invalidate('app:orders');
				playBeep();
				toast.info(`New order: ${order.orderNumber}`);
			});

			// Listen for order updates
			const unsubOrderUpdated = onOrderUpdated(() => {
				invalidate('app:orders');
			});

			// Listen for completed orders
			const unsubOrderCompleted = onOrderCompleted(() => {
				invalidate('app:orders');
				toast.success('Order completed');
			});

			// Listen for item status changes
			const unsubItemStatus = onItemStatus(() => {
				invalidate('app:orders');
			});

			return () => {
				unsubOrderCreated();
				unsubOrderUpdated();
				unsubOrderCompleted();
				unsubItemStatus();
			};
		}
	});

	onDestroy(() => {
		leaveBusiness(data.businessId);
		disconnectSocket();
		if (tickInterval) clearInterval(tickInterval);
	});

	// Transform API orders to kitchen display format
	interface KitchenOrder {
		id: string;
		orderId: string;
		table: string;
		type: string;
		createdAt: string;
		rawCreatedAt: number;
		elapsed: number;
		priority: string;
		priorityWeight: number;
		readyCount: number;
		totalCount: number;
		items: Array<{
			id: string;
			name: string;
			quantity: number;
			notes: string | null;
			status: string;
		}>;
	}

	function getPriorityWeight(priority: string): number {
		switch (priority) {
			case 'urgent': return 3;
			case 'high': return 2;
			case 'normal': return 1;
			default: return 0;
		}
	}

	let allOrders = $derived<KitchenOrder[]>(
		(data.orders || []).map((order: Order) => {
			const createdAt = new Date(order.createdAt);
			const elapsed = Math.floor((now - createdAt.getTime()) / 60000);
			const items = order.items.map((item: OrderItem) => ({
				id: item.id,
				name: item.name,
				quantity: item.quantity,
				notes: item.modifiers?.specialInstructions || null,
				status: item.status
			}));

			return {
				id: order.orderNumber,
				orderId: order.id,
				table: order.tableNumber || formatOrderType(order.orderType),
				type: formatOrderType(order.orderType),
				createdAt: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				rawCreatedAt: createdAt.getTime(),
				elapsed,
				priority: order.priority,
				priorityWeight: getPriorityWeight(order.priority),
				readyCount: items.filter((i) => i.status === 'ready' || i.status === 'served').length,
				totalCount: items.length,
				items
			};
		}).sort((a, b) => {
			// Sort: urgent first, then by elapsed time (oldest first)
			if (b.priorityWeight !== a.priorityWeight) return b.priorityWeight - a.priorityWeight;
			return a.rawCreatedAt - b.rawCreatedAt;
		})
	);

	let orders = $derived(
		filter === 'all'
			? allOrders
			: allOrders.filter((order) => {
					if (filter === 'ready') return order.items.every((i) => i.status === 'ready' || i.status === 'served');
					if (filter === 'preparing') return order.items.some((i) => i.status === 'preparing');
					if (filter === 'pending') return order.items.some((i) => i.status === 'pending');
					return true;
				})
	);

	let pendingCount = $derived(allOrders.filter((o) => o.items.some((i) => i.status === 'pending')).length);
	let preparingCount = $derived(allOrders.filter((o) => o.items.some((i) => i.status === 'preparing')).length);
	let readyCount = $derived(allOrders.filter((o) => o.items.every((i) => i.status === 'ready' || i.status === 'served')).length);

	function formatOrderType(type: string): string {
		switch (type) {
			case 'dine_in':
				return 'Dine-In';
			case 'takeaway':
				return 'Takeaway';
			case 'delivery':
				return 'Delivery';
			case 'online':
				return 'Online';
			default:
				return type;
		}
	}

	function getElapsedColor(elapsed: number) {
		if (elapsed >= 15) return 'text-red-500';
		if (elapsed >= 10) return 'text-yellow-500';
		return 'text-green-500';
	}

	function getElapsedBg(elapsed: number) {
		if (elapsed >= 15) return 'bg-red-500/10';
		if (elapsed >= 10) return 'bg-yellow-500/10';
		return '';
	}

	function getPriorityBadge(priority: string) {
		switch (priority) {
			case 'urgent':
				return { variant: 'destructive' as const, text: 'URGENT', icon: IconFlame };
			case 'high':
				return { variant: 'secondary' as const, text: 'HIGH', icon: IconAlertTriangle };
			default:
				return null;
		}
	}

	function getItemStatusColor(status: string) {
		switch (status) {
			case 'ready':
			case 'served':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'preparing':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
		}
	}

	async function updateItem(orderId: string, itemId: string, status: 'pending' | 'preparing' | 'ready') {
		const key = `${orderId}-${itemId}`;
		if (processingItems.has(key)) return;

		processingItems.add(key);
		processingItems = new Set(processingItems);

		try {
			await updateItemStatus(data.businessId, orderId, itemId, status);
			await invalidate('app:orders');
			toast.success(`Item marked as ${status}`);
		} catch (error) {
			toast.error('Failed to update item status');
		} finally {
			processingItems.delete(key);
			processingItems = new Set(processingItems);
		}
	}

	async function startAllItems(order: KitchenOrder) {
		const pendingItems = order.items.filter((i) => i.status === 'pending');
		if (pendingItems.length === 0) return;

		const results = await Promise.allSettled(
			pendingItems.map((item) =>
				updateItemStatus(data.businessId, order.orderId, item.id, 'preparing')
			)
		);
		await invalidate('app:orders');

		const failed = results.filter((r) => r.status === 'rejected').length;
		if (failed > 0) {
			toast.error(`Failed to start ${failed} item${failed === 1 ? '' : 's'}`);
		} else {
			toast.success(`Started all ${pendingItems.length} item${pendingItems.length === 1 ? '' : 's'}`);
		}
	}

	async function completeOrder(orderId: string) {
		try {
			await updateOrderStatus(data.businessId, orderId, 'completed');
			await invalidate('app:orders');
			toast.success('Order completed!');
		} catch (error) {
			toast.error('Failed to complete order');
		}
	}

	async function refreshOrders() {
		isRefreshing = true;
		await invalidate('app:orders');
		isRefreshing = false;
	}
</script>

<div class="flex flex-1 flex-col bg-muted/30">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<!-- Header -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Kitchen Display</h1>
					<div class="flex items-center gap-2">
						<p class="text-muted-foreground">
							{orders.length} {orders.length === 1 ? 'order' : 'orders'}
							{#if filter !== 'all'} ({filter}){/if}
						</p>
						{#if isConnected}
							<Badge variant="outline" class="border-green-500 text-green-600">
								<IconWifi class="mr-1 h-3 w-3" />
								Live
							</Badge>
						{:else}
							<Badge variant="outline" class="border-yellow-500 text-yellow-600">
								<IconWifiOff class="mr-1 h-3 w-3" />
								Offline
							</Badge>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-2" aria-live="polite">
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={toggleSound}
						aria-label={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
					>
						{#if soundEnabled}
							<IconVolume class="h-4 w-4" />
						{:else}
							<IconVolumeOff class="h-4 w-4" />
						{/if}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={toggleFullscreen}
						aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
					>
						{#if isFullscreen}
							<IconMinimize class="h-4 w-4" />
						{:else}
							<IconMaximize class="h-4 w-4" />
						{/if}
					</Button>
					<Button onclick={refreshOrders} variant="outline" disabled={isRefreshing}>
						<IconRefresh class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
						{isRefreshing ? 'Refreshing...' : 'Refresh'}
					</Button>
				</div>
			</div>

			<!-- Filter tabs -->
			<div class="flex gap-2 px-6 overflow-x-auto">
				<Button
					variant={filter === 'all' ? 'default' : 'outline'}
					size="sm"
					onclick={() => (filter = 'all')}
				>
					All ({allOrders.length})
				</Button>
				<Button
					variant={filter === 'pending' ? 'default' : 'outline'}
					size="sm"
					onclick={() => (filter = 'pending')}
					class={pendingCount > 0 ? 'border-gray-400' : ''}
				>
					Pending ({pendingCount})
				</Button>
				<Button
					variant={filter === 'preparing' ? 'default' : 'outline'}
					size="sm"
					onclick={() => (filter = 'preparing')}
					class={preparingCount > 0 ? 'border-yellow-400' : ''}
				>
					Preparing ({preparingCount})
				</Button>
				<Button
					variant={filter === 'ready' ? 'default' : 'outline'}
					size="sm"
					onclick={() => (filter = 'ready')}
					class={readyCount > 0 ? 'border-green-400' : ''}
				>
					Ready ({readyCount})
				</Button>
			</div>

			<!-- Orders Grid -->
			<div class="grid grid-cols-1 gap-4 px-6 md:grid-cols-2 xl:grid-cols-3">
				{#each orders as order (order.id)}
					{@const allReady = order.items.every((i) => i.status === 'ready' || i.status === 'served')}
					{@const hasPending = order.items.some((i) => i.status === 'pending')}
					{@const priorityBadge = getPriorityBadge(order.priority)}
					{@const progressPct = order.totalCount > 0 ? Math.round((order.readyCount / order.totalCount) * 100) : 0}
					<Card.Root
						class="relative overflow-hidden transition-all duration-300 {order.priority === 'urgent'
							? 'ring-2 ring-red-500'
							: order.priority === 'high'
								? 'ring-1 ring-yellow-400'
								: ''} {getElapsedBg(order.elapsed)}"
					>
						<!-- Priority accent bar -->
						{#if order.priority === 'urgent'}
							<div class="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
						{:else if order.priority === 'high'}
							<div class="absolute top-0 left-0 right-0 h-1 bg-yellow-500"></div>
						{:else if allReady}
							<div class="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
						{/if}

						<Card.Header class="pb-2">
							<div class="flex items-start justify-between">
								<div>
									<Card.Title class="flex items-center gap-2 text-lg">
										<span class="font-mono font-bold">{order.id}</span>
										{#if priorityBadge}
											<Badge variant={priorityBadge.variant}>
												{#if priorityBadge.text === 'URGENT'}
													<IconFlame class="mr-1 h-3 w-3" />
												{:else}
													<IconAlertTriangle class="mr-1 h-3 w-3" />
												{/if}
												{priorityBadge.text}
											</Badge>
										{/if}
									</Card.Title>
									<Card.Description class="flex items-center gap-2">
										<Badge variant="outline">{order.table}</Badge>
										<span class="text-xs">{order.type}</span>
									</Card.Description>
								</div>
								<div class="text-right">
									<div class="flex items-center gap-1 {getElapsedColor(order.elapsed)}">
										<IconClock class="h-4 w-4" />
										<span class="font-mono text-lg font-bold">{order.elapsed}m</span>
									</div>
									<p class="text-xs text-muted-foreground">since {order.createdAt}</p>
								</div>
							</div>
							<!-- Progress bar -->
							<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full transition-all duration-500 {allReady
										? 'bg-green-500'
										: progressPct > 0
											? 'bg-yellow-500'
											: 'bg-gray-400'}"
									style="width: {progressPct}%"
								></div>
							</div>
						</Card.Header>

						<Card.Content class="space-y-2">
							{#each order.items as item}
								{@const isProcessing = processingItems.has(`${order.orderId}-${item.id}`)}
								<div
									class="flex items-center justify-between rounded-md p-2 transition-colors {getItemStatusColor(
										item.status
									)}"
								>
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<span class="font-medium">
												{item.quantity}x {item.name}
											</span>
											{#if item.status === 'preparing'}
												<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500"></span>
											{/if}
										</div>
										{#if item.notes}
											<p class="mt-1 text-xs font-medium opacity-75">
												<IconAlertTriangle class="mr-1 inline h-3 w-3" />
												{item.notes}
											</p>
										{/if}
									</div>
									<div class="ml-2">
										{#if item.status === 'pending'}
											<Button
												size="sm"
												variant="outline"
												disabled={isProcessing}
												onclick={() => updateItem(order.orderId, item.id, 'preparing')}
											>
												{isProcessing ? 'Starting...' : 'Start'}
											</Button>
										{:else if item.status === 'preparing'}
											<Button
												size="sm"
												disabled={isProcessing}
												onclick={() => updateItem(order.orderId, item.id, 'ready')}
											>
												<IconCheck class="mr-1 h-3 w-3" />
												{isProcessing ? 'Saving...' : 'Done'}
											</Button>
										{:else}
											<IconCheck class="h-5 w-5 text-green-600" />
										{/if}
									</div>
								</div>
							{/each}
						</Card.Content>

						<Card.Footer class="flex-col gap-2">
							{#if allReady}
								<Button class="w-full bg-green-600 hover:bg-green-700" onclick={() => completeOrder(order.orderId)}>
									<IconCheck class="mr-2 h-4 w-4" />
									Complete Order
								</Button>
							{:else}
								<div class="flex w-full items-center justify-between">
									<span class="text-sm text-muted-foreground">
										{order.readyCount} / {order.totalCount} {order.totalCount === 1 ? 'item' : 'items'} ready
									</span>
									{#if hasPending}
										<Button
											size="sm"
											variant="secondary"
											onclick={() => startAllItems(order)}
										>
											<IconPlayerPlay class="mr-1 h-3 w-3" />
											Start All
										</Button>
									{/if}
								</div>
							{/if}
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>

			{#if orders.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					{#if filter !== 'all'}
						<IconFilter class="h-12 w-12 text-muted-foreground" />
						<h3 class="mt-4 text-lg font-semibold">No {filter} orders</h3>
						<p class="text-muted-foreground">Try a different filter or wait for new orders.</p>
						<Button variant="outline" class="mt-4" onclick={() => (filter = 'all')}>
							Show all orders
						</Button>
					{:else}
						<IconCheck class="h-12 w-12 text-green-500" />
						<h3 class="mt-4 text-lg font-semibold">All caught up!</h3>
						<p class="text-muted-foreground">No pending orders in the queue.</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
