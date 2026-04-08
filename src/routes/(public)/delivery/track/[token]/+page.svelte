<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		IconTruckDelivery,
		IconUser,
		IconPhone,
		IconMapPin,
		IconClock,
		IconCheck,
		IconRefresh,
		IconLoader2
	} from '@tabler/icons-svelte';
	import { trackDelivery, type DeliveryTracking, type DeliveryStatus } from '$lib/api';

	let { data }: { data: PageData } = $props();

	let delivery = $state<DeliveryTracking | null>(data.delivery ?? null);
	let error = $state<string | null>(data.error ?? null);
	let isRefreshing = $state(false);

	const steps: { status: DeliveryStatus; label: string; description: string }[] = [
		{ status: 'pending', label: 'Order Placed', description: 'Your delivery request has been received' },
		{ status: 'assigned', label: 'Driver Assigned', description: 'A driver has been assigned to your delivery' },
		{ status: 'picked_up', label: 'Picked Up', description: 'Your order has been picked up' },
		{ status: 'in_transit', label: 'On the Way', description: 'Your order is on its way to you' },
		{ status: 'delivered', label: 'Delivered', description: 'Your order has been delivered' }
	];

	const statusOrder: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];

	const currentStepIndex = $derived(
		delivery ? statusOrder.indexOf(delivery.status as DeliveryStatus) : -1
	);

	const isFailed = $derived(delivery?.status === 'failed');

	function getStepTimestamp(status: DeliveryStatus): string | null {
		if (!delivery) return null;
		switch (status) {
			case 'pending':
				return delivery.createdAt;
			case 'assigned':
				return delivery.assignedAt ?? null;
			case 'picked_up':
				return delivery.pickedUpAt ?? null;
			case 'delivered':
				return delivery.deliveredAt ?? null;
			default:
				return null;
		}
	}

	function formatTime(dateStr: string | null): string {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getEstimatedDelivery(): string | null {
		if (!delivery?.estimatedMinutes || !delivery.createdAt) return null;
		const est = new Date(new Date(delivery.createdAt).getTime() + delivery.estimatedMinutes * 60000);
		return est.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	async function refresh() {
		isRefreshing = true;
		try {
			const result = await trackDelivery(data.token);
			delivery = result.delivery;
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to refresh';
		} finally {
			isRefreshing = false;
		}
	}
</script>

<div class="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
	{#if error && !delivery}
		<!-- Error State -->
		<div class="rounded-lg border bg-card p-8 text-center shadow-sm">
			<IconTruckDelivery class="mx-auto h-12 w-12 text-muted-foreground" />
			<h1 class="mt-4 text-xl font-semibold">Delivery Not Found</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				We couldn't find a delivery with this tracking link. It may have expired or the link is incorrect.
			</p>
		</div>
	{:else if delivery}
		<!-- Tracking Header -->
		<div class="mb-6 text-center">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
				<IconTruckDelivery class="h-7 w-7 text-primary" />
			</div>
			<h1 class="mt-3 text-2xl font-bold">Delivery Tracking</h1>
			{#if isFailed}
				<Badge variant="destructive" class="mt-2">Delivery Failed</Badge>
			{:else if delivery.status === 'delivered'}
				<Badge class="mt-2 bg-success text-white">Delivered</Badge>
			{:else}
				<p class="mt-1 text-sm text-muted-foreground">
					Track your delivery in real-time
				</p>
			{/if}
		</div>

		<!-- Estimated Time -->
		{#if !isFailed && delivery.status !== 'delivered'}
			{@const eta = getEstimatedDelivery()}
			{#if eta}
				<div class="mb-6 rounded-lg border bg-card p-4 text-center shadow-sm">
					<div class="flex items-center justify-center gap-2 text-muted-foreground">
						<IconClock class="h-4 w-4" />
						<span class="text-sm">Estimated Delivery</span>
					</div>
					<p class="mt-1 text-2xl font-bold">{eta}</p>
					{#if delivery.estimatedMinutes}
						<p class="text-xs text-muted-foreground">{delivery.estimatedMinutes} minutes from order</p>
					{/if}
				</div>
			{/if}
		{/if}

		<!-- Status Steps -->
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="relative">
				{#each steps as step, i}
					{@const isCompleted = currentStepIndex >= i}
					{@const isCurrent = currentStepIndex === i}
					{@const timestamp = getStepTimestamp(step.status)}

					<div class="flex gap-4 {i < steps.length - 1 ? 'pb-8' : ''}">
						<!-- Step Indicator -->
						<div class="relative flex flex-col items-center">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors
								{isCompleted
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-muted-foreground/30 bg-background text-muted-foreground/30'}"
							>
								{#if isCompleted}
									<IconCheck class="h-4 w-4" />
								{:else}
									<span class="text-xs font-medium">{i + 1}</span>
								{/if}
							</div>
							<!-- Connector Line -->
							{#if i < steps.length - 1}
								<div
									class="absolute top-8 h-full w-0.5 {isCompleted && currentStepIndex > i ? 'bg-primary' : 'bg-muted-foreground/20'}"
								></div>
							{/if}
						</div>

						<!-- Step Content -->
						<div class="flex-1 pb-1">
							<div class="flex items-center gap-2">
								<p class="text-sm font-semibold {isCompleted ? 'text-foreground' : 'text-muted-foreground'}">
									{step.label}
								</p>
								{#if isCurrent && !isFailed && delivery.status !== 'delivered'}
									<Badge variant="secondary" class="text-xs">Current</Badge>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">{step.description}</p>
							{#if timestamp}
								<p class="mt-0.5 text-xs text-muted-foreground">{formatTime(timestamp)}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Driver Info -->
		{#if delivery.driver}
			<div class="mt-4 rounded-lg border bg-card p-4 shadow-sm">
				<h2 class="mb-3 text-sm font-semibold">Your Driver</h2>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
						<IconUser class="h-5 w-5 text-muted-foreground" />
					</div>
					<div class="flex-1">
						<p class="font-medium">{delivery.driver.name}</p>
						{#if delivery.driver.vehicleType}
							<p class="text-xs text-muted-foreground capitalize">{delivery.driver.vehicleType}</p>
						{/if}
					</div>
					{#if delivery.driver.phone}
						<a
							href="tel:{delivery.driver.phone}"
							class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
						>
							<IconPhone class="h-4 w-4" />
						</a>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Delivery Address -->
		{#if delivery.customerAddress}
			<div class="mt-4 rounded-lg border bg-card p-4 shadow-sm">
				<h2 class="mb-2 text-sm font-semibold">Delivery Address</h2>
				<div class="flex items-start gap-2 text-sm text-muted-foreground">
					<IconMapPin class="mt-0.5 h-4 w-4 shrink-0" />
					<span>{delivery.customerAddress}</span>
				</div>
			</div>
		{/if}

		<!-- Refresh Button -->
		<div class="mt-6 text-center">
			<Button variant="outline" onclick={refresh} disabled={isRefreshing}>
				{#if isRefreshing}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<IconRefresh class="mr-2 h-4 w-4" />
				{/if}
				Refresh Status
			</Button>
		</div>
	{/if}
</div>
