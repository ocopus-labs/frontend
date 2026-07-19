<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { getCustomerPortalUrl, formatPrice } from '$lib/api/subscription';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	// Inherited from the billing +layout.server.ts load — no page-level loader.
	let { data }: { data: PageData } = $props();

	const subscription = $derived(data.subscription);
	const currentPlan = $derived(subscription?.plan);
	// Only accounts that have actually transacted have a payment-provider record.
	const hasBillingAccount = $derived(Boolean(subscription?.hasBillingAccount));

	let openingPortal = $state(false);

	async function handleOpenPortal() {
		if (openingPortal) return;
		openingPortal = true;
		try {
			const response = await getCustomerPortalUrl();
			if (response.url) window.open(response.url, '_blank');
			else toast.error('The payment portal returned no link. Try again in a moment.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
		} finally {
			openingPortal = false;
		}
	}

	const statusBadge = $derived.by(() => {
		switch (subscription?.status) {
			case 'active':
				return { variant: 'default' as const, text: 'Active' };
			case 'trialing':
				return { variant: 'secondary' as const, text: 'Trial' };
			case 'past_due':
				return { variant: 'destructive' as const, text: 'Past due' };
			case 'canceled':
				return { variant: 'outline' as const, text: 'Cancelled' };
			default:
				return { variant: 'outline' as const, text: subscription?.status ?? 'Unknown' };
		}
	});

	function formatDate(iso?: string) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Invoices | Billing | POS</title>
</svelte:head>

{#if subscription?.status === 'past_due'}
	<Alert.Root variant="destructive">
		<AlertCircle class="size-4" />
		<Alert.Title>Payment failed</Alert.Title>
		<Alert.Description>
			Your last payment didn't go through. Update your payment method in the payment portal to avoid
			losing access.
		</Alert.Description>
	</Alert.Root>
{/if}

<div class="space-y-3">
	<SectionHeader
		title="Payment method & invoices"
		description="Invoices and payment details are held by our payment provider, not in this dashboard."
	/>

	{#if hasBillingAccount}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-section-title">Open the payment portal</Card.Title>
				<Card.Description>
					Your invoices, receipts and saved payment methods live in the secure portal run by our
					payment provider. We don't store card details here.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex items-start gap-2">
						<ReceiptText class="mt-0.5 size-4 shrink-0" />
						<span>Download past invoices and payment receipts</span>
					</li>
					<li class="flex items-start gap-2">
						<ReceiptText class="mt-0.5 size-4 shrink-0" />
						<span>Add, change or remove the card you pay with</span>
					</li>
					<li class="flex items-start gap-2">
						<ReceiptText class="mt-0.5 size-4 shrink-0" />
						<span>Update the billing address and tax details printed on invoices</span>
					</li>
				</ul>
			</Card.Content>
			<Card.Footer>
				<Button onclick={handleOpenPortal} disabled={openingPortal}>
					{#if openingPortal}
						<Loader2 class="mr-1.5 size-4 animate-spin" />
					{:else}
						<ExternalLink class="mr-1.5 size-4" />
					{/if}
					Open payment portal
				</Button>
			</Card.Footer>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="pt-6">
				<EmptyState
					title="No billing account yet"
					description="You're on the free plan, so nothing has been charged and there are no invoices to show. A billing account is created the first time you pay for a plan."
					type="no-data"
					icon={ReceiptText}
					actionLabel="See plans"
					onAction={() => goto('/dashboard/billing')}
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<div class="space-y-3">
	<SectionHeader
		title="Billing details"
		description="What this dashboard knows about your subscription."
	/>

	<Card.Root>
		<Card.Header class="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
			<div>
				<Card.Title class="text-section-title">
					{currentPlan?.displayName ?? 'Starter'}
				</Card.Title>
				<Card.Description>
					{#if currentPlan && currentPlan.priceMonthly > 0}
						<span class="tabular-nums">
							{formatPrice(currentPlan.priceMonthly, currentPlan.currency)}
						</span>
						per month
					{:else}
						Free plan — nothing is charged
					{/if}
				</Card.Description>
			</div>
			<Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
		</Card.Header>

		<Card.Content>
			<dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<dt class="text-xs text-muted-foreground">Period started</dt>
					<dd class="mt-0.5 text-sm font-medium tabular-nums">
						{formatDate(subscription?.currentPeriodStart)}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-muted-foreground">
						{subscription?.cancelAtPeriodEnd ? 'Access ends' : 'Period ends'}
					</dt>
					<dd class="mt-0.5 text-sm font-medium tabular-nums">
						{formatDate(subscription?.currentPeriodEnd)}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-muted-foreground">Renewal</dt>
					<dd class="mt-0.5 text-sm font-medium">
						{#if subscription?.cancelAtPeriodEnd}
							Cancels at period end
						{:else if currentPlan && currentPlan.priceMonthly > 0}
							Renews automatically
						{:else}
							Not applicable
						{/if}
					</dd>
				</div>
			</dl>
		</Card.Content>

		{#if subscription?.cancelAtPeriodEnd}
			<Card.Footer>
				<Alert.Root class="w-full">
					<AlertCircle class="size-4" />
					<Alert.Description>
						Your plan is set to cancel on {formatDate(subscription.currentPeriodEnd)}. You'll move
						to Starter and keep your data. No further invoices will be raised after that date.
					</Alert.Description>
				</Alert.Root>
			</Card.Footer>
		{/if}
	</Card.Root>

	<p class="text-xs text-muted-foreground">
		All prices shown in this dashboard are exclusive of GST. GST is calculated and itemised on the
		invoice issued by our payment provider.
	</p>
</div>
