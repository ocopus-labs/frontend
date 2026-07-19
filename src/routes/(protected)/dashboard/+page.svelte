<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import KpiCard from '$lib/components/global/kpi-card.svelte';
	import KpiGrid from '$lib/components/global/kpi-grid.svelte';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import PieChart from '$lib/components/chart/lazy-pie-chart.svelte';
	import { LiveCounter, TrendBadge, StatusPill, EmptyState } from '$lib/components/data-display';
	import { formatCurrency } from '$lib/utils/i18n';
	import { useSession } from '$lib/auth';
	import {
		buildAccountDashboard,
		PERIOD_OPTIONS,
		PERIOD_COMPARISON_LABEL,
		type DashboardPeriod
	} from '$lib/mock/account-dashboard';
	import type { PageData } from './$types';

	import Plus from '@lucide/svelte/icons/plus';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Wine from '@lucide/svelte/icons/wine';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import Receipt from '@lucide/svelte/icons/receipt';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Network from '@lucide/svelte/icons/network';
	import Zap from '@lucide/svelte/icons/zap';
	import X from '@lucide/svelte/icons/x';
	import Banknote from '@lucide/svelte/icons/banknote';
	import PackageX from '@lucide/svelte/icons/package-x';
	import UserCheck from '@lucide/svelte/icons/user-check';

	let { data }: { data: PageData } = $props();

	const session = useSession();
	const user = $derived($session.data?.user);
	const firstName = $derived(user?.name?.split(' ')[0] ?? '');

	// TODO(api): swap the mock builder for a real `/api/account/dashboard` fetch.
	// The period would move into a URL param + `+page.ts` load once that lands.
	let period = $state<DashboardPeriod>('7d');

	const businesses = $derived(data.businesses ?? []);
	const franchises = $derived(data.franchises ?? []);
	const dashboard = $derived(buildAccountDashboard(businesses, period));
	const comparisonLabel = $derived(PERIOD_COMPARISON_LABEL[period]);

	const businessById = $derived(new Map(businesses.map((b) => [b.id, b])));

	const currentPlan = $derived(data.subscription?.plan?.displayName || 'Free');
	const isFreePlan = $derived(data.subscription?.plan?.slug === 'free' || !data.subscription);

	// --- business type presentation ------------------------------------------
	const businessTypeIcons: Record<string, any> = {
		restaurant: UtensilsCrossed,
		cafe: Coffee,
		bar: Wine,
		salon: Scissors,
		spa: Sparkles,
		gym: Dumbbell,
		retail: Store,
		clinic: Stethoscope,
		other: Building2
	};

	function getBusinessIcon(type?: string | null) {
		return businessTypeIcons[type ?? 'other'] ?? Building2;
	}

	function businessPath(business: { type?: string | null; slug: string }) {
		return `/${business.type}/${business.slug}`;
	}

	// Portfolio share bar / donut both cycle the 8 chart tokens.
	const CHART_TOKENS = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)',
		'var(--chart-6)',
		'var(--chart-7)',
		'var(--chart-8)'
	];

	function chartToken(index: number) {
		return CHART_TOKENS[index % CHART_TOKENS.length];
	}

	// --- derived view models --------------------------------------------------
	const revenueShare = $derived(
		(dashboard?.byBusiness ?? []).map((slice, i) => ({
			...slice,
			name: businessById.get(slice.businessId)?.name ?? 'Unknown',
			color: chartToken(i)
		}))
	);

	const revenueByBusinessData = $derived(
		revenueShare.map((slice) => ({ name: slice.name, revenue: slice.revenue }))
	);

	const activityIcons: Record<string, any> = {
		order: Receipt,
		refund: RotateCcw,
		staff: UserCheck,
		stock: PackageX,
		payout: Banknote
	};

	const activityAccents: Record<string, string> = {
		order: 'bg-chart-1/10 text-chart-1',
		refund: 'bg-destructive/10 text-destructive',
		staff: 'bg-chart-3/10 text-chart-3',
		stock: 'bg-warning/10 text-warning',
		payout: 'bg-success/10 text-success'
	};

	const statusPresentation: Record<
		string,
		{ label: string; status: 'success' | 'warning' | 'neutral' }
	> = {
		open: { label: 'Open', status: 'success' },
		attention: { label: 'Needs attention', status: 'warning' },
		closed: { label: 'Closed', status: 'neutral' }
	};

	function relativeTime(minutesAgo: number) {
		if (minutesAgo < 60) return `${minutesAgo}m ago`;
		const hours = Math.floor(minutesAgo / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	function money(amount: number) {
		return formatCurrency(amount, 'INR');
	}

	function compact(amount: number) {
		if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
		if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
		if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
		return `₹${amount}`;
	}

	// --- dismissible upgrade strip -------------------------------------------
	let showUpgradePrompt = $state(true);
	$effect(() => {
		if (typeof sessionStorage !== 'undefined') {
			showUpgradePrompt = sessionStorage.getItem('dismiss-upgrade-prompt') !== 'true';
		}
	});
	function dismissUpgradePrompt() {
		showUpgradePrompt = false;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('dismiss-upgrade-prompt', 'true');
		}
	}
</script>

<svelte:head>
	<title>Dashboard | POS</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5">
	<PageHeader
		title="Welcome back{firstName ? `, ${firstName}` : ''}"
		description="Everything across your businesses, in one place."
		gutter={false}
	>
		{#snippet actions()}
			<FilterSelect
				value={period}
				options={PERIOD_OPTIONS}
				onValueChange={(v) => (period = v as DashboardPeriod)}
			/>
			<Button href="/business/setup">
				<Plus class="mr-1.5 size-4" />
				Add business
			</Button>
		{/snippet}
	</PageHeader>

	{#if !data.businesses}
		<!-- Loading — mirrors the hero + KPI row + main chart row below. -->
		<Card.Root class="p-6">
			<Skeleton class="h-3 w-28" />
			<Skeleton class="mt-3 h-10 w-64" />
			<Skeleton class="mt-4 h-2.5 w-full rounded-full" />
			<div class="mt-4 flex gap-6">
				{#each [1, 2, 3] as i (i)}
					<Skeleton class="h-3 w-24" />
				{/each}
			</div>
		</Card.Root>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each [1, 2, 3, 4] as i (i)}
				<Card.Root class="p-4">
					<div class="flex items-start justify-between">
						<Skeleton class="h-3 w-20" />
						<Skeleton class="size-8 rounded-lg" />
					</div>
					<Skeleton class="mt-3 h-7 w-24" />
					<Skeleton class="mt-3 h-3 w-28" />
				</Card.Root>
			{/each}
		</div>
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<Skeleton class="h-[320px] rounded-xl lg:col-span-2" />
			<Skeleton class="h-[320px] rounded-xl" />
		</div>
	{:else if !dashboard}
		<!-- No businesses yet — onboarding is the whole page. -->
		<EmptyState
			type="empty"
			icon={Building2}
			title="Create your first business"
			description="Set up a business to start taking orders — your revenue, orders and customer insights will show up here."
			actionLabel="Create business"
			onAction={() => goto('/business/setup')}
			size="lg"
		/>
	{:else}
		<!-- ── Hero: portfolio revenue + per-business contribution ─────────── -->
		<Card.Root class="overflow-hidden">
			<Card.Content class="p-5 md:p-6">
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div class="min-w-0">
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Total revenue
						</p>
						<div class="mt-1.5 flex flex-wrap items-baseline gap-3">
							<span class="text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
								<LiveCounter
									value={dashboard.totals.revenue.value}
									format="currency"
									currency="INR"
									locale="hi-IN"
								/>
							</span>
							<TrendBadge
								value={dashboard.totals.revenue.change}
								changePercent={dashboard.totals.revenue.change}
								format="percent"
							/>
						</div>
						<p class="mt-1.5 text-sm text-muted-foreground">
							{comparisonLabel} · across {businesses.length}
							{businesses.length === 1 ? 'business' : 'businesses'}
						</p>
					</div>

					<div class="flex shrink-0 items-center gap-6 lg:pt-1">
						<div>
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Top performer
							</p>
							<p class="mt-1 truncate text-sm font-semibold">{revenueShare[0]?.name}</p>
							<p class="text-xs text-muted-foreground tabular-nums">
								{compact(revenueShare[0]?.revenue ?? 0)} · {Math.round(
									(revenueShare[0]?.share ?? 0) * 100
								)}% of total
							</p>
						</div>
						<div class="hidden h-10 w-px bg-border sm:block"></div>
						<div class="hidden sm:block">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Plan</p>
							<p class="mt-1 text-sm font-semibold">{currentPlan}</p>
							<a href="/dashboard/billing" class="text-xs text-primary hover:underline">
								{isFreePlan ? 'Upgrade' : 'Manage plan'}
							</a>
						</div>
					</div>
				</div>

				<!-- Revenue contribution bar — each business is one segment. -->
				<div class="mt-6 flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
					{#each revenueShare as slice (slice.businessId)}
						<div
							class="h-full rounded-full transition-all"
							style="width: {Math.max(slice.share * 100, 2)}%; background-color: {slice.color}"
							title="{slice.name} — {compact(slice.revenue)}"
						></div>
					{/each}
				</div>
				<div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
					{#each revenueShare.slice(0, 6) as slice (slice.businessId)}
						<div class="flex items-center gap-2">
							<span class="size-2 shrink-0 rounded-full" style="background-color: {slice.color}"
							></span>
							<span class="text-xs text-muted-foreground">
								{slice.name}
								<span class="ml-1 font-medium text-foreground tabular-nums">
									{Math.round(slice.share * 100)}%
								</span>
							</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- ── Headline KPIs ────────────────────────────────────────────────── -->
		<KpiGrid columns={4}>
			<KpiCard
				label="Orders"
				value={dashboard.totals.orders.value.toLocaleString('en-IN')}
				change={dashboard.totals.orders.change}
				description={comparisonLabel}
				icon={ShoppingBag}
				accent="chart-1"
				sparkline={dashboard.totals.orders.sparkline}
			/>
			<KpiCard
				label="Avg order value"
				value={money(dashboard.totals.avgOrderValue.value)}
				change={dashboard.totals.avgOrderValue.change}
				description={comparisonLabel}
				icon={Receipt}
				accent="chart-3"
				sparkline={dashboard.totals.avgOrderValue.sparkline}
			/>
			<KpiCard
				label="New customers"
				value={dashboard.totals.newCustomers.value.toLocaleString('en-IN')}
				change={dashboard.totals.newCustomers.change}
				description={comparisonLabel}
				icon={UserPlus}
				accent="chart-4"
				sparkline={dashboard.totals.newCustomers.sparkline}
			/>
			<KpiCard
				label="Refunds"
				value={dashboard.totals.refunds.value.toLocaleString('en-IN')}
				change={dashboard.totals.refunds.change}
				description={comparisonLabel}
				icon={RotateCcw}
				accent="destructive"
				invertTrend
				sparkline={dashboard.totals.refunds.sparkline}
			/>
		</KpiGrid>

		<!-- ── Revenue trend + mix ──────────────────────────────────────────── -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<div class="lg:col-span-2">
				<BarChart
					title="Revenue trend"
					description="Portfolio revenue {comparisonLabel.replace('vs ', 'compared with ')}"
					data={dashboard.revenueSeries}
					xKey="date"
					series={[{ key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' }]}
				/>
			</div>
			<PieChart
				title="Revenue by business"
				description="Share of portfolio revenue"
				data={revenueByBusinessData}
				labelKey="name"
				valueKey="revenue"
			/>
		</div>

		<!-- ── Business leaderboard + live activity ─────────────────────────── -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<Card.Root class="lg:col-span-2">
				<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
					<div>
						<Card.Title class="text-section-title">Business performance</Card.Title>
						<Card.Description>Ranked by revenue this period</Card.Description>
					</div>
					<Button variant="outline" size="sm" href="/dashboard/businesses">View all</Button>
				</Card.Header>
				<Card.Content class="px-0 pb-0">
					<Table.Root>
						<Table.Header>
							<Table.Row class="hover:bg-transparent">
								<Table.Head class="pl-6">Business</Table.Head>
								<Table.Head class="text-right">Revenue</Table.Head>
								<Table.Head class="hidden text-right sm:table-cell">Orders</Table.Head>
								<Table.Head class="hidden text-right md:table-cell">Avg order</Table.Head>
								<Table.Head class="pr-6 text-right">Trend</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each revenueShare as slice (slice.businessId)}
								{@const business = businessById.get(slice.businessId)}
								{@const Icon = getBusinessIcon(business?.type)}
								{@const presentation = statusPresentation[slice.status]}
								<Table.Row
									class="cursor-pointer"
									onclick={() => business && goto(`${businessPath(business)}/dashboard`)}
								>
									<Table.Cell class="pl-6">
										<div class="flex items-center gap-3">
											{#if business?.logo}
												<Avatar.Root class="size-9 rounded-lg">
													<Avatar.Image
														src={business.logo}
														alt={business.name}
														class="object-cover"
													/>
													<Avatar.Fallback class="rounded-lg bg-muted">
														<Icon class="size-4 text-muted-foreground" />
													</Avatar.Fallback>
												</Avatar.Root>
											{:else}
												<span
													class="flex size-9 shrink-0 items-center justify-center rounded-lg"
													style="background-color: color-mix(in oklch, {slice.color} 12%, transparent); color: {slice.color}"
												>
													<Icon class="size-4" />
												</span>
											{/if}
											<div class="min-w-0">
												<p class="truncate text-sm font-medium">{slice.name}</p>
												<div class="mt-0.5 flex items-center gap-2">
													<StatusPill
														label={presentation.label}
														status={presentation.status}
														size="sm"
														pulse={slice.status === 'open'}
													/>
													{#if slice.statusNote}
														<span class="hidden truncate text-xs text-muted-foreground lg:inline">
															{slice.statusNote}
														</span>
													{/if}
												</div>
											</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<span class="text-sm font-semibold tabular-nums">
											{compact(slice.revenue)}
										</span>
										<p class="text-xs text-muted-foreground tabular-nums">
											{Math.round(slice.share * 100)}% of total
										</p>
									</Table.Cell>
									<Table.Cell class="hidden text-right text-sm tabular-nums sm:table-cell">
										{slice.orders.toLocaleString('en-IN')}
									</Table.Cell>
									<Table.Cell class="hidden text-right text-sm tabular-nums md:table-cell">
										{money(slice.avgOrderValue)}
									</Table.Cell>
									<Table.Cell class="pr-6">
										<div class="flex items-center justify-end gap-2">
											<TrendBadge
												value={slice.revenueChange}
												changePercent={slice.revenueChange}
												format="percent"
												size="sm"
											/>
											<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>

			<Card.Root class="flex max-h-[460px] flex-col">
				<Card.Header class="space-y-0">
					<Card.Title class="text-section-title">Live activity</Card.Title>
					<Card.Description>Across all businesses</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1 space-y-4 overflow-y-auto">
					{#each dashboard.activity as event (event.id)}
						{@const Icon = activityIcons[event.kind]}
						<div class="flex gap-3">
							<span
								class="flex size-8 shrink-0 items-center justify-center rounded-lg {activityAccents[
									event.kind
								]}"
							>
								<Icon class="size-4" />
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<p class="text-sm leading-tight font-medium">{event.title}</p>
									{#if event.amount !== undefined}
										<span class="shrink-0 text-sm font-semibold tabular-nums">
											{compact(event.amount)}
										</span>
									{/if}
								</div>
								<p class="truncate text-xs text-muted-foreground">{event.description}</p>
								<p class="mt-0.5 text-xs text-muted-foreground">
									{event.businessName} · {relativeTime(event.minutesAgo)}
								</p>
							</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- ── Peak hours + top sellers ─────────────────────────────────────── -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<BarChart
				title="Peak hours"
				description="When orders land across the portfolio"
				data={dashboard.peakHours}
				xKey="hour"
				series={[{ key: 'orders', label: 'Orders', color: 'var(--chart-3)' }]}
			/>

			<Card.Root>
				<Card.Header class="space-y-0">
					<Card.Title class="text-section-title">Top sellers</Card.Title>
					<Card.Description>Best-performing items this period</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each dashboard.topItems as item, i (item.name + item.businessName)}
						<div class="flex items-center gap-3">
							<span
								class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground tabular-nums"
							>
								{i + 1}
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{item.name}</p>
								<p class="truncate text-xs text-muted-foreground">{item.businessName}</p>
							</div>
							<div class="shrink-0 text-right">
								<p class="text-sm font-semibold tabular-nums">{compact(item.revenue)}</p>
								<p class="text-xs text-muted-foreground tabular-nums">
									{item.quantity} sold
								</p>
							</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- ── Franchises ───────────────────────────────────────────────────── -->
		{#if franchises.length > 0}
			<div class="space-y-3">
				<SectionHeader title="Franchises" description="Groups you own or manage" />
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each franchises as franchise (franchise.id)}
						<a href="/franchise/{franchise.slug}" class="group block no-underline">
							<Card.Root class="transition-all group-hover:border-primary/50 group-hover:shadow-md">
								<Card.Content class="flex items-center gap-3 p-4">
									<span
										class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
									>
										<Network class="size-5 text-primary" />
									</span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{franchise.name}</p>
										<p class="text-xs text-muted-foreground">
											{franchise._count?.businesses ?? 0} locations ·
											{franchise._count?.staff ?? 0} staff
										</p>
									</div>
									<ChevronRight
										class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
									/>
								</Card.Content>
							</Card.Root>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ── Upgrade strip ────────────────────────────────────────────────── -->
		{#if isFreePlan && showUpgradePrompt}
			<Card.Root class="border-primary/30 bg-primary/5">
				<Card.Content class="flex flex-wrap items-center justify-between gap-4 p-5">
					<div class="flex items-center gap-4">
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
						>
							<Zap class="size-5 text-primary" />
						</span>
						<div>
							<p class="font-semibold">Upgrade to Pro</p>
							<p class="text-sm text-muted-foreground">
								Unlimited businesses, advanced analytics and priority support.
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Button href="/dashboard/billing">Upgrade now</Button>
						<Button
							variant="ghost"
							size="icon"
							onclick={dismissUpgradePrompt}
							aria-label="Dismiss upgrade prompt"
						>
							<X class="size-4" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
