<script lang="ts">
	import type { PageData } from './$types';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import KpiGrid from '$lib/components/global/kpi-grid.svelte';
	import KpiCard from '$lib/components/global/kpi-card.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { formatCurrency as i18nFormatCurrency, type CurrencyCode } from '$lib/utils/i18n';

	import Clock from '@lucide/svelte/icons/clock';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Receipt from '@lucide/svelte/icons/receipt';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Wallet from '@lucide/svelte/icons/wallet';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let { data }: { data: PageData } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);
	const money = (amount: number) => i18nFormatCurrency(amount, currency);

	const base = $derived(`/${data.businessType}/${(data.business as any)?.slug}/orders`);

	const stats = $derived(data.stats);
	const activeOrders = $derived(data.activeOrders ?? []);

	/** Orders waiting on a decision — the one queue that blocks someone else. */
	const awaitingApproval = $derived(
		activeOrders.filter((o: any) => o.status === 'pending_approval')
	);

	/**
	 * "Active" means three different things in this codebase, so be explicit:
	 *   - `stats.activeOrders` counts status='active' ONLY (see the SQL in
	 *     `order.service.ts:getOrderStats`) — not preparing/ready/serving.
	 *   - `getActiveOrders` returns active + preparing + ready + serving
	 *     + pending_approval.
	 *   - the Pending tab renders that set minus pending_approval.
	 *
	 * This page links to the Pending tab, so it must count what that tab shows,
	 * otherwise the card and the list it opens disagree. Approval orders are
	 * excluded here and surfaced separately below — they haven't been accepted,
	 * so they aren't in the kitchen yet.
	 */
	const kitchenQueue = $derived(activeOrders.filter((o: any) => o.status !== 'pending_approval'));

	/** Newest first, capped — this is a summary, the Pending tab is the full list. */
	const recentActive = $derived(
		[...kitchenQueue]
			.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, 6)
	);

	const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
		active: 'default',
		pending_approval: 'destructive',
		preparing: 'secondary',
		ready: 'default',
		serving: 'secondary'
	};

	function statusLabel(status: string): string {
		return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function relativeTime(iso: string): string {
		const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}
</script>

<PageShell title="Orders" description="Today's order activity across every channel">
	{#if data.statsError && data.activeError}
		<Alert.Root variant="destructive">
			<TriangleAlert class="size-4" />
			<Alert.Title>Couldn't load orders</Alert.Title>
			<Alert.Description>
				{data.statsError}
				{data.activeError} Try reloading the page.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Headline numbers -->
	{#if stats}
		<KpiGrid columns={4}>
			<KpiCard
				label="In the kitchen"
				value={kitchenQueue.length}
				icon={Clock}
				accent="primary"
				description="Preparing, ready or being served"
				href="{base}/pending"
			/>
			<KpiCard
				label="Completed"
				value={stats.completedOrders}
				icon={CircleCheck}
				accent="success"
				description="Out of {stats.totalOrders} today"
				href="{base}/completed"
			/>
			<KpiCard
				label="Revenue"
				value={money(stats.totalRevenue)}
				icon={Wallet}
				accent="primary"
				description="Today, before refunds"
			/>
			<KpiCard
				label="Average order"
				value={money(stats.averageOrderValue)}
				icon={Receipt}
				description="Across today's orders"
			/>
		</KpiGrid>
	{:else if data.statsError}
		<Alert.Root variant="destructive">
			<TriangleAlert class="size-4" />
			<Alert.Title>Statistics unavailable</Alert.Title>
			<Alert.Description>{data.statsError}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Anything blocking someone gets surfaced above the fold -->
	{#if awaitingApproval.length > 0}
		<Alert.Root>
			<TriangleAlert class="size-4" />
			<Alert.Title>
				{awaitingApproval.length}
				{awaitingApproval.length === 1 ? 'order needs' : 'orders need'} approval
			</Alert.Title>
			<Alert.Description class="flex flex-wrap items-center gap-3">
				<span>Customer QR orders don't reach the kitchen until they're accepted.</span>
				<Button href="{base}/pending-approval" size="sm" variant="outline">
					Review now
					<ArrowRight class="ml-2 size-4" />
				</Button>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid gap-4 lg:grid-cols-3">
		<!-- Live queue -->
		<Card.Root class="lg:col-span-2">
			<Card.Header class="flex flex-row items-center justify-between gap-4">
				<div class="space-y-1.5">
					<Card.Title>Live queue</Card.Title>
					<Card.Description>
						{kitchenQueue.length}
						{kitchenQueue.length === 1 ? 'order' : 'orders'} currently open
					</Card.Description>
				</div>
				<Button href="{base}/pending" variant="outline" size="sm">View all</Button>
			</Card.Header>
			<Card.Content>
				{#if data.activeError}
					<p class="py-6 text-center text-sm text-muted-foreground">{data.activeError}</p>
				{:else if recentActive.length === 0}
					<EmptyState
						type="empty"
						size="sm"
						title="Nothing in the queue"
						description="Every order has been served. New orders appear here as they come in."
					/>
				{:else}
					<div class="-mx-2">
						{#each recentActive as order (order.id)}
							<a
								href="{base}/{order.id}"
								class="flex items-center justify-between gap-4 rounded-md px-2 py-3 no-underline transition-colors hover:bg-muted/50"
							>
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-medium tabular-nums">#{order.orderNumber}</span>
										<Badge variant={statusVariant[order.status] ?? 'outline'} class="text-xs">
											{statusLabel(order.status)}
										</Badge>
									</div>
									<p class="mt-0.5 truncate text-xs text-muted-foreground">
										{order.tableNumber
											? `Table ${order.tableNumber}`
											: statusLabel(order.orderType)}
										· {order.items?.length ?? 0}
										{(order.items?.length ?? 0) === 1 ? 'item' : 'items'}
										· {relativeTime(order.createdAt)}
									</p>
								</div>
								<span class="shrink-0 text-sm font-medium tabular-nums">
									{money(order.pricing?.total ?? 0)}
								</span>
							</a>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Today at a glance -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Today</Card.Title>
				<Card.Description>Order outcomes so far</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-1">
				{#if stats}
					{@const rows = [
						{
							label: 'Total orders',
							value: stats.totalOrders,
							icon: Receipt,
							href: `${base}/history`
						},
						{
							label: 'Completed',
							value: stats.completedOrders,
							icon: CircleCheck,
							href: `${base}/completed`
						},
						{
							label: 'In the kitchen',
							value: kitchenQueue.length,
							icon: Clock,
							href: `${base}/pending`
						},
						{
							label: 'Awaiting approval',
							value: awaitingApproval.length,
							icon: ShieldCheck,
							href: `${base}/pending-approval`
						},
						{
							label: 'Cancelled',
							value: stats.cancelledOrders,
							icon: CircleX,
							href: `${base}/history?status=cancelled`
						}
					]}
					{#each rows as row (row.label)}
						<a
							href={row.href}
							class="flex items-center justify-between rounded-md px-2 py-2.5 no-underline transition-colors hover:bg-muted/50"
						>
							<span class="flex items-center gap-2 text-sm text-muted-foreground">
								<row.icon class="size-4" />
								{row.label}
							</span>
							<span class="text-sm font-medium tabular-nums">{row.value}</span>
						</a>
					{/each}
				{:else}
					<p class="py-6 text-center text-sm text-muted-foreground">Statistics unavailable.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</PageShell>
