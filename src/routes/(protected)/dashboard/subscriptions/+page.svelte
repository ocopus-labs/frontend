<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Progress } from '$lib/components/ui/progress';
	import * as Alert from '$lib/components/ui/alert';
	import type { PageData } from './$types';
	import {
		createCheckout,
		getCustomerPortalUrl,
		formatPrice,
		formatLimit,
		getPlanFeaturesList,
		type SubscriptionPlan
	} from '$lib/api/subscription';

	import Check from '@lucide/svelte/icons/check';
	import Zap from '@lucide/svelte/icons/zap';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Users from '@lucide/svelte/icons/users';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Shield from '@lucide/svelte/icons/shield';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { data }: { data: PageData } = $props();

	let upgrading = $state<string | null>(null);
	let downgrading = $state<string | null>(null);
	let openingPortal = $state(false);
	let error = $state<string | null>(null);

	const currentPlan = $derived(data.subscription?.plan);
	const usage = $derived(data.usage);

	// Calculate usage percentages
	const orderPercentage = $derived(
		usage && usage.orderLimit > 0
			? Math.min(100, (usage.ordersThisMonth / usage.orderLimit) * 100)
			: 0
	);
	const locationPercentage = $derived(
		usage && usage.locationLimit > 0
			? Math.min(100, (usage.locationsCount / usage.locationLimit) * 100)
			: 0
	);
	const teamPercentage = $derived(
		usage && usage.teamMemberLimit > 0
			? Math.min(100, (usage.teamMembersCount / usage.teamMemberLimit) * 100)
			: 0
	);

	async function handleUpgrade(planSlug: string) {
		if (upgrading) return;

		try {
			error = null;
			upgrading = planSlug;

			const response = await createCheckout(planSlug);
			if (response.checkoutUrl) {
				window.location.href = response.checkoutUrl;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create checkout';
			upgrading = null;
		}
	}

	async function handleManageBilling() {
		if (openingPortal) return;

		try {
			error = null;
			openingPortal = true;

			const response = await getCustomerPortalUrl();
			if (response.url) {
				window.open(response.url, '_blank');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to open billing portal';
		} finally {
			openingPortal = false;
		}
	}

	function isPlanCurrent(plan: SubscriptionPlan): boolean {
		return currentPlan?.slug === plan.slug;
	}

	function isPlanUpgrade(plan: SubscriptionPlan): boolean {
		if (!currentPlan) return plan.slug !== 'free';
		return plan.sortOrder > currentPlan.sortOrder;
	}

	function isPlanDowngrade(plan: SubscriptionPlan): boolean {
		if (!currentPlan) return false;
		return plan.sortOrder < currentPlan.sortOrder;
	}

	async function handleDowngrade(planSlug: string) {
		if (downgrading) return;

		try {
			error = null;
			downgrading = planSlug;

			const response = await createCheckout(planSlug);
			if (response.checkoutUrl) {
				window.location.href = response.checkoutUrl;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create checkout';
			downgrading = null;
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return { variant: 'default' as const, text: 'Active' };
			case 'trialing':
				return { variant: 'secondary' as const, text: 'Trial' };
			case 'past_due':
				return { variant: 'destructive' as const, text: 'Past Due' };
			case 'canceled':
				return { variant: 'outline' as const, text: 'Canceled' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}
</script>

<svelte:head>
	<title>Subscriptions | POS</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Subscription</h1>
			<p class="mt-2 text-muted-foreground">
				Manage your subscription plan and usage.
			</p>
		</div>
		{#if data.subscription?.dodoCustomerId}
			<Button variant="outline" onclick={handleManageBilling} disabled={openingPortal}>
				{#if openingPortal}
					<Loader2 class="mr-2 size-4 animate-spin" />
				{:else}
					<CreditCard class="mr-2 size-4" />
				{/if}
				Manage Billing
				<ExternalLink class="ml-2 size-4" />
			</Button>
		{/if}
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Current Plan Overview -->
	{#if data.subscription}
		{@const statusBadge = getStatusBadge(data.subscription.status)}
		<Card.Root class="border-primary/50 bg-primary/5">
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title class="text-lg">Current Plan</Card.Title>
						<Card.Description>
							You are on the {currentPlan?.displayName || 'Free'} plan
						</Card.Description>
					</div>
					<div class="flex items-center gap-2">
						<Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
						<Badge variant="secondary" class="text-sm">
							{currentPlan?.displayName || 'Free'}
						</Badge>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if usage}
					<div class="grid gap-6 md:grid-cols-3">
						<!-- Locations Usage -->
						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<Building2 class="size-4 text-muted-foreground" />
									<span>Locations</span>
								</div>
								<span class="font-medium">
									{usage.locationsCount} / {formatLimit(usage.locationLimit)}
								</span>
							</div>
							{#if usage.locationLimit > 0}
								<Progress value={locationPercentage} class="h-2" />
							{/if}
						</div>

						<!-- Orders Usage -->
						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<TrendingUp class="size-4 text-muted-foreground" />
									<span>Orders this month</span>
								</div>
								<span class="font-medium">
									{usage.ordersThisMonth} / {formatLimit(usage.orderLimit)}
								</span>
							</div>
							{#if usage.orderLimit > 0}
								<Progress
									value={orderPercentage}
									class="h-2"
								/>
								{#if orderPercentage >= 80}
									<p class="text-xs text-amber-600">
										You're approaching your order limit. Consider upgrading.
									</p>
								{/if}
							{/if}
						</div>

						<!-- Team Members Usage -->
						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<Users class="size-4 text-muted-foreground" />
									<span>Team members</span>
								</div>
								<span class="font-medium">
									{usage.teamMembersCount} / {formatLimit(usage.teamMemberLimit)}
								</span>
							</div>
							{#if usage.teamMemberLimit > 0}
								<Progress value={teamPercentage} class="h-2" />
							{/if}
						</div>
					</div>
				{:else}
					<div class="grid gap-4 md:grid-cols-3">
						<div class="flex items-center gap-3">
							<Building2 class="size-5 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">{data.businesses?.length || 0} / {formatLimit(currentPlan?.maxLocations || 1)}</p>
								<p class="text-xs text-muted-foreground">Business locations</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<TrendingUp class="size-5 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">- / {formatLimit(currentPlan?.maxOrdersPerMonth || 100)}</p>
								<p class="text-xs text-muted-foreground">Orders this month</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<Shield class="size-5 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">{currentPlan?.features?.analytics === 'advanced' ? 'Advanced' : 'Basic'}</p>
								<p class="text-xs text-muted-foreground">Analytics</p>
							</div>
						</div>
					</div>
				{/if}
			</Card.Content>
			{#if data.subscription.cancelAtPeriodEnd}
				<Card.Footer>
					<Alert.Root variant="destructive" class="w-full">
						<AlertCircle class="size-4" />
						<Alert.Title>Subscription Ending</Alert.Title>
						<Alert.Description>
							Your subscription will end on {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}.
							You'll be downgraded to the Free plan.
						</Alert.Description>
					</Alert.Root>
				</Card.Footer>
			{/if}
		</Card.Root>
	{/if}

	<!-- Pricing Plans -->
	<div>
		<h2 class="mb-4 text-xl font-semibold">Available Plans</h2>
		<div class="grid gap-6 md:grid-cols-3">
			{#each data.plans as plan}
				{@const isCurrent = isPlanCurrent(plan)}
				{@const isUpgrade = isPlanUpgrade(plan)}
				{@const isDowngrade = isPlanDowngrade(plan)}
				{@const isPopular = plan.slug === 'pro'}
				{@const features = getPlanFeaturesList(plan)}

				<Card.Root class={isPopular ? 'relative border-primary shadow-lg' : ''}>
					{#if isPopular}
						<div class="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
							<Badge class="bg-primary text-primary-foreground">Most Popular</Badge>
						</div>
					{/if}
					<Card.Header class="text-center">
						<Card.Title class="text-xl">{plan.displayName}</Card.Title>
						<div class="mt-2">
							<span class="text-4xl font-bold">{formatPrice(plan.priceMonthly, plan.currency)}</span>
							{#if plan.priceMonthly > 0}
								<span class="text-muted-foreground">/month</span>
							{/if}
						</div>
						{#if plan.description}
							<Card.Description>{plan.description}</Card.Description>
						{/if}
					</Card.Header>
					<Card.Content>
						<ul class="space-y-3">
							{#each features as feature}
								<li class="flex items-center gap-2 text-sm">
									<Check class="size-4 shrink-0 text-green-500" />
									{feature}
								</li>
							{/each}
						</ul>
					</Card.Content>
					<Card.Footer>
						{#if isCurrent}
							<Button class="w-full" variant="outline" disabled>
								Current Plan
							</Button>
						{:else if isUpgrade}
							<Button
								class="w-full"
								variant={isPopular ? 'default' : 'outline'}
								onclick={() => handleUpgrade(plan.slug)}
								disabled={upgrading !== null || downgrading !== null}
							>
								{#if upgrading === plan.slug}
									<Loader2 class="mr-2 size-4 animate-spin" />
									Processing...
								{:else}
									<Zap class="mr-2 size-4" />
									Upgrade to {plan.displayName}
								{/if}
							</Button>
						{:else if isDowngrade}
							<Button
								class="w-full"
								variant="outline"
								onclick={() => handleDowngrade(plan.slug)}
								disabled={upgrading !== null || downgrading !== null}
							>
								{#if downgrading === plan.slug}
									<Loader2 class="mr-2 size-4 animate-spin" />
									Processing...
								{:else}
									<ArrowDown class="mr-2 size-4" />
									Downgrade to {plan.displayName}
								{/if}
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>

	<Separator />

	<!-- Business Subscriptions -->
	{#if data.businesses && data.businesses.length > 0}
		<div>
			<h2 class="mb-4 text-xl font-semibold">Your Businesses</h2>
			<p class="mb-6 text-muted-foreground">
				All your businesses share the same subscription plan.
			</p>
			<div class="space-y-4">
				{#each data.businesses as business}
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
										<Building2 class="size-5" />
									</div>
									<div>
										<Card.Title class="text-base">{business.name}</Card.Title>
										<Card.Description class="capitalize">{business.type}</Card.Description>
									</div>
								</div>
								<Badge variant="outline">{currentPlan?.displayName || 'Free'} Plan</Badge>
							</div>
						</Card.Header>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}

	<!-- FAQ / Info -->
	<div class="rounded-lg border bg-muted/50 p-6">
		<h3 class="mb-4 font-semibold">Subscription FAQ</h3>
		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<p class="text-sm font-medium">How does billing work?</p>
				<p class="text-sm text-muted-foreground">
					You'll be charged monthly. Upgrades are prorated, and you can cancel anytime.
				</p>
			</div>
			<div>
				<p class="text-sm font-medium">What happens when I hit my limit?</p>
				<p class="text-sm text-muted-foreground">
					You'll receive a notification and won't be able to create new orders until you upgrade or the new billing cycle starts.
				</p>
			</div>
			<div>
				<p class="text-sm font-medium">Can I downgrade my plan?</p>
				<p class="text-sm text-muted-foreground">
					Yes, you can downgrade at any time. The change takes effect at the end of your current billing period.
				</p>
			</div>
			<div>
				<p class="text-sm font-medium">Do you offer refunds?</p>
				<p class="text-sm text-muted-foreground">
					We offer a 7-day refund policy for new subscriptions. Contact support for assistance.
				</p>
			</div>
		</div>
	</div>
</div>
