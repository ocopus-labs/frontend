<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getMySubscription, formatLimit, getPlanFeaturesList } from '$lib/api/subscription';

	import Check from '@lucide/svelte/icons/check';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Zap from '@lucide/svelte/icons/zap';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import PartyPopper from '@lucide/svelte/icons/party-popper';

	let { data } = $props();

	let subscription = $state(data.subscription);
	let isPolling = $state(!subscription || subscription.status !== 'active');
	let pollCount = $state(0);
	const maxPolls = 10;

	// Poll for subscription update if not yet active (webhook delay)
	onMount(() => {
		if (!isPolling) return;

		const interval = setInterval(async () => {
			pollCount++;
			try {
				const result = await getMySubscription();
				if (result.subscription && result.subscription.status === 'active') {
					subscription = result.subscription;
					isPolling = false;
					clearInterval(interval);
				}
			} catch (error) {
				console.error('Failed to fetch subscription:', error);
			}

			if (pollCount >= maxPolls) {
				isPolling = false;
				clearInterval(interval);
			}
		}, 2000);

		return () => clearInterval(interval);
	});

	const plan = $derived(subscription?.plan);
	const features = $derived(plan ? getPlanFeaturesList(plan) : []);

	function goToDashboard() {
		goto('/dashboard');
	}

	function goToSubscriptions() {
		goto('/dashboard/subscriptions');
	}

	function goToBusinesses() {
		goto('/dashboard/businesses');
	}
</script>

<svelte:head>
	<title>Payment Successful | POS</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center p-4">
	<div class="w-full max-w-lg">
		<Card.Root class="overflow-hidden">
			<!-- Success Header -->
			<div class="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-10 text-center text-white">
				<div class="mb-4 flex justify-center">
					<div class="rounded-full bg-white/20 p-4">
						{#if isPolling}
							<Loader2 class="h-12 w-12 animate-spin" />
						{:else}
							<CheckCircle class="h-12 w-12" />
						{/if}
					</div>
				</div>
				{#if isPolling}
					<h1 class="text-2xl font-bold">Processing Payment...</h1>
					<p class="mt-2 text-green-100">Please wait while we confirm your subscription</p>
				{:else}
					<h1 class="text-2xl font-bold">Payment Successful!</h1>
					<p class="mt-2 text-green-100">Welcome to {plan?.displayName || 'your new plan'}</p>
				{/if}
			</div>

			<Card.Content class="p-6">
				{#if isPolling}
					<!-- Loading State -->
					<div class="py-8 text-center">
						<Loader2 class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
						<p class="mt-4 text-muted-foreground">
							Activating your subscription...
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							This usually takes a few seconds
						</p>
					</div>
				{:else if subscription && plan}
					<!-- Success State -->
					<div class="space-y-6">
						<!-- Plan Summary -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="rounded-full bg-primary/10 p-2">
										<Zap class="h-5 w-5 text-primary" />
									</div>
									<div>
										<h3 class="font-semibold">{plan.displayName} Plan</h3>
										<p class="text-sm text-muted-foreground">
											{plan.priceMonthly === 0 ? 'Free' : `₹${plan.priceMonthly}/month`}
										</p>
									</div>
								</div>
								<Badge variant="default" class="bg-green-500">Active</Badge>
							</div>
						</div>

						<!-- Celebration Message -->
						<div class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
							<PartyPopper class="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
							<div>
								<p class="font-medium text-amber-900 dark:text-amber-100">
									Thank you for upgrading!
								</p>
								<p class="mt-1 text-sm text-amber-700 dark:text-amber-300">
									Your subscription is now active. Enjoy all the premium features!
								</p>
							</div>
						</div>

						<Separator />

						<!-- Features Unlocked -->
						<div>
							<h3 class="mb-3 font-semibold">Features Included</h3>
							<ul class="grid gap-2">
								{#each features as feature}
									<li class="flex items-center gap-2 text-sm">
										<Check class="h-4 w-4 shrink-0 text-green-500" />
										<span>{feature}</span>
									</li>
								{/each}
							</ul>
						</div>

						<Separator />

						<!-- Subscription Details -->
						<div class="space-y-3">
							<h3 class="font-semibold">Subscription Details</h3>
							<div class="grid gap-2 text-sm">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Status</span>
									<span class="font-medium capitalize">{subscription.status}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Billing Period</span>
									<span class="font-medium">Monthly</span>
								</div>
								{#if subscription.currentPeriodEnd}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Next Billing Date</span>
										<span class="font-medium">
											{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
												dateStyle: 'medium'
											})}
										</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<!-- No subscription found -->
					<div class="py-8 text-center">
						<p class="text-muted-foreground">
							Unable to load subscription details.
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Your payment may still be processing. Please check your subscriptions page.
						</p>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="mt-6 space-y-3">
					<Button class="w-full" size="lg" onclick={goToDashboard} disabled={isPolling}>
						<Building2 class="mr-2 h-4 w-4" />
						Go to Dashboard
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>

					<div class="grid grid-cols-2 gap-3">
						<Button variant="outline" onclick={goToBusinesses} disabled={isPolling}>
							Create Business
						</Button>
						<Button variant="outline" onclick={goToSubscriptions} disabled={isPolling}>
							View Subscription
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
