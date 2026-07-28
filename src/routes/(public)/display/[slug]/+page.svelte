<script lang="ts">
	import type { PageData } from './$types';
	import type { DisplayOrder } from '$lib/api';
	import { getDisplayQueue } from '$lib/api';
	import { browser } from '$app/environment';
	import {
		connectSocket,
		joinBusiness,
		leaveBusiness,
		onOrderUpdated,
		onOrderCreated,
		onOrderCompleted
	} from '$lib/socket';

	let { data }: { data: PageData } = $props();

	let orders = $state<DisplayOrder[]>(data.orders);
	let businessName = $state(data.businessName);
	let businessLogo = $state(data.businessLogo);
	const businessId = data.businessId;
	const slug = data.slug;

	// Track when orders move to ready for chime
	let lastReadyIds = $state<Set<string>>(
		new Set(data.orders.filter((o) => o.status === 'ready').map((o) => o.id))
	);

	// Auto-remove ready orders after 5 minutes
	let readyTimers = $state<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	const preparingOrders = $derived(orders.filter((o) => o.status === 'preparing'));
	const readyOrders = $derived(orders.filter((o) => o.status === 'ready'));

	// Current time for the clock display
	let currentTime = $state(new Date());

	function formatOrderNumber(orderNumber: string): string {
		// Extract a short token from order number (e.g., "ORD-ABC123-WXYZ" -> "ABC123")
		const parts = orderNumber.split('-');
		if (parts.length >= 2) {
			return parts.slice(1).join('-').toUpperCase();
		}
		return orderNumber;
	}

	function formatOrderType(type: string): string {
		switch (type) {
			case 'dine_in':
				return 'Dine In';
			case 'takeaway':
				return 'Takeaway';
			case 'delivery':
				return 'Delivery';
			case 'online':
				return 'Online';
			default:
				return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		}
	}

	// Web Audio API chime
	function playReadyChime() {
		if (!browser) return;
		try {
			const ctx = new AudioContext();
			// First tone
			const osc1 = ctx.createOscillator();
			const gain1 = ctx.createGain();
			osc1.type = 'sine';
			osc1.frequency.setValueAtTime(880, ctx.currentTime);
			gain1.gain.setValueAtTime(0.3, ctx.currentTime);
			gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
			osc1.connect(gain1);
			gain1.connect(ctx.destination);
			osc1.start(ctx.currentTime);
			osc1.stop(ctx.currentTime + 0.3);

			// Second tone (higher)
			const osc2 = ctx.createOscillator();
			const gain2 = ctx.createGain();
			osc2.type = 'sine';
			osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
			gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
			gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
			osc2.connect(gain2);
			gain2.connect(ctx.destination);
			osc2.start(ctx.currentTime + 0.15);
			osc2.stop(ctx.currentTime + 0.5);

			// Third tone (even higher, cheerful resolution)
			const osc3 = ctx.createOscillator();
			const gain3 = ctx.createGain();
			osc3.type = 'sine';
			osc3.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.3);
			gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.3);
			gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
			osc3.connect(gain3);
			gain3.connect(ctx.destination);
			osc3.start(ctx.currentTime + 0.3);
			osc3.stop(ctx.currentTime + 0.7);

			setTimeout(() => ctx.close(), 1000);
		} catch {
			// Audio not available, silently ignore
		}
	}

	function scheduleAutoRemove(orderId: string) {
		// Clear any existing timer for this order
		const existing = readyTimers.get(orderId);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(
			() => {
				orders = orders.filter((o) => o.id !== orderId);
				readyTimers.delete(orderId);
				lastReadyIds.delete(orderId);
			},
			5 * 60 * 1000
		); // 5 minutes

		readyTimers.set(orderId, timer);
	}

	function handleQueueUpdate(newOrders: DisplayOrder[]) {
		// Check for new ready orders
		const newReadyIds = new Set(newOrders.filter((o) => o.status === 'ready').map((o) => o.id));
		let hasNewReady = false;
		for (const id of newReadyIds) {
			if (!lastReadyIds.has(id)) {
				hasNewReady = true;
				scheduleAutoRemove(id);
			}
		}
		if (hasNewReady) {
			playReadyChime();
		}

		// Clean up timers for orders no longer in the list
		for (const id of readyTimers.keys()) {
			if (!newOrders.find((o) => o.id === id)) {
				const timer = readyTimers.get(id);
				if (timer) clearTimeout(timer);
				readyTimers.delete(id);
			}
		}

		lastReadyIds = newReadyIds;
		orders = newOrders;
	}

	// Initialize auto-remove timers for already-ready orders
	$effect(() => {
		if (!browser) return;

		for (const order of orders) {
			if (order.status === 'ready' && !readyTimers.has(order.id)) {
				// Calculate remaining time based on when the order became ready
				const updatedAt = new Date(order.updatedAt).getTime();
				const elapsed = Date.now() - updatedAt;
				const remaining = Math.max(0, 5 * 60 * 1000 - elapsed);

				if (remaining === 0) {
					// Already expired, remove immediately
					orders = orders.filter((o) => o.id !== order.id);
				} else {
					const timer = setTimeout(() => {
						orders = orders.filter((o) => o.id !== order.id);
						readyTimers.delete(order.id);
						lastReadyIds.delete(order.id);
					}, remaining);
					readyTimers.set(order.id, timer);
				}
			}
		}
	});

	// Polling fallback: refresh every 10 seconds
	$effect(() => {
		if (!browser) return;

		const interval = setInterval(async () => {
			try {
				const result = await getDisplayQueue(slug);
				handleQueueUpdate(result.orders);
				businessName = result.businessName;
				businessLogo = result.businessLogo;
			} catch {
				// Silently ignore polling errors
			}
		}, 10000);

		return () => clearInterval(interval);
	});

	// Clock update
	$effect(() => {
		if (!browser) return;

		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	// WebSocket connection for real-time updates
	$effect(() => {
		if (!browser) return;

		let cleanups: Array<() => void> = [];
		let mounted = true;

		async function setupSocket() {
			try {
				const socket = await connectSocket();
				if (!socket || !mounted) return;

				await joinBusiness(businessId);

				// Listen for order updates (status changes)
				const offUpdated = await onOrderUpdated(async () => {
					if (!mounted) return;
					try {
						const result = await getDisplayQueue(slug);
						handleQueueUpdate(result.orders);
					} catch {
						// Ignore
					}
				});
				cleanups.push(offUpdated);

				// Listen for new orders
				const offCreated = await onOrderCreated(async () => {
					if (!mounted) return;
					try {
						const result = await getDisplayQueue(slug);
						handleQueueUpdate(result.orders);
					} catch {
						// Ignore
					}
				});
				cleanups.push(offCreated);

				// Listen for completed orders
				const offCompleted = await onOrderCompleted(async () => {
					if (!mounted) return;
					try {
						const result = await getDisplayQueue(slug);
						handleQueueUpdate(result.orders);
					} catch {
						// Ignore
					}
				});
				cleanups.push(offCompleted);
			} catch {
				// Socket connection failed, polling will handle updates
			}
		}

		setupSocket();

		return () => {
			mounted = false;
			cleanups.forEach((fn) => fn());
			leaveBusiness(businessId);
		};
	});

	// Cleanup all timers on destroy
	$effect(() => {
		return () => {
			for (const timer of readyTimers.values()) {
				clearTimeout(timer);
			}
		};
	});

	const formattedTime = $derived(
		currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	);
</script>

<svelte:head>
	<title>Order Display - {businessName}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="display-root">
	<!-- Header bar -->
	<header class="display-header">
		<div class="header-left">
			{#if businessLogo}
				<img src={businessLogo} alt={businessName} class="business-logo" />
			{/if}
			<h1 class="business-name">{businessName}</h1>
		</div>
		<div class="header-right">
			<span class="live-dot"></span>
			<span class="clock">{formattedTime}</span>
		</div>
	</header>

	<!-- Main content: two columns -->
	<main class="display-main">
		<!-- Preparing column -->
		<section class="column preparing-column">
			<div class="column-header preparing-header">
				<svg
					class="column-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
				<h2>Preparing</h2>
				<span class="count-badge preparing-badge">{preparingOrders.length}</span>
			</div>
			<div class="orders-grid">
				{#each preparingOrders as order (order.id)}
					<div class="order-card preparing-card">
						<span class="token-number">{formatOrderNumber(order.orderNumber)}</span>
						<span class="order-type">{formatOrderType(order.orderType)}</span>
					</div>
				{/each}
				{#if preparingOrders.length === 0}
					<div class="empty-state">
						<svg
							class="empty-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p>No orders preparing</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- Ready column -->
		<section class="column ready-column">
			<div class="column-header ready-header">
				<svg
					class="column-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				<h2>Ready for Pickup</h2>
				<span class="count-badge ready-badge">{readyOrders.length}</span>
			</div>
			<div class="orders-grid">
				{#each readyOrders as order (order.id)}
					<div class="order-card ready-card">
						<span class="token-number">{formatOrderNumber(order.orderNumber)}</span>
						<span class="order-type">{formatOrderType(order.orderType)}</span>
					</div>
				{/each}
				{#if readyOrders.length === 0}
					<div class="empty-state">
						<svg
							class="empty-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p>No orders ready</p>
					</div>
				{/if}
			</div>
		</section>
	</main>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}

	.display-root {
		height: 100svh;
		width: 100svw;
		display: flex;
		flex-direction: column;
		background: #0f172a;
		color: #f8fafc;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
		overflow: hidden;
	}

	/* ==================== Header ==================== */
	.display-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background: #1e293b;
		border-bottom: 1px solid #334155;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.business-logo {
		height: 2.5rem;
		width: 2.5rem;
		border-radius: 0.5rem;
		object-fit: cover;
	}

	.business-name {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.live-dot {
		position: relative;
		display: inline-flex;
		height: 0.625rem;
		width: 0.625rem;
	}

	.live-dot::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		background: #22c55e;
		animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
		opacity: 0.75;
	}

	.live-dot::after {
		content: '';
		position: relative;
		display: inline-flex;
		height: 0.625rem;
		width: 0.625rem;
		border-radius: 9999px;
		background: #22c55e;
	}

	.clock {
		font-size: 1.25rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #94a3b8;
	}

	/* ==================== Main grid ==================== */
	.display-main {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: #334155;
		min-height: 0;
	}

	.column {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.preparing-column {
		background: #1a1700;
	}

	.ready-column {
		background: #001a06;
	}

	/* ==================== Column headers ==================== */
	.column-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		flex-shrink: 0;
	}

	.preparing-header {
		background: #422006;
		color: #fbbf24;
	}

	.ready-header {
		background: #052e16;
		color: #4ade80;
	}

	.column-icon {
		height: 1.5rem;
		width: 1.5rem;
		flex-shrink: 0;
	}

	.column-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.count-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 2rem;
		padding: 0 0.5rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.preparing-badge {
		background: #fbbf24;
		color: #422006;
	}

	.ready-badge {
		background: #4ade80;
		color: #052e16;
	}

	/* ==================== Orders grid ==================== */
	.orders-grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		grid-auto-rows: min-content;
		gap: 1rem;
		padding: 1.5rem;
		align-content: start;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.orders-grid::-webkit-scrollbar {
		display: none;
	}

	/* ==================== Order cards ==================== */
	.order-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.25rem 0.75rem;
		border-radius: 1rem;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		animation: fadeIn 0.3s ease;
	}

	.preparing-card {
		background: linear-gradient(135deg, #422006 0%, #78350f 100%);
		border: 2px solid #92400e;
		box-shadow: 0 0 20px rgba(251, 191, 36, 0.1);
	}

	.ready-card {
		background: linear-gradient(135deg, #052e16 0%, #14532d 100%);
		border: 2px solid #166534;
		box-shadow: 0 0 20px rgba(74, 222, 128, 0.15);
		animation:
			fadeIn 0.3s ease,
			readyPulse 2s ease-in-out 1;
	}

	.token-number {
		font-size: clamp(1.5rem, 4vw, 4rem);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.02em;
		text-align: center;
		word-break: break-all;
	}

	.preparing-card .token-number {
		color: #fde68a;
	}

	.ready-card .token-number {
		color: #bbf7d0;
	}

	.order-type {
		margin-top: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.6;
	}

	/* ==================== Empty state ==================== */
	.empty-state {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem;
		opacity: 0.4;
	}

	.empty-icon {
		height: 3rem;
		width: 3rem;
	}

	.empty-state p {
		font-size: 1rem;
		font-weight: 500;
	}

	/* ==================== Animations ==================== */
	@keyframes ping {
		75%,
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes readyPulse {
		0% {
			box-shadow: 0 0 20px rgba(74, 222, 128, 0.15);
		}
		50% {
			box-shadow: 0 0 40px rgba(74, 222, 128, 0.4);
		}
		100% {
			box-shadow: 0 0 20px rgba(74, 222, 128, 0.15);
		}
	}

	/* ==================== Responsive ==================== */
	@media (max-width: 768px) {
		.display-main {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr 1fr;
		}

		.display-header {
			padding: 0.75rem 1rem;
		}

		.business-name {
			font-size: 1.125rem;
		}

		.column-header h2 {
			font-size: 1rem;
		}

		.orders-grid {
			padding: 0.75rem;
			gap: 0.5rem;
			grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		}

		.order-card {
			padding: 0.75rem 0.5rem;
			border-radius: 0.75rem;
		}
	}

	@media (min-width: 1600px) {
		.orders-grid {
			grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
			gap: 1.25rem;
			padding: 2rem;
		}

		.order-card {
			padding: 1.5rem 1rem;
		}
	}
</style>
