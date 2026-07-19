<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import { formatLimit } from '$lib/api/subscription';
	import type { PageData } from './$types';

	import Building2 from '@lucide/svelte/icons/building-2';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Users from '@lucide/svelte/icons/users';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Infinity_ from '@lucide/svelte/icons/infinity';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	// Inherited from the billing +layout.server.ts load — no page-level loader.
	let { data }: { data: PageData } = $props();

	const usage = $derived(data.usage);
	const subscription = $derived(data.subscription);
	const currentPlan = $derived(subscription?.plan);

	function formatDate(iso?: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	/** Counting window for the meters. The backend counts orders per CALENDAR month. */
	const calendarPeriod = $derived(
		usage ? `${formatDate(usage.periodStart)} – ${formatDate(usage.periodEnd)}` : ''
	);

	type Meter = {
		key: string;
		label: string;
		hint: string;
		icon: typeof Building2;
		used: number;
		limit: number;
	};

	const meters = $derived.by<Meter[]>(() => {
		if (!usage) return [];
		return [
			{
				key: 'outlets',
				label: 'Outlets',
				hint: 'Businesses you own on this account',
				icon: Building2,
				used: usage.locationsCount,
				limit: usage.locationLimit
			},
			{
				key: 'orders',
				label: 'Orders',
				hint: 'Counted across all your outlets this calendar month',
				icon: TrendingUp,
				used: usage.ordersThisMonth,
				limit: usage.orderLimit
			},
			{
				key: 'team',
				label: 'Team members',
				hint: 'People with access to your outlets',
				icon: Users,
				used: usage.teamMembersCount,
				limit: usage.teamMemberLimit
			}
		];
	});

	/** -1 means unlimited, so there is nothing to fill a bar with. */
	function isUnlimited(limit: number) {
		return limit === -1;
	}

	function isMetered(limit: number) {
		return limit > 0;
	}

	function percentOf(used: number, limit: number) {
		if (!isMetered(limit)) return 0;
		return Math.min(100, Math.round((used / limit) * 100));
	}

	const orderPercentage = $derived(usage ? percentOf(usage.ordersThisMonth, usage.orderLimit) : 0);
</script>

<svelte:head>
	<title>Usage | Billing | POS</title>
</svelte:head>

{#if !usage}
	<Alert.Root variant="destructive">
		<AlertCircle class="size-4" />
		<Alert.Title>Usage couldn't be loaded</Alert.Title>
		<Alert.Description>
			We couldn't read your usage counters just now, so nothing is shown rather than showing zeros
			that aren't real. Refresh the page to try again.
		</Alert.Description>
	</Alert.Root>
{:else}
	{#if orderPercentage >= 95}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>You're about to hit your order limit</Alert.Title>
			<Alert.Description class="space-y-2">
				<p>
					You've used {orderPercentage}% of the {formatLimit(usage.orderLimit)} orders included this calendar
					month. Once you reach the limit, new orders are blocked until the month rolls over.
				</p>
				<Button variant="outline" size="sm" href="/dashboard/billing">
					See plans
					<ArrowRight class="ml-1.5 size-4" />
				</Button>
			</Alert.Description>
		</Alert.Root>
	{:else if orderPercentage >= 80}
		<Alert.Root>
			<AlertCircle class="size-4" />
			<Alert.Title>You're approaching your order limit</Alert.Title>
			<Alert.Description class="space-y-2">
				<p>
					You've used {orderPercentage}% of the {formatLimit(usage.orderLimit)} orders included this calendar
					month. Consider upgrading before you run out.
				</p>
				<Button variant="outline" size="sm" href="/dashboard/billing">
					See plans
					<ArrowRight class="ml-1.5 size-4" />
				</Button>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="space-y-3">
		<SectionHeader
			title="This calendar month"
			description="Usage counters reset on the 1st of each month, which is not the same window as your subscription's billing period."
		/>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each meters as meter (meter.key)}
				{@const Icon = meter.icon}
				{@const unlimited = isUnlimited(meter.limit)}
				{@const metered = isMetered(meter.limit)}
				{@const percentage = percentOf(meter.used, meter.limit)}
				<Card.Root>
					<Card.Header class="space-y-0 pb-2">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<Icon class="size-4 text-muted-foreground" />
								<Card.Title class="text-sm font-medium">{meter.label}</Card.Title>
							</div>
							{#if unlimited}
								<Badge variant="secondary" class="gap-1">
									<Infinity_ class="size-3" />
									Unlimited
								</Badge>
							{:else if metered}
								<span
									class="text-xs font-medium tabular-nums {percentage >= 95
										? 'text-destructive'
										: percentage >= 80
											? 'text-warning'
											: 'text-muted-foreground'}"
								>
									{percentage}%
								</span>
							{/if}
						</div>
					</Card.Header>
					<Card.Content class="space-y-2">
						<p class="text-2xl font-semibold tracking-tight tabular-nums">
							{meter.used}
							{#if !unlimited}
								<span class="text-sm font-normal text-muted-foreground tabular-nums">
									of {formatLimit(meter.limit)}
								</span>
							{/if}
						</p>

						{#if metered}
							<Progress value={percentage} class="h-2" />
						{/if}

						<p class="text-xs text-muted-foreground">{meter.hint}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>

	<div class="space-y-3">
		<SectionHeader
			title="Periods"
			description="Two different windows are in play — worth knowing which one you're reading."
		/>

		<Card.Root>
			<Card.Content class="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
				<div class="flex items-start gap-3">
					<CalendarClock class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">Counting window</p>
						<p class="text-sm text-muted-foreground tabular-nums">{calendarPeriod}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							The meters above count this calendar month and reset on the 1st.
						</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<CalendarClock class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">
							{subscription?.cancelAtPeriodEnd ? 'Subscription ends' : 'Subscription renews'}
						</p>
						{#if subscription?.currentPeriodEnd && currentPlan?.slug !== 'free'}
							<p class="text-sm text-muted-foreground tabular-nums">
								{formatDate(subscription.currentPeriodEnd)}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Billing runs from your subscription date ({formatDate(
									subscription.currentPeriodStart
								)}), so it doesn't line up with the calendar month above.
							</p>
						{:else}
							<p class="text-sm text-muted-foreground">No renewal — you're on the free plan</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Limits still apply and still reset with the calendar month.
							</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
