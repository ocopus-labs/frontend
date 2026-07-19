<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		createCheckout,
		formatPrice,
		formatLimit,
		type SubscriptionPlan
	} from '$lib/api/subscription';
	import {
		TIER_COPY,
		ADDON_MODULES,
		MODULE_GROUP_LABELS,
		BILLING_SCOPE,
		type ModuleGroup
	} from '$lib/config/pricing';
	import type { PageData } from './$types';

	import Check from '@lucide/svelte/icons/check';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import Blocks from '@lucide/svelte/icons/blocks';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let { data }: { data: PageData } = $props();

	const subscription = $derived(data.subscription);
	const currentPlan = $derived(subscription?.plan);
	const plans = $derived((data.plans ?? []) as SubscriptionPlan[]);

	let busySlug = $state<string | null>(null);
	let error = $state<string | null>(null);
	let downgradeDialogOpen = $state(false);
	let downgradeTargetSlug = $state<string | null>(null);

	/** Positioning copy for a tier, matched by slug. */
	function copyFor(slug: string | undefined) {
		return TIER_COPY.find((t) => t.slug === slug);
	}

	function isCurrent(plan: SubscriptionPlan) {
		return currentPlan?.slug === plan.slug;
	}

	function isUpgrade(plan: SubscriptionPlan) {
		if (!currentPlan) return plan.slug !== 'free';
		return plan.sortOrder > currentPlan.sortOrder;
	}

	function isDowngrade(plan: SubscriptionPlan) {
		if (!currentPlan) return false;
		return plan.sortOrder < currentPlan.sortOrder;
	}

	async function startCheckout(planSlug: string) {
		if (busySlug) return;
		error = null;
		busySlug = planSlug;
		try {
			const response = await createCheckout(planSlug);
			if (response.checkoutUrl) window.location.href = response.checkoutUrl;
			else busySlug = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start checkout';
			busySlug = null;
		}
	}

	function triggerDowngrade(planSlug: string) {
		downgradeTargetSlug = planSlug;
		downgradeDialogOpen = true;
	}

	function downgradeDescription(): string {
		if (!downgradeTargetSlug || !currentPlan) return '';
		const target = plans.find((p) => p.slug === downgradeTargetSlug);
		if (!target) return '';

		const changes: string[] = [];
		if (target.maxOrdersPerMonth !== currentPlan.maxOrdersPerMonth) {
			changes.push(
				`Orders: ${formatLimit(currentPlan.maxOrdersPerMonth)} → ${formatLimit(target.maxOrdersPerMonth)}/month`
			);
		}
		if (target.maxLocations !== currentPlan.maxLocations) {
			changes.push(
				`Outlets: ${formatLimit(currentPlan.maxLocations)} → ${formatLimit(target.maxLocations)}`
			);
		}
		if (target.maxTeamMembers !== currentPlan.maxTeamMembers) {
			changes.push(
				`Team members: ${formatLimit(currentPlan.maxTeamMembers)} → ${formatLimit(target.maxTeamMembers)}`
			);
		}

		return `You're moving from ${currentPlan.displayName} to ${target.displayName}. These limits change:\n\n${changes.join('\n')}\n\nThis takes effect at the end of your current billing period, and your data is kept.`;
	}

	async function confirmDowngrade() {
		if (downgradeTargetSlug) await startCheckout(downgradeTargetSlug);
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

	const MODULE_GROUPS: ModuleGroup[] = ['selling', 'operations', 'growth', 'platform'];

	function formatPeriodEnd(iso?: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Billing | POS</title>
</svelte:head>

{#if error}
	<Alert.Root variant="destructive">
		<AlertCircle class="size-4" />
		<Alert.Description>{error}</Alert.Description>
	</Alert.Root>
{/if}

{#if subscription?.status === 'past_due'}
	<Alert.Root variant="destructive">
		<AlertCircle class="size-4" />
		<Alert.Title>Payment failed</Alert.Title>
		<Alert.Description>
			Update your payment method in the payment portal to avoid losing access.
		</Alert.Description>
	</Alert.Root>
{/if}

<!-- Current plan -->
<Card.Root>
	<Card.Header class="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
		<div>
			<Card.Title class="text-section-title">Current plan</Card.Title>
			<Card.Description>
				{#if subscription?.cancelAtPeriodEnd}
					Cancels on {formatPeriodEnd(subscription.currentPeriodEnd)}
				{:else if subscription?.currentPeriodEnd && currentPlan?.slug !== 'free'}
					Renews on {formatPeriodEnd(subscription.currentPeriodEnd)}
				{:else}
					No renewal — free forever
				{/if}
			</Card.Description>
		</div>
		<Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
	</Card.Header>
	<Card.Content>
		<div class="flex flex-wrap items-baseline gap-3">
			<span class="text-3xl font-semibold tracking-tight tabular-nums">
				{copyFor(currentPlan?.slug)?.name ?? currentPlan?.displayName ?? 'Starter'}
			</span>
			{#if currentPlan && currentPlan.priceMonthly > 0}
				<span class="text-sm text-muted-foreground tabular-nums">
					{formatPrice(currentPlan.priceMonthly, currentPlan.currency)}/month
				</span>
			{/if}
		</div>
		{#if copyFor(currentPlan?.slug)}
			<p class="mt-1.5 text-sm text-muted-foreground">
				{copyFor(currentPlan?.slug)?.audience}
			</p>
		{/if}
	</Card.Content>
	{#if subscription?.cancelAtPeriodEnd}
		<Card.Footer>
			<Alert.Root>
				<AlertCircle class="size-4" />
				<Alert.Description>
					Your plan is set to cancel at the end of this period. You'll move to Starter and keep your
					data.
				</Alert.Description>
			</Alert.Root>
		</Card.Footer>
	{/if}
</Card.Root>

<!-- Plans -->
<div class="space-y-3">
	<SectionHeader
		title="Plans"
		description="Every plan includes POS, orders and customers. Modules are added on top, {BILLING_SCOPE}."
	/>

	{#if plans.length === 0}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Description>
				Couldn't load plans right now. Refresh the page to try again.
			</Alert.Description>
		</Alert.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			{#each plans as plan (plan.id)}
				{@const copy = copyFor(plan.slug)}
				{@const current = isCurrent(plan)}
				<Card.Root class="flex flex-col {current ? 'border-primary ring-1 ring-primary/30' : ''}">
					<Card.Header class="space-y-0">
						<div class="flex items-center justify-between gap-2">
							<Card.Title class="text-section-title">
								{copy?.name ?? plan.displayName}
							</Card.Title>
							{#if current}
								<Badge>Current</Badge>
							{:else if copy?.highlighted}
								<Badge variant="secondary">Most popular</Badge>
							{/if}
						</div>
						<Card.Description>{copy?.tagline ?? plan.description}</Card.Description>
					</Card.Header>

					<Card.Content class="flex-1 space-y-4">
						<div class="flex items-baseline gap-1.5">
							<span class="text-3xl font-semibold tracking-tight tabular-nums">
								{plan.priceMonthly > 0 ? formatPrice(plan.priceMonthly, plan.currency) : 'Free'}
							</span>
							{#if plan.priceMonthly > 0}
								<span class="text-sm text-muted-foreground">/month</span>
							{/if}
						</div>

						<ul class="space-y-2">
							{#each copy?.highlights ?? [] as highlight (highlight)}
								<li class="flex items-start gap-2 text-sm">
									<Check class="mt-0.5 size-4 shrink-0 text-success" />
									<span>{highlight}</span>
								</li>
							{/each}
						</ul>
					</Card.Content>

					<Card.Footer>
						{#if current}
							<Button variant="outline" class="w-full" disabled>Current plan</Button>
						{:else if isUpgrade(plan)}
							<Button
								class="w-full"
								disabled={busySlug !== null}
								onclick={() => startCheckout(plan.slug)}
							>
								{#if busySlug === plan.slug}
									<Loader2 class="mr-1.5 size-4 animate-spin" />
								{/if}
								Upgrade to {copy?.name ?? plan.displayName}
							</Button>
						{:else if isDowngrade(plan)}
							<Button
								variant="outline"
								class="w-full"
								disabled={busySlug !== null}
								onclick={() => triggerDowngrade(plan.slug)}
							>
								Switch to {copy?.name ?? plan.displayName}
							</Button>
						{:else}
							<Button variant="outline" class="w-full" href={copy?.href ?? '/contact'}>
								{copy?.cta ?? 'Learn more'}
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Modules -->
<div class="space-y-3">
	<SectionHeader
		title="Modules"
		description="Switch on what you need, {BILLING_SCOPE}. Turn one off and billing stops at the end of the period."
	/>

	<Alert.Root>
		<Blocks class="size-4" />
		<Alert.Title>Modules are managed per outlet</Alert.Title>
		<Alert.Description class="space-y-2">
			<p>
				Because each outlet runs differently, modules are switched on for a specific business rather
				than the whole account. Open a business and go to Settings → Features to change what it
				uses.
			</p>
			<Button variant="outline" size="sm" href="/dashboard/businesses">
				Choose a business
				<ArrowRight class="ml-1.5 size-4" />
			</Button>
		</Alert.Description>
	</Alert.Root>

	{#each MODULE_GROUPS as group (group)}
		{@const modules = ADDON_MODULES.filter((m) => m.group === group)}
		{#if modules.length > 0}
			<div class="space-y-2">
				<h3 class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{MODULE_GROUP_LABELS[group]}
				</h3>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{#each modules as module (module.slug)}
						<Card.Root class="p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-sm font-medium">{module.name}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">{module.description}</p>
								</div>
								{#if module.addOnMonthly === null}
									<Badge variant="outline" class="shrink-0 gap-1">
										<Lock class="size-3" />
										{module.minimumTier === 'ENTERPRISE' ? 'Enterprise' : 'Pro'}
									</Badge>
								{:else}
									<span class="shrink-0 text-sm font-semibold tabular-nums">
										₹{module.addOnMonthly}
									</span>
								{/if}
							</div>
							{#if module.dependsOn?.length}
								<p class="mt-2 text-xs text-muted-foreground">
									Needs {module.dependsOn.join(', ')}
								</p>
							{/if}
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>

<ConfirmDialog
	bind:open={downgradeDialogOpen}
	title="Change plan"
	description={downgradeDescription()}
	confirmLabel="Change plan"
	onConfirm={confirmDowngrade}
/>
