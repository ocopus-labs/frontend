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
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	let isConnected = $state(false);
	let isFullscreen = $state(false);
	let soundEnabled = $state(browser ? localStorage.getItem('hall-sound') !== 'false' : true);
	let controlsVisible = $state(true);
	let now = $state(Date.now());

	// Auto-hide controls
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let tickInterval: ReturnType<typeof setInterval> | null = null;

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

	// Audio beep via AudioContext
	let audioCtx: AudioContext | null = null;

	function playBeep() {
		if (!soundEnabled || !browser) return;
		try {
			if (!audioCtx) audioCtx = new AudioContext();
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.frequency.value = 880;
			osc.type = 'sine';
			gain.gain.value = 0.3;
			osc.start();
			osc.stop(audioCtx.currentTime + 0.2);
		} catch {
			// AudioContext may not be available
		}
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
	onMount(() => {
		// Start elapsed time ticker
		tickInterval = setInterval(() => {
			now = Date.now();
		}, 1000);

		// Start auto-hide timer
		showControls();

		// Start auto-scroll
		startAutoScroll();

		// Listen for mouse/touch to show controls and pause scroll
		document.addEventListener('mousemove', showControls);
		document.addEventListener('touchstart', showControls);
		document.addEventListener('mousemove', pauseScroll);
		document.addEventListener('touchstart', pauseScroll);

		// Listen for fullscreen changes
		document.addEventListener('fullscreenchange', () => {
			isFullscreen = !!document.fullscreenElement;
		});

		const socket = connectSocket();

		if (socket) {
			socket.on('connect', () => {
				isConnected = true;
				joinBusiness(data.businessId);
			});

			socket.on('disconnect', () => {
				isConnected = false;
			});

			const unsubOrderCreated = onOrderCreated(() => {
				invalidate('app:orders');
			});

			const unsubOrderUpdated = onOrderUpdated(() => {
				invalidate('app:orders');
			});

			const unsubOrderCompleted = onOrderCompleted(() => {
				invalidate('app:orders');
				playBeep();
			});

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
		if (hideTimer) clearTimeout(hideTimer);
		if (tickInterval) clearInterval(tickInterval);
		if (scrollInterval) clearInterval(scrollInterval);
		if (scrollResumeTimer) clearTimeout(scrollResumeTimer);
		if (browser) {
			document.removeEventListener('mousemove', showControls);
			document.removeEventListener('touchstart', showControls);
			document.removeEventListener('mousemove', pauseScroll);
			document.removeEventListener('touchstart', pauseScroll);
		}
	});

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

	function getElapsed(createdAt: string): number {
		return Math.floor((now - new Date(createdAt).getTime()) / 60000);
	}

	function getElapsedColor(minutes: number): string {
		if (minutes >= 15) return 'text-red-500';
		if (minutes >= 10) return 'text-yellow-500';
		return 'text-green-500';
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

	let preparingOrders = $derived(
		(data.activeOrders || []).filter((o: Order) => isOrderPreparing(o))
	);

	let readyOrders = $derived(() => {
		const activeReady = (data.activeOrders || []).filter((o: Order) => isOrderReady(o));
		const thirtyMinAgo = now - 30 * 60 * 1000;
		const recentCompleted = (data.completedOrders || []).filter(
			(o: Order) => new Date(o.updatedAt).getTime() > thirtyMinAgo
		);
		return [...activeReady, ...recentCompleted].slice(0, 10);
	});

	let clockTime = $derived(
		new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	);

	async function refreshOrders() {
		await invalidate('app:orders');
	}
</script>

<div
	class="relative flex h-screen flex-col overflow-hidden bg-black text-white"
	role="status"
	aria-label="Order status display"
>
	<!-- Controls bar - auto-hiding -->
	<div
		class="absolute top-0 right-0 left-0 z-10 flex items-center justify-between bg-black/80 px-4 py-2 backdrop-blur-sm transition-all duration-300 {controlsVisible
			? 'translate-y-0 opacity-100'
			: '-translate-y-full opacity-0'}"
	>
		<div class="flex items-center gap-3">
			<span class="text-sm font-medium text-gray-300">Hall Display</span>
			{#if isConnected}
				<Badge variant="outline" class="border-green-500 text-green-400">
					<IconWifi class="mr-1 h-3 w-3" />
					Live
				</Badge>
			{:else}
				<Badge variant="outline" class="border-yellow-500 text-yellow-400">
					<IconWifiOff class="mr-1 h-3 w-3" />
					Offline
				</Badge>
			{/if}
		</div>

		<span class="font-mono text-sm text-gray-400">{clockTime}</span>

		<div class="flex items-center gap-2">
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 text-gray-400 hover:text-white"
				onclick={refreshOrders}
				aria-label="Refresh orders"
			>
				<IconRefresh class="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 text-gray-400 hover:text-white"
				onclick={toggleSound}
				aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
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
				class="h-8 w-8 text-gray-400 hover:text-white"
				onclick={toggleFullscreen}
				aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
			>
				{#if isFullscreen}
					<IconMinimize class="h-4 w-4" />
				{:else}
					<IconMaximize class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>

	<!-- Main two-column layout -->
	<div class="flex flex-1 flex-col pt-12 md:flex-row">
		<!-- PREPARING column -->
		<div class="flex flex-1 flex-col border-r border-gray-800">
			<div class="bg-amber-600 px-4 py-3 text-center">
				<h2 class="text-2xl font-bold tracking-wide">PREPARING</h2>
				<p class="text-sm text-amber-100">{preparingOrders.length} {preparingOrders.length === 1 ? 'order' : 'orders'}</p>
			</div>
			<div
				bind:this={preparingCol}
				class="flex-1 overflow-y-auto p-4"
				ontouchstart={pauseScroll}
				onwheel={pauseScroll}
			>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each preparingOrders as order (order.id)}
						{@const elapsed = getElapsed(order.createdAt)}
						<div
							class="rounded-lg border-2 border-amber-700 bg-gray-900 p-4 {order.priority === 'urgent'
								? 'ring-2 ring-red-500'
								: order.priority === 'high'
									? 'ring-2 ring-yellow-500'
									: ''}"
						>
							<div class="flex items-start justify-between">
								<div>
									<span class="font-mono text-4xl font-bold text-white md:text-5xl">
										{order.orderNumber}
									</span>
									<div class="mt-1 flex items-center gap-2">
										<Badge variant="secondary" class="text-xs">
											{formatOrderType(order.orderType)}
										</Badge>
										{#if order.orderType === 'dine_in' && order.tableNumber}
											<Badge variant="outline" class="text-xs">
												{order.tableNumber}
											</Badge>
										{/if}
										{#if order.priority === 'urgent'}
											<Badge variant="destructive" class="text-xs">URGENT</Badge>
										{:else if order.priority === 'high'}
											<Badge class="bg-yellow-600 text-xs text-white">HIGH</Badge>
										{/if}
									</div>
								</div>
								<div class="text-right">
									<span class="font-mono text-2xl font-bold {getElapsedColor(elapsed)}">
										{elapsed}m
									</span>
								</div>
							</div>
							<!-- Item progress -->
							<div class="mt-3 flex gap-1">
								{#each order.items as item}
									<div
										class="h-2 flex-1 rounded-full {item.status === 'ready' || item.status === 'served'
											? 'bg-green-500'
											: item.status === 'preparing'
												? 'bg-amber-500'
												: 'bg-gray-600'}"
										title="{item.name}: {item.status}"
									></div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				{#if preparingOrders.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-gray-500">
						<p class="text-lg">No orders preparing</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- READY column -->
		<div class="flex flex-1 flex-col">
			<div class="bg-green-600 px-4 py-3 text-center">
				<h2 class="text-2xl font-bold tracking-wide">READY</h2>
				<p class="text-sm text-green-100">{readyOrders().length} {readyOrders().length === 1 ? 'order' : 'orders'}</p>
			</div>
			<div
				bind:this={readyCol}
				class="flex-1 overflow-y-auto p-4"
				ontouchstart={pauseScroll}
				onwheel={pauseScroll}
			>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each readyOrders() as order (order.id)}
						<div class="rounded-lg border-2 border-green-700 bg-gray-900 p-4">
							<div class="flex items-start justify-between">
								<div>
									<span class="font-mono text-4xl font-bold text-green-400 md:text-5xl">
										{order.orderNumber}
									</span>
									<div class="mt-1 flex items-center gap-2">
										<Badge variant="secondary" class="text-xs">
											{formatOrderType(order.orderType)}
										</Badge>
										{#if order.orderType === 'dine_in' && order.tableNumber}
											<Badge variant="outline" class="text-xs">
												{order.tableNumber}
											</Badge>
										{/if}
									</div>
								</div>
								{#if order.status === 'completed'}
									<Badge class="bg-green-700 text-xs text-green-100">DONE</Badge>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if readyOrders().length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-gray-500">
						<p class="text-lg">No orders ready</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
