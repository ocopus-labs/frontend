<script lang="ts">
	import type { PageData } from './$types';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Shimmer } from '@shimmer-from-structure/svelte';
	import { getUsage, type UsageResponse, type UsageScope } from '$lib/api/agent';
	import { ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import { userFriendlyError } from '$lib/utils/error';
	import ChartIcon from '@lucide/svelte/icons/chart-column';

	let { data }: { data: PageData } = $props();

	const businessId = $derived(data.businessId as string);

	let usage = $state<UsageResponse | null>(data.usage);
	let error = $state<string | null>(data.error);
	let scope = $state<UsageScope>('me');
	let loading = $state(false);

	/**
	 * Whether the business-wide figure is offered at all.
	 *
	 * The server refuses `scope=business` to anyone but an owner, so showing the
	 * toggle to a manager would advertise a button that only ever 403s.
	 */
	const canSeeBusiness = $derived(
		['super_admin', 'franchise_owner', 'restaurant_owner'].includes(
			String(data.userRole ?? '').toLowerCase()
		)
	);

	async function switchScope(next: UsageScope) {
		if (next === scope || loading) return;
		loading = true;
		error = null;
		try {
			usage = await getUsage(businessId, { scope: next });
			scope = next;
		} catch (e) {
			error = userFriendlyError(e);
		} finally {
			loading = false;
		}
	}

	const totals = $derived(usage?.totals);

	/** Busiest day in the range, which is what the bars are scaled against. */
	const peak = $derived(Math.max(1, ...(usage?.daily ?? []).map((d) => d.tokens)));

	const quotaUsedToday = $derived.by(() => {
		if (!usage?.quota?.messagesLimit) return null;
		// The last day in the range is today unless the operator narrowed it.
		const today = usage.daily[usage.daily.length - 1];
		if (!today || today.date !== usage.to) return null;
		return { used: today.messages, limit: usage.quota.messagesLimit };
	});

	function formatNumber(value: number): string {
		return value.toLocaleString();
	}

	function formatDay(date: string): string {
		// Already a business-local calendar day from the server. Parsed as UTC so
		// the browser's own zone cannot shift the label off by one.
		return new Intl.DateTimeFormat(undefined, {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(new Date(`${date}T00:00:00.000Z`));
	}
</script>

<svelte:head>
	<title>{ASSISTANT_NAME} usage | Settings</title>
</svelte:head>

<PageShell
	width="content"
	title="{ASSISTANT_NAME} usage"
	description="How much the assistant has been used, by day."
	back
>
	{#if error}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>Usage is unavailable</Empty.Title>
				<Empty.Description>{error}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#if canSeeBusiness}
			<SettingsSection title="Whose usage" description="Owners can see the whole business.">
				<div class="flex gap-2">
					<Button
						variant={scope === 'me' ? 'default' : 'outline'}
						size="sm"
						disabled={loading}
						onclick={() => switchScope('me')}
					>
						Just me
					</Button>
					<Button
						variant={scope === 'business' ? 'default' : 'outline'}
						size="sm"
						disabled={loading}
						onclick={() => switchScope('business')}
					>
						Whole business
					</Button>
				</div>
			</SettingsSection>
		{/if}

		<SettingsSection
			title="Totals"
			description={usage ? `${formatDay(usage.from)} to ${formatDay(usage.to)}.` : undefined}
		>
			<Shimmer {loading} class="rounded-xl">
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg border border-border bg-card p-4">
						<p class="text-sm text-muted-foreground">Messages</p>
						<p class="text-2xl font-semibold">{formatNumber(totals?.messages ?? 0)}</p>
					</div>
					<div class="rounded-lg border border-border bg-card p-4">
						<p class="text-sm text-muted-foreground">Tokens</p>
						<p class="text-2xl font-semibold">{formatNumber(totals?.tokens ?? 0)}</p>
					</div>
				</div>
				<!--
					No cost figure. The backend has no per-model prices to bill
					against, so `costMinor` is structurally zero — rendering it as
					money would put "₹0.00" next to real traffic and read as "the
					assistant is free", which is a claim nobody has made. Tokens are
					the number that is actually measured. See the contract's §5 note.
				-->
				<p class="mt-3 text-xs text-muted-foreground">
					Cost per token is not yet tracked, so only volume is shown here.
				</p>
			</Shimmer>
		</SettingsSection>

		{#if quotaUsedToday}
			<SettingsSection title="Today's allowance" description="Resets at midnight in your timezone.">
				<div class="max-w-md space-y-2">
					<Progress value={(quotaUsedToday.used / quotaUsedToday.limit) * 100} />
					<p class="text-sm text-muted-foreground">
						{formatNumber(quotaUsedToday.used)} of {formatNumber(quotaUsedToday.limit)} messages used.
					</p>
				</div>
			</SettingsSection>
		{/if}

		<SettingsSection title="By day" description="Days with no activity are not listed.">
			{#if !usage?.daily.length}
				<Empty.Root>
					<Empty.Header>
						<Empty.Media variant="icon">
							<ChartIcon />
						</Empty.Media>
						<Empty.Title>Nothing yet</Empty.Title>
						<Empty.Description>
							{ASSISTANT_NAME} has not been used in this period.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Day</Table.Head>
								<Table.Head class="text-right">Messages</Table.Head>
								<Table.Head class="text-right">Tokens</Table.Head>
								<!--
									The bar is the chart, and the row is its accessible
									alternative — the same rule the tool-result renderers
									follow, so a screen reader gets the numbers rather than
									a decorative div.
								-->
								<Table.Head class="w-32" aria-hidden="true"></Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each usage.daily as day (day.date)}
								<Table.Row>
									<Table.Cell>{formatDay(day.date)}</Table.Cell>
									<Table.Cell class="text-right tabular-nums">
										{formatNumber(day.messages)}
									</Table.Cell>
									<Table.Cell class="text-right tabular-nums">
										{formatNumber(day.tokens)}
									</Table.Cell>
									<Table.Cell aria-hidden="true">
										<div class="h-2 w-full rounded-full bg-muted">
											<div
												class="h-2 rounded-full bg-primary"
												style="width: {Math.round((day.tokens / peak) * 100)}%"
											></div>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</SettingsSection>
	{/if}
</PageShell>
