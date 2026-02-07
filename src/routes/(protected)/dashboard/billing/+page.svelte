<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import {
		getMySubscription,
		getCustomerPortalUrl,
		formatPrice,
		type Subscription
	} from '$lib/api/subscription';
	import { onMount } from 'svelte';

	import CreditCard from '@lucide/svelte/icons/credit-card';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Zap from '@lucide/svelte/icons/zap';
	import Info from '@lucide/svelte/icons/info';

	let subscription = $state<Subscription | null>(null);
	let loading = $state(true);
	let openingPortal = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const result = await getMySubscription();
			subscription = result.subscription;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load subscription';
		} finally {
			loading = false;
		}
	});

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
</script>

<svelte:head>
	<title>Billing | POS</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Billing</h1>
		<p class="mt-2 text-muted-foreground">
			Manage your payment methods and view billing history.
		</p>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if loading}
		<Card.Root>
			<Card.Content class="flex items-center justify-center py-12">
				<Loader2 class="size-8 animate-spin text-muted-foreground" />
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Current Plan -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Current Plan</Card.Title>
						<Card.Description>Your subscription details</Card.Description>
					</div>
					{#if subscription}
						<Badge variant={subscription.status === 'active' ? 'default' : 'destructive'} class="capitalize">
							{subscription.status}
						</Badge>
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				{#if subscription}
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<p class="font-medium">{subscription.plan.displayName} Plan</p>
							<p class="text-sm text-muted-foreground">
								{formatPrice(subscription.plan.priceMonthly, subscription.plan.currency)}{subscription.plan.priceMonthly > 0 ? '/month' : ''}
							</p>
							{#if subscription.currentPeriodEnd}
								<p class="text-sm text-muted-foreground">
									Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })}
								</p>
							{/if}
						</div>
						<Button href="/dashboard/subscriptions" variant="outline">
							<Zap class="mr-2 size-4" />
							Change Plan
						</Button>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<p class="text-muted-foreground">No active subscription found.</p>
						<Button href="/dashboard/subscriptions">View Plans</Button>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Billing Portal -->
		{#if subscription?.hasBillingAccount}
			<Card.Root>
				<Card.Header>
					<Card.Title>Payment Methods & Invoices</Card.Title>
					<Card.Description>
						Manage your payment methods, view invoices, and update billing details through our payment partner's secure portal.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
								<CreditCard class="size-5" />
							</div>
							<div>
								<p class="font-medium">Billing Portal</p>
								<p class="text-sm text-muted-foreground">
									Update payment methods, download invoices, and manage billing details
								</p>
							</div>
						</div>
						<Button onclick={handleManageBilling} disabled={openingPortal}>
							{#if openingPortal}
								<Loader2 class="mr-2 size-4 animate-spin" />
								Opening...
							{:else}
								<ExternalLink class="mr-2 size-4" />
								Open Portal
							{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title>Payment Methods & Invoices</Card.Title>
					<Card.Description>Manage your payment options and view billing history</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
						<Info class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
						<div>
							<p class="font-medium">No billing account yet</p>
							<p class="mt-1 text-sm text-muted-foreground">
								Upgrade to a paid plan to access payment methods, invoices, and billing management.
							</p>
							<Button href="/dashboard/subscriptions" variant="outline" class="mt-3" size="sm">
								<Zap class="mr-2 size-4" />
								View Plans
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
