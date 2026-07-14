<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { getOrderTracking, createDodoPaymentCheckout, submitOrderFeedback } from '$lib/api';
	import { formatDate, formatTime } from '$lib/utils/formatting';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CookingPotIcon from '@lucide/svelte/icons/cooking-pot';
	import BellRingIcon from '@lucide/svelte/icons/bell-ring';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';

	let { data }: { data: PageData } = $props();

	let order = $state(data.order);
	const trackingToken = $derived(data.trackingToken);
	let isPolling = $state(true);

	// Poll for updates every 10 seconds
	$effect(() => {
		const interval = setInterval(async () => {
			try {
				const result = await getOrderTracking(trackingToken);
				order = result.order;
			} catch {
				// Silently ignore
			}
		}, 10000);

		return () => clearInterval(interval);
	});

	function formatPrice(amount: number) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	const statusSteps = [
		{
			key: 'active',
			label: 'Order Placed',
			sublabel: 'Your order has been received',
			icon: CheckCircle2Icon,
			color: 'text-blue-500'
		},
		{
			key: 'preparing',
			label: 'Preparing',
			sublabel: 'Kitchen is working on your order',
			icon: CookingPotIcon,
			color: 'text-primary'
		},
		{
			key: 'ready',
			label: 'Ready',
			sublabel: 'Your order is ready for pickup',
			icon: BellRingIcon,
			color: 'text-success'
		},
		{
			key: 'completed',
			label: 'Served',
			sublabel: 'Enjoy your meal!',
			icon: UtensilsIcon,
			color: 'text-success'
		}
	];

	const currentStepIndex = $derived(() => {
		const items = (order.items as any[]) || [];
		const allReady = items.every((i: any) => i.status === 'ready' || i.status === 'served');
		const allServed = items.every((i: any) => i.status === 'served');
		const anyPreparing = items.some((i: any) => i.status === 'preparing');

		if (order.status === 'completed' || allServed) return 3;
		if (allReady) return 2;
		if (anyPreparing) return 1;
		return 0;
	});

	function getItemStatusBadge(status: string): { label: string; class: string } {
		switch (status) {
			case 'pending':
				return { label: 'Queued', class: 'bg-muted text-muted-foreground' };
			case 'preparing':
				return { label: 'Preparing', class: 'bg-primary/10 text-primary' };
			case 'ready':
				return { label: 'Ready', class: 'bg-success/15 text-success' };
			case 'served':
				return {
					label: 'Served',
					class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
				};
			case 'cancelled':
				return { label: 'Cancelled', class: 'bg-destructive/15 text-destructive' };
			default:
				return { label: status, class: 'bg-muted text-muted-foreground' };
		}
	}

	const pricing = $derived(order.pricing as any);

	let isPayingNow = $state(false);

	async function handlePayNow() {
		isPayingNow = true;
		try {
			const returnUrl = window.location.href;
			const result = await createDodoPaymentCheckout(trackingToken, returnUrl);
			if (result.checkoutUrl) {
				window.location.href = result.checkoutUrl;
				return;
			}
		} catch {
			// Dodo not available
		} finally {
			isPayingNow = false;
		}
	}

	// Feedback state
	let feedbackRating = $state(0);
	let feedbackComment = $state('');
	let feedbackSubmitted = $state(!!order.feedback);
	let isSubmittingFeedback = $state(false);

	const showFeedback = $derived(
		['completed', 'serving', 'ready'].includes(order.status) && !feedbackSubmitted
	);

	async function submitFeedback() {
		if (feedbackRating < 1) return;
		isSubmittingFeedback = true;
		try {
			await submitOrderFeedback(trackingToken, {
				rating: feedbackRating,
				comment: feedbackComment.trim() || undefined
			});
			feedbackSubmitted = true;
		} catch {
			// ignore — may already be submitted
			feedbackSubmitted = true;
		} finally {
			isSubmittingFeedback = false;
		}
	}

	async function manualRefresh() {
		try {
			const result = await getOrderTracking(trackingToken);
			order = result.order;
		} catch {
			// ignore
		}
	}
</script>

<div class="flex min-h-svh flex-col bg-muted/40">
	<!-- ═══ Header ═══ -->
	<header class="border-b bg-card px-4 py-4">
		<div class="flex items-center justify-between">
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-lg font-bold">{order.orderNumber}</h1>
					{#if order.status === 'cancelled'}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
						>
							<CircleXIcon class="h-3 w-3" />
							Cancelled
						</span>
					{/if}
				</div>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Table {order.tableNumber} &middot; {formatDate(order.createdAt)} at {formatTime(
						order.createdAt
					)}
				</p>
			</div>
			<div class="flex flex-col items-end gap-1.5">
				<!-- Payment badge -->
				<span
					class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {order.paymentStatus ===
					'paid'
						? 'bg-success/15 text-success'
						: 'bg-primary/10 text-primary'}"
				>
					<WalletIcon class="h-3 w-3" />
					{order.paymentStatus === 'paid'
						? 'Paid'
						: order.paymentStatus === 'partial'
							? 'Partial'
							: 'Unpaid'}
				</span>
				<button
					class="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
					onclick={manualRefresh}
				>
					<RefreshCwIcon class="h-3 w-3" />
					Refresh
				</button>
			</div>
		</div>
	</header>

	<div class="flex-1 space-y-4 px-4 py-4">
		<!-- ═══ Progress Tracker ═══ -->
		{#if order.status !== 'cancelled'}
			<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
				<h2 class="mb-4 text-sm font-bold">Order Status</h2>
				<div class="space-y-0">
					{#each statusSteps as step, i}
						{@const stepIdx = currentStepIndex()}
						{@const isActive = i === stepIdx}
						{@const isCompleted = i < stepIdx}
						{@const isPending = i > stepIdx}
						<div class="flex gap-3">
							<!-- Vertical line + circle -->
							<div class="flex flex-col items-center">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all {isCompleted
										? 'bg-primary text-primary-foreground'
										: isActive
											? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
											: 'bg-muted text-muted-foreground'}"
								>
									{#if isCompleted}
										<CheckCircle2Icon class="h-4 w-4" />
									{:else}
										<step.icon class="h-4 w-4" />
									{/if}
								</div>
								{#if i < statusSteps.length - 1}
									<div
										class="my-1 min-h-[24px] w-0.5 flex-1 rounded-full {isCompleted
											? 'bg-primary'
											: 'bg-muted'}"
									></div>
								{/if}
							</div>

							<!-- Label -->
							<div class="pb-4 {i === statusSteps.length - 1 ? '' : ''}">
								<p
									class="text-sm font-semibold {isActive || isCompleted
										? 'text-foreground'
										: 'text-muted-foreground'}"
								>
									{step.label}
								</p>
								<p class="text-xs text-muted-foreground">{step.sublabel}</p>
								{#if isActive}
									<div class="mt-1 flex items-center gap-1">
										<span class="relative flex h-2 w-2">
											<span
												class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
											></span>
											<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
										</span>
										<span class="text-[10px] font-medium text-primary">Current</span>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
				<CircleXIcon class="mx-auto mb-2 h-10 w-10 text-destructive" />
				<p class="font-semibold text-destructive">Order Cancelled</p>
				<p class="mt-1 text-sm text-destructive/80">
					This order has been cancelled. Please contact the restaurant for more info.
				</p>
			</div>
		{/if}

		<!-- ═══ Order Items ═══ -->
		<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
			<div class="mb-3 flex items-center gap-2">
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
					<ReceiptIcon class="h-3.5 w-3.5 text-primary" />
				</div>
				<h2 class="text-sm font-bold">Items</h2>
			</div>
			<div class="space-y-3">
				{#each order.items as any[] as item}
					{@const badge = getItemStatusBadge(item.status)}
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<p class="text-sm font-medium">{item.name}</p>
								<span class="text-xs text-muted-foreground">x{item.quantity}</span>
							</div>
							{#if item.modifiers}
								<div class="mt-0.5 flex flex-wrap gap-1">
									{#if item.modifiers.size}
										<span
											class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
											>{item.modifiers.size.name || item.modifiers.size}</span
										>
									{/if}
									{#if item.modifiers.spiceLevel}
										<span class="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
											>{item.modifiers.spiceLevel.name || item.modifiers.spiceLevel}</span
										>
									{/if}
									{#if item.modifiers.addOns?.length}
										{#each item.modifiers.addOns as addOn}
											<span
												class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500 dark:bg-blue-900/20 dark:text-blue-300"
												>+{addOn.name || addOn}</span
											>
										{/each}
									{/if}
								</div>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {badge.class}">
								{badge.label}
							</span>
							<span class="text-sm font-semibold tabular-nums">
								{formatPrice(item.totalPrice)}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- ═══ Payment Summary ═══ -->
		<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
			<div class="mb-3 flex items-center gap-2">
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
					<WalletIcon class="h-3.5 w-3.5 text-primary" />
				</div>
				<h2 class="text-sm font-bold">Payment</h2>
			</div>
			<div class="space-y-1.5 text-sm">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Subtotal</span>
					<span class="tabular-nums">{formatPrice(pricing.subtotal)}</span>
				</div>
				{#if pricing.taxAmount > 0}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Tax</span>
						<span class="tabular-nums">{formatPrice(pricing.taxAmount)}</span>
					</div>
				{/if}
				{#if pricing.discountAmount > 0}
					<div class="flex justify-between text-success">
						<span>Discount</span>
						<span class="tabular-nums">-{formatPrice(pricing.discountAmount)}</span>
					</div>
				{/if}
				<div class="flex justify-between border-t border-dashed pt-2">
					<span class="font-bold">Total</span>
					<span class="text-base font-bold text-primary tabular-nums"
						>{formatPrice(pricing.total)}</span
					>
				</div>
			</div>

			{#if order.paymentStatus === 'pending'}
				<div class="mt-4 space-y-2.5">
					<button
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
						onclick={handlePayNow}
						disabled={isPayingNow}
					>
						{#if isPayingNow}
							<Loader2Icon class="h-4 w-4 animate-spin" />
							Redirecting...
						{:else}
							<CreditCardIcon class="h-4 w-4" />
							Pay Now
						{/if}
					</button>
					<p class="text-center text-[11px] text-muted-foreground">Or pay at the counter</p>
				</div>
			{/if}
		</div>

		<!-- Feedback / Thank You -->
		{#if feedbackSubmitted}
			<div class="mx-4 mb-4 rounded-xl bg-success/10 p-4 text-center">
				<p class="text-lg font-semibold text-success">Thank you for dining with us!</p>
				<p class="mt-1 text-sm text-success">We appreciate your feedback.</p>
			</div>
		{:else if showFeedback}
			<div class="mx-4 mb-4 rounded-xl border bg-card p-4">
				<p class="text-center text-sm font-medium">How was your experience?</p>
				<div class="mt-3 flex justify-center gap-2">
					{#each [1, 2, 3, 4, 5] as star}
						<button
							class="text-2xl transition-transform hover:scale-110 {feedbackRating >= star
								? 'grayscale-0'
								: 'grayscale'}"
							onclick={() => (feedbackRating = star)}
							aria-label="{star} star{star > 1 ? 's' : ''}"
						>
							{feedbackRating >= star ? '⭐' : '☆'}
						</button>
					{/each}
				</div>
				{#if feedbackRating > 0}
					<textarea
						class="mt-3 w-full rounded-lg border bg-transparent p-2 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
						placeholder="Any comments? (optional)"
						rows="2"
						bind:value={feedbackComment}
					></textarea>
					<button
						class="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
						onclick={submitFeedback}
						disabled={isSubmittingFeedback}
					>
						{isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
					</button>
				{/if}
			</div>
		{/if}

		<!-- Auto-refresh notice -->
		<div class="flex items-center justify-center gap-1.5 pb-4">
			<span class="relative flex h-2 w-2">
				<span
					class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"
				></span>
				<span class="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
			</span>
			<p class="text-[11px] text-muted-foreground">Live updates every 10 seconds</p>
		</div>
	</div>
</div>
