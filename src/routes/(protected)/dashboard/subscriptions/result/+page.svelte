<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getMySubscription, formatPrice, getPlanFeaturesList } from '$lib/api/subscription';

	import Check from '@lucide/svelte/icons/check';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Zap from '@lucide/svelte/icons/zap';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import { SUPPORT_EMAIL } from '$lib/constants/config';

	let { data } = $props();

	type PaymentStatus = 'processing' | 'success' | 'cancelled';

	let subscription = $state(data.subscription);
	let status = $state<PaymentStatus>('processing');
	let pollCount = $state(0);
	const maxPolls = 15;
	const pollInterval = 2000;

	// Initial subscription state to compare against
	let initialPlanId = $state(data.subscription?.plan?.id);
	let initialStatus = $state(data.subscription?.status);

	// Poll for subscription update
	onMount(() => {
		// Check if subscription is already on a paid plan and active
		if (subscription && subscription.plan.slug !== 'free' && subscription.status === 'active') {
			status = 'success';
			return;
		}

		const interval = setInterval(async () => {
			pollCount++;
			try {
				const result = await getMySubscription();
				if (result.subscription) {
					const newSub = result.subscription;
					// Check if subscription changed from initial state
					const planChanged = newSub.plan.id !== initialPlanId;
					const statusActive = newSub.status === 'active';
					const isPaidPlan = newSub.plan.slug !== 'free';

					if ((planChanged && statusActive && isPaidPlan) || (statusActive && isPaidPlan)) {
						subscription = newSub;
						status = 'success';
						clearInterval(interval);
					}
				}
			} catch (error) {
				console.error('Failed to fetch subscription:', error);
			}

			// After max polls without success, assume cancelled
			if (pollCount >= maxPolls) {
				if (status === 'processing') {
					status = 'cancelled';
				}
				clearInterval(interval);
			}
		}, pollInterval);

		return () => clearInterval(interval);
	});

	const plan = $derived(subscription?.plan);
	const features = $derived(plan ? getPlanFeaturesList(plan) : []);

	const reasons = [
		'Access to premium features like advanced analytics',
		'Unlimited orders and team members',
		'Priority customer support',
		'Kitchen Display System included'
	];

	function goToDashboard() {
		goto('/dashboard');
	}

	function goToSubscriptions() {
		goto('/dashboard/subscriptions');
	}

	function goToBusinesses() {
		goto('/dashboard/businesses');
	}

	function tryAgain() {
		goto('/dashboard/subscriptions');
	}

	function contactSupport() {
		window.open(`mailto:${SUPPORT_EMAIL}?subject=Subscription%20Help`, '_blank');
	}
</script>

<svelte:head>
	<title>Payment Result | POS</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center p-4">
	<div class="w-full max-w-lg">
		{#if status === 'processing'}
			<!-- Processing State -->
			<Card.Root class="overflow-hidden">
				<div class="bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-10 text-center text-white">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-white/20 p-4">
							<Loader2 class="h-12 w-12 animate-spin" />
						</div>
					</div>
					<h1 class="text-2xl font-bold">Processing Payment...</h1>
					<p class="mt-2 text-blue-100">Please wait while we confirm your subscription</p>
				</div>

				<Card.Content class="p-6">
					<div class="py-8 text-center">
						<Loader2 class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
						<p class="mt-4 text-muted-foreground">
							Activating your subscription...
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							This usually takes a few seconds
						</p>
					</div>
				</Card.Content>
			</Card.Root>

		{:else if status === 'success'}
			<!-- Success State -->
			<Card.Root class="overflow-hidden">
				<div class="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-10 text-center text-white">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-white/20 p-4">
							<CheckCircle class="h-12 w-12" />
						</div>
					</div>
					<h1 class="text-2xl font-bold">Payment Successful!</h1>
					<p class="mt-2 text-green-100">Welcome to {plan?.displayName || 'your new plan'}</p>
				</div>

				<Card.Content class="p-6">
					{#if subscription && plan}
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
												{formatPrice(plan.priceMonthly, plan.currency || 'USD')}{plan.priceMonthly > 0 ? '/month' : ''}
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
												{new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
													dateStyle: 'medium'
												})}
											</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{:else}
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
						<Button class="w-full" size="lg" onclick={goToDashboard}>
							<Building2 class="mr-2 h-4 w-4" />
							Go to Dashboard
							<ArrowRight class="ml-2 h-4 w-4" />
						</Button>

						<div class="grid grid-cols-2 gap-3">
							<Button variant="outline" onclick={goToBusinesses}>
								Create Business
							</Button>
							<Button variant="outline" onclick={goToSubscriptions}>
								View Subscription
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

		{:else}
			<!-- Cancelled/Failed State -->
			<Card.Root class="overflow-hidden">
				<div class="bg-gradient-to-br from-slate-500 to-slate-600 px-6 py-10 text-center text-white">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-white/20 p-4">
							<XCircle class="h-12 w-12" />
						</div>
					</div>
					<h1 class="text-2xl font-bold">Payment Cancelled</h1>
					<p class="mt-2 text-slate-200">No worries, you can try again anytime</p>
				</div>

				<Card.Content class="p-6">
					<div class="space-y-6">
						<!-- Info Message -->
						<div class="rounded-lg border bg-muted/30 p-4 text-center">
							<p class="text-muted-foreground">
								Your payment was cancelled and you have not been charged.
								Your current plan remains unchanged.
							</p>
						</div>

						<Separator />

						<!-- Reasons to Upgrade -->
						<div>
							<h3 class="mb-3 font-semibold">Why upgrade?</h3>
							<ul class="space-y-2">
								{#each reasons as reason}
									<li class="flex items-center gap-2 text-sm">
										<Check class="h-4 w-4 shrink-0 text-green-500" />
										<span>{reason}</span>
									</li>
								{/each}
							</ul>
						</div>

						<Separator />

						<!-- Help Section -->
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
							<div class="flex items-start gap-3">
								<HelpCircle class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
								<div>
									<p class="font-medium text-blue-900 dark:text-blue-100">
										Need help deciding?
									</p>
									<p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
										Our team is here to help you choose the right plan for your business.
										Contact us for a personalized recommendation.
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="mt-6 space-y-3">
						<Button class="w-full" size="lg" onclick={tryAgain}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Try Again
						</Button>

						<div class="grid grid-cols-2 gap-3">
							<Button variant="outline" onclick={goToSubscriptions}>
								<ArrowLeft class="mr-2 h-4 w-4" />
								View Plans
							</Button>
							<Button variant="outline" onclick={contactSupport}>
								<HelpCircle class="mr-2 h-4 w-4" />
								Get Help
							</Button>
						</div>

						<Button variant="ghost" class="w-full" onclick={() => goto('/dashboard')}>
							<CreditCard class="mr-2 h-4 w-4" />
							Continue with Free Plan
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
