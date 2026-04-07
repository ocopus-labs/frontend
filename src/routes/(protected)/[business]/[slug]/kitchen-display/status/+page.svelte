<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		IconWifi,
		IconWifiOff,
		IconVolume,
		IconVolumeOff,
		IconMaximize,
		IconMinimize,
		IconRefresh
	} from '@tabler/icons-svelte';
	import { invalidate } from '$app/navigation';
	import type { Order, OrderItem } from '$lib/api';
	import { formatOrderType } from '$lib/utils/formatting';
	import { onMount, onDestroy } from 'svelte';
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
	import { playNewOrderSound, playAllReadySound } from '$lib/utils/kds-sounds';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	let isConnected = $state(false);
	let isFullscreen = $state(false);
	let soundEnabled = $state(browser ? localStorage.getItem('hall-sound') !== 'false' : true);
	let controlsVisible = $state(true);
	let now = $state(Date.now());

	// Animation: newly ready orders flash
	let newlyReadyIds = $state<Set<string>>(new Set());

	// Auto-hide controls
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let tickInterval: ReturnType<typeof setInterval> | null = null;
	let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

	function debouncedInvalidate(delay = 400) {
		if (invalidateTimer) clearTimeout(invalidateTimer);
		invalidateTimer = setTimeout(() => {
			invalidate('app:orders');
			invalidateTimer = null;
		}, delay);
	}

	function showControls() {
		controlsVisible = true;
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			controlsVisible = false;
		}, 5000);
	}

	// Auto-scroll state
	let preparingCol: HTMLDivElement | undefined = $state();
	let readyCol: HTMLDivElement | undefined = $state();
	let scrollPaused = $state(false);
	let scrollResumeTimer: ReturnType<typeof setTimeout> | null = null;
	let scrollInterval: ReturnType<typeof setInterval> | null = null;

	function pauseScroll() {
		scrollPaused = true;
		if (scrollResumeTimer) clearTimeout(scrollResumeTimer);
		scrollResumeTimer = setTimeout(() => {
			scrollPaused = false;
		}, 10000);
	}

	function startAutoScroll() {
		scrollInterval = setInterval(() => {
			if (scrollPaused) return;
			for (const col of [preparingCol, readyCol]) {
				if (!col) continue;
				if (col.scrollTop + col.clientHeight >= col.scrollHeight - 2) {
					col.scrollTop = 0;
				} else {
					col.scrollTop += 1;
				}
			}
		}, 50);
	}

	function playSound(fn: () => void) {
		if (soundEnabled && browser) fn();
	}

	function toggleSound() {
		soundEnabled = !soundEnabled;
		if (browser) localStorage.setItem('hall-sound', String(soundEnabled));
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

	// WebSocket setup
	let cleanupFns: Array<() => void> = [];

	onMount(() => {
		tickInterval = setInterval(() => {
			now = Date.now();
		}, 1000);

		showControls();
		startAutoScroll();

		document.addEventListener('mousemove', showControls);
		document.addEventListener('touchstart', showControls);
		document.addEventListener('mousemove', pauseScroll);
		document.addEventListener('touchstart', pauseScroll);

		document.addEventListener('fullscreenchange', () => {
			isFullscreen = !!document.fullscreenElement;
		});

		(async () => {
			const socket = await connectSocket();

			if (socket) {
				socket.on('connect', async () => {
					isConnected = true;
					await joinBusiness(data.businessId);
				});

				socket.on('disconnect', () => {
					isConnected = false;
				});

				const unsubOrderCreated = await onOrderCreated(() => {
					invalidate('app:orders');
					playSound(playNewOrderSound);
				});
				cleanupFns.push(unsubOrderCreated);

				const unsubOrderUpdated = await onOrderUpdated(() => {
					debouncedInvalidate();
				});
				cleanupFns.push(unsubOrderUpdated);

				const unsubOrderCompleted = await onOrderCompleted((payload: any) => {
					debouncedInvalidate();
					playSound(playAllReadySound);
					// Flash the ready order
					if (payload?.orderId) {
						newlyReadyIds = new Set([...newlyReadyIds, payload.orderId]);
						setTimeout(() => {
							const next = new Set(newlyReadyIds);
							next.delete(payload.orderId);
							newlyReadyIds = next;
						}, 5000);
					}
				});
				cleanupFns.push(unsubOrderCompleted);

				const unsubItemStatus = await onItemStatus(() => {
					debouncedInvalidate();
				});
				cleanupFns.push(unsubItemStatus);
			}
		})();
	});

	onDestroy(() => {
		cleanupFns.forEach((fn) => fn());
		leaveBusiness(data.businessId);
		disconnectSocket();
		if (hideTimer) clearTimeout(hideTimer);
		if (tickInterval) clearInterval(tickInterval);
		if (scrollInterval) clearInterval(scrollInterval);
		if (scrollResumeTimer) clearTimeout(scrollResumeTimer);
		if (invalidateTimer) clearTimeout(invalidateTimer);
		if (browser) {
			document.removeEventListener('mousemove', showControls);
			document.removeEventListener('touchstart', showControls);
			document.removeEventListener('mousemove', pauseScroll);
			document.removeEventListener('touchstart', pauseScroll);
		}
	});

	function getElapsed(createdAt: string): number {
		return Math.floor((now - new Date(createdAt).getTime()) / 60000);
	}

	function getElapsedColor(minutes: number): string {
		if (minutes >= 15) return 'text-red-400';
		if (minutes >= 10) return 'text-amber-400';
		return 'text-green-400';
	}

	function getElapsedBg(minutes: number): string {
		if (minutes >= 15) return 'border-red-500/50';
		if (minutes >= 10) return 'border-amber-500/50';
		return 'border-gray-700';
	}

	function isOrderPreparing(order: Order): boolean {
		return order.items.some(
			(item: OrderItem) => item.status === 'pending' || item.status === 'preparing'
		);
	}

	function isOrderReady(order: Order): boolean {
		return order.items.every(
			(item: OrderItem) => item.status === 'ready' || item.status === 'served'
		);
	}

	function getProgress(order: Order): number {
		const total = order.items.length;
		if (total === 0) return 0;
		const done = order.items.filter(
			(i: OrderItem) => i.status === 'ready' || i.status === 'served'
		).length;
		return Math.round((done / total) * 100);
	}

	let preparingOrders = $derived(
		(data.activeOrders || []).filter((o: Order) => isOrderPreparing(o))
	);

	let readyOrders = $derived(() => {
		const activeReady = (data.activeOrders || []).filter((o: Order) => isOrderReady(o));
		const thirtyMinAgo = now - 30 * 60 * 1000;
		const recentCompleted = (data.completedOrders || []).filter(
			(o: Order) => new Date(o.updatedAt).getTime() > thirtyMinAgo
		);
		return [...activeReady, ...recentCompleted].slice(0, 12);
	});

	// Extract short display ID from order number (e.g., "ORD-k1a2b3-xY4z" → "#xY4z")
	function shortOrderId(orderNumber: string): string {
		const parts = orderNumber.split('-');
		return '#' + (parts.length >= 3 ? parts[parts.length - 1] : parts[parts.length - 1] || orderNumber).toUpperCase();
	}

	let clockTime = $derived(
		new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	);

	let totalActive = $derived(preparingOrders.length + readyOrders().length);

	async function refreshOrders() {
		await invalidate('app:orders');
	}
</script>

<div
	class="relative flex h-screen flex-col overflow-hidden bg-gray-950 text-white"
	role="status"
	aria-label="Order status display"
>
	<!-- Controls bar - auto-hiding -->
	<div
		class="absolute top-0 right-0 left-0 z-10 flex items-center justify-between bg-gray-950/90 px-6 py-3 backdrop-blur-md transition-all duration-300 {controlsVisible
			? 'translate-y-0 opacity-100'
			: '-translate-y-full opacity-0'}"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-lg font-bold tracking-wide text-gray-200">ORDER STATUS</h1>
			{#if isConnected}
				<Badge variant="outline" class="border-green-500/50 text-green-400 gap-1">
					<IconWifi class="h-3 w-3" />
					Live
				</Badge>
			{:else}
				<Badge variant="outline" class="border-red-500/50 text-red-400 gap-1 animate-pulse">
					<IconWifiOff class="h-3 w-3" />
					Reconnecting
				</Badge>
			{/if}
			<span class="text-sm text-gray-500">{totalActive} active</span>
		</div>

		<span class="font-mono text-lg text-gray-400">{clockTime}</span>

		<div class="flex items-center gap-1">
			<Button variant="ghost" size="icon" class="h-9 w-9 text-gray-400 hover:text-white" onclick={refreshOrders}>
				<IconRefresh class="h-4 w-4" />
			</Button>
			<Button variant="ghost" size="icon" class="h-9 w-9 text-gray-400 hover:text-white" onclick={toggleSound}>
				{#if soundEnabled}
					<IconVolume class="h-4 w-4" />
				{:else}
					<IconVolumeOff class="h-4 w-4" />
				{/if}
			</Button>
			<Button variant="ghost" size="icon" class="h-9 w-9 text-gray-400 hover:text-white" onclick={toggleFullscreen}>
				{#if isFullscreen}
					<IconMinimize class="h-4 w-4" />
				{:else}
					<IconMaximize class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>

	<!-- Main two-column layout -->
	<div class="flex flex-1 flex-col pt-14 md:flex-row">
		<!-- PREPARING column -->
		<div class="flex flex-1 flex-col">
			<div class="bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2.5 flex items-center justify-between shadow-lg">
				<h2 class="text-lg font-bold tracking-wide">PREPARING</h2>
				<span class="text-sm text-amber-100/80">{preparingOrders.length}</span>
			</div>
			<div
				bind:this={preparingCol}
				class="flex-1 overflow-y-auto p-5"
				ontouchstart={pauseScroll}
				onwheel={pauseScroll}
			>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each preparingOrders as order (order.id)}
						{@const elapsed = getElapsed(order.createdAt)}
						{@const progress = getProgress(order)}
						<div
							class="relative overflow-hidden rounded-lg border bg-gray-900 p-3.5 transition-all duration-300 {getElapsedBg(elapsed)} {order.priority === 'urgent'
								? 'ring-2 ring-red-500 animate-pulse'
								: order.priority === 'high'
									? 'ring-2 ring-yellow-500'
									: ''}"
						>
							<!-- Priority accent -->
							{#if order.priority === 'urgent'}
								<div class="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
							{:else if order.priority === 'high'}
								<div class="absolute top-0 left-0 right-0 h-1 bg-yellow-500"></div>
							{/if}

							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<div class="flex items-baseline gap-2">
										<span class="font-mono text-2xl font-bold text-white">
											{shortOrderId(order.orderNumber)}
										</span>
										<span class="font-mono text-lg font-bold {getElapsedColor(elapsed)}">
											{elapsed}m
										</span>
									</div>
									<div class="mt-1.5 flex flex-wrap items-center gap-1">
										<Badge variant="secondary" class="text-[10px] px-1.5 py-0">
											{formatOrderType(order.orderType)}
										</Badge>
										{#if order.orderType === 'dine_in' && order.tableNumber}
											<Badge variant="outline" class="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-400">
												T{order.tableNumber}
											</Badge>
										{/if}
										{#if order.priority === 'urgent'}
											<Badge variant="destructive" class="text-[10px] px-1.5 py-0 animate-pulse">URGENT</Badge>
										{:else if order.priority === 'high'}
											<Badge class="bg-yellow-600 text-[10px] px-1.5 py-0 text-white">HIGH</Badge>
										{/if}
									</div>
								</div>
								<div class="text-right text-xs text-gray-500 shrink-0">
									{order.items.filter((i: OrderItem) => i.status === 'ready' || i.status === 'served').length}/{order.items.length}
								</div>
							</div>

							<!-- Progress bar -->
							<div class="mt-3">
								<div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full rounded-full transition-all duration-700 ease-out {progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-gray-700'}"
										style="width: {progress}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				{#if preparingOrders.length === 0}
					<div class="flex flex-col items-center justify-center py-20 text-gray-600">
						<div class="text-6xl mb-4">&#9203;</div>
						<p class="text-xl font-medium">Waiting for orders</p>
						<p class="text-sm mt-1">New orders will appear here</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Divider -->
		<div class="hidden md:block w-px bg-gray-800"></div>

		<!-- READY column -->
		<div class="flex flex-1 flex-col">
			<div class="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 flex items-center justify-between shadow-lg">
				<h2 class="text-lg font-bold tracking-wide">READY</h2>
				<span class="text-sm text-green-100/80">{readyOrders().length}</span>
			</div>
			<div
				bind:this={readyCol}
				class="flex-1 overflow-y-auto p-5"
				ontouchstart={pauseScroll}
				onwheel={pauseScroll}
			>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each readyOrders() as order (order.id)}
						{@const isNew = newlyReadyIds.has(order.id)}
						<div
							class="rounded-lg border border-green-600/40 bg-gray-900 p-3.5 transition-all duration-500 {isNew ? 'ring-4 ring-green-400 scale-105' : ''} {order.status === 'completed' ? 'opacity-60' : ''}"
						>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<span class="font-mono text-2xl font-bold text-green-400 {isNew ? 'animate-bounce' : ''}">
										{shortOrderId(order.orderNumber)}
									</span>
									<div class="mt-1 flex items-center gap-1">
										<Badge variant="secondary" class="text-[10px] px-1.5 py-0">
											{formatOrderType(order.orderType)}
										</Badge>
										{#if order.orderType === 'dine_in' && order.tableNumber}
											<Badge variant="outline" class="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-400">
												T{order.tableNumber}
											</Badge>
										{/if}
									</div>
								</div>
								<div class="shrink-0">
									{#if order.status === 'completed'}
										<Badge class="bg-green-800 text-green-200 text-[10px] px-1.5 py-0">PICKED UP</Badge>
									{:else}
										<div class="flex items-center gap-1.5 text-green-400">
											<div class="h-2.5 w-2.5 rounded-full bg-green-400 animate-ping"></div>
											<span class="text-xs font-semibold">READY</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				{#if readyOrders().length === 0}
					<div class="flex flex-col items-center justify-center py-20 text-gray-600">
						<div class="text-6xl mb-4">&#10003;</div>
						<p class="text-xl font-medium">All caught up</p>
						<p class="text-sm mt-1">Completed orders will appear here</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
