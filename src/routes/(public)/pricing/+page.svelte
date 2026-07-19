<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { APP_NAME } from '$lib/constants/config';

	import {
		TIER_COPY,
		TIER_FALLBACK,
		ADDON_MODULES,
		CORE_MODULES,
		MODULE_GROUP_LABELS,
		COMPARISON_ROWS,
		PRICING_FAQ,
		BILLING_SCOPE,
		modulesByGroup,
		getModule,
		type ComparisonRow,
		type ModuleGroup,
		type Tier,
		type TierCopy
	} from '$lib/config/pricing';
	import type { PageData } from './$types';

	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Lock from '@lucide/svelte/icons/lock';
	import Blocks from '@lucide/svelte/icons/blocks';
	import Store from '@lucide/svelte/icons/store';

	let { data }: { data: PageData } = $props();

	const plans = $derived(data.plans ?? []);

	let billingCycle = $state('monthly');
	const isYearly = $derived(billingCycle === 'yearly');

	// -----------------------------------------------------------------------
	// Merge: API numbers (price, currency, limits) + config positioning copy
	// -----------------------------------------------------------------------

	interface TierView {
		copy: TierCopy;
		currency: string;
		priceMonthly: number;
		/** `null` when the API has no annual price — we then show no yearly price. */
		priceYearly: number | null;
		maxLocations: number;
		maxTeamMembers: number;
		maxOrdersPerMonth: number;
		/** Derived from the real numbers, never asserted. */
		yearlySavingPct: number | null;
	}

	const tiers = $derived.by(() =>
		TIER_COPY.map((copy): TierView => {
			const plan = plans.find((p) => p.slug === copy.slug);
			const fallback = TIER_FALLBACK[copy.slug];

			const priceMonthly = plan?.priceMonthly ?? fallback?.priceMonthly ?? 0;
			const rawYearly = plan ? plan.priceYearly : fallback?.priceYearly;
			const priceYearly = typeof rawYearly === 'number' ? rawYearly : null;

			const yearlySavingPct =
				priceMonthly > 0 && priceYearly !== null && priceYearly > 0
					? Math.round((1 - priceYearly / (priceMonthly * 12)) * 100)
					: null;

			return {
				copy,
				currency: plan?.currency ?? 'INR',
				priceMonthly,
				priceYearly,
				maxLocations: plan?.maxLocations ?? fallback?.maxLocations ?? 1,
				maxTeamMembers: plan?.maxTeamMembers ?? fallback?.maxTeamMembers ?? 1,
				maxOrdersPerMonth: plan?.maxOrdersPerMonth ?? fallback?.maxOrdersPerMonth ?? 0,
				yearlySavingPct: yearlySavingPct && yearlySavingPct > 0 ? yearlySavingPct : null
			};
		})
	);

	/** Best honest annual saving across tiers — `null` if no tier actually saves. */
	const bestYearlySavingPct = $derived.by(() => {
		const savings = tiers.map((t) => t.yearlySavingPct).filter((n): n is number => n !== null);
		return savings.length > 0 ? Math.max(...savings) : null;
	});

	function money(amount: number, currency: string): string {
		try {
			return new Intl.NumberFormat('en-IN', {
				style: 'currency',
				currency,
				maximumFractionDigits: 0
			}).format(amount);
		} catch {
			return `₹${amount.toLocaleString('en-IN')}`;
		}
	}

	function limit(value: number): string {
		return value === -1 ? 'Unlimited' : value.toLocaleString('en-IN');
	}

	// -----------------------------------------------------------------------
	// Modules
	// -----------------------------------------------------------------------

	const MODULE_GROUPS: ModuleGroup[] = ['selling', 'operations', 'growth', 'platform'];
	const ADDON_SLUGS = new Set(ADDON_MODULES.map((m) => m.slug));

	function addonsInGroup(group: ModuleGroup) {
		return modulesByGroup(group).filter((m) => ADDON_SLUGS.has(m.slug));
	}

	/** Human tier name for a minimumTier, straight from TIER_COPY. */
	function tierName(tier: Tier): string {
		return TIER_COPY.find((t) => t.slug === tier.toLowerCase())?.name ?? tier;
	}

	function dependencyNames(slugs: string[]): string {
		return slugs.map((slug) => getModule(slug)?.name ?? slug).join(' + ');
	}

	// -----------------------------------------------------------------------
	// Comparison columns — driven by TIER_COPY so names never drift
	// -----------------------------------------------------------------------

	type ComparisonKey = 'free' | 'pro' | 'enterprise';

	const COMPARE_COLUMNS: { key: ComparisonKey; name: string; highlighted: boolean }[] =
		TIER_COPY.filter((t) => t.slug === 'free' || t.slug === 'pro' || t.slug === 'enterprise').map(
			(t) => ({
				key: t.slug as ComparisonKey,
				name: t.name,
				highlighted: t.highlighted === true
			})
		);

	/**
	 * Outlets / team / orders come from the same live plan data as the tier
	 * cards, so the table can't contradict the cards above it. Everything
	 * qualitative stays in `COMPARISON_ROWS`.
	 */
	const comparisonRows = $derived.by<ComparisonRow[]>(() => {
		const cellFor = (key: ComparisonKey, pick: (t: TierView) => number): string => {
			const tier = tiers.find((t) => t.copy.slug === key);
			return tier ? limit(pick(tier)) : '—';
		};

		const row = (label: string, pick: (t: TierView) => number): ComparisonRow => ({
			label,
			free: cellFor('free', pick),
			pro: cellFor('pro', pick),
			enterprise: cellFor('enterprise', pick)
		});

		return [
			row('Outlets', (t) => t.maxLocations),
			row('Team members', (t) => t.maxTeamMembers),
			row('Orders per month', (t) => t.maxOrdersPerMonth),
			...COMPARISON_ROWS
		];
	});

	function cell(row: ComparisonRow, key: ComparisonKey): string | boolean {
		return row[key];
	}
</script>

<svelte:head>
	<title>Pricing — {APP_NAME}</title>
	<meta
		name="description"
		content="Every {APP_NAME} plan includes POS, orders and customers. Add modules only as you need them — priced {BILLING_SCOPE} per month, so a second location costs only what it actually uses."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<!-- Hero -->
	<section class="relative pb-14">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
			<div
				class="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/5 blur-3xl"
			></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 text-center lg:px-8">
			<p class="animate-fade-up text-sm font-semibold tracking-wider text-primary uppercase">
				Pricing
			</p>
			<h1 class="animate-fade-up font-display mt-3 text-4xl delay-100 md:text-5xl lg:text-6xl">
				Pay for what you <span class="italic">actually</span> use
			</h1>
			<p
				class="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground delay-200"
			>
				Every plan includes POS, orders and customers — no crippled billing screen to upsell you out
				of. Everything else is a module you switch on when you need it. Modules are priced
				<span class="font-medium text-foreground">{BILLING_SCOPE}</span>, so a second location costs
				only what that location actually uses.
			</p>

			<div class="animate-fade-up mt-10 flex justify-center delay-300">
				<Tabs.Root bind:value={billingCycle}>
					<Tabs.List class="bg-muted/50">
						<Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
						<Tabs.Trigger value="yearly">
							Yearly
							{#if bestYearlySavingPct !== null}
								<span
									class="ml-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success tabular-nums"
								>
									Save up to {bestYearlySavingPct}%
								</span>
							{/if}
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
		</div>
	</section>

	<!-- Tier cards -->
	<section class="pb-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="grid items-start gap-6 md:grid-cols-3">
				{#each tiers as tier, i (tier.copy.slug)}
					{@const showYearly = isYearly && tier.priceYearly !== null}
					{@const amount = showYearly ? (tier.priceYearly ?? 0) : tier.priceMonthly}
					<div class="animate-fade-up relative" style="animation-delay: {i * 100 + 100}ms">
						{#if tier.copy.highlighted}
							<div class="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
								<Badge class="gap-1 shadow-sm">
									<Sparkles class="size-3" />
									Most popular
								</Badge>
							</div>
						{/if}

						<Card.Root
							class="h-full transition-shadow hover:shadow-lg {tier.copy.highlighted
								? 'ring-2 ring-primary'
								: ''}"
						>
							<Card.Header class="space-y-0">
								<Card.Description>{tier.copy.tagline}</Card.Description>
								<Card.Title class="mt-1 text-xl">{tier.copy.name}</Card.Title>
							</Card.Header>

							<Card.Content class="pt-4">
								<div class="flex items-baseline gap-1.5">
									<span class="font-display text-5xl tabular-nums">
										{amount === 0 ? 'Free' : money(amount, tier.currency)}
									</span>
									{#if amount > 0}
										<span class="text-sm text-muted-foreground"
											>/{showYearly ? 'year' : 'month'}</span
										>
									{/if}
								</div>

								{#if showYearly && tier.priceYearly !== null && tier.priceYearly > 0}
									<p class="mt-1 text-xs text-muted-foreground tabular-nums">
										{money(Math.round(tier.priceYearly / 12), tier.currency)}/mo billed annually{tier.yearlySavingPct
											? ` — ${tier.yearlySavingPct}% off monthly`
											: ''}
									</p>
								{:else if isYearly && tier.priceYearly === null && tier.priceMonthly > 0}
									<p class="mt-1 text-xs text-muted-foreground">
										No annual price for this plan — billed monthly.
									</p>
								{/if}

								<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
									{tier.copy.audience}
								</p>

								<Button
									href={tier.copy.href}
									class="mt-6 w-full"
									variant={tier.copy.highlighted ? 'default' : 'outline'}
								>
									{tier.copy.cta}
									<ArrowRight class="ml-1 size-4" />
								</Button>

								<Separator class="my-6" />

								<dl class="grid grid-cols-3 gap-2 text-center">
									<div>
										<dt class="text-xs text-muted-foreground">Outlets</dt>
										<dd class="mt-0.5 text-sm font-medium tabular-nums">
											{limit(tier.maxLocations)}
										</dd>
									</div>
									<div>
										<dt class="text-xs text-muted-foreground">Team</dt>
										<dd class="mt-0.5 text-sm font-medium tabular-nums">
											{limit(tier.maxTeamMembers)}
										</dd>
									</div>
									<div>
										<dt class="text-xs text-muted-foreground">Orders/mo</dt>
										<dd class="mt-0.5 text-sm font-medium tabular-nums">
											{limit(tier.maxOrdersPerMonth)}
										</dd>
									</div>
								</dl>

								<Separator class="my-6" />

								<ul class="space-y-3">
									{#each tier.copy.highlights as highlight (highlight)}
										<li class="flex items-start gap-2.5 text-sm">
											<Check class="mt-0.5 size-4 shrink-0 text-primary" />
											<span>{highlight}</span>
										</li>
									{/each}
								</ul>
							</Card.Content>
						</Card.Root>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Modules -->
	<section class="border-y bg-muted/20 py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<p class="text-sm font-semibold tracking-wider text-primary uppercase">Modules</p>
				<h2 class="font-display mt-3 text-3xl md:text-4xl">
					Build the system your shop <span class="italic">actually</span> runs
				</h2>
				<p class="mt-4 text-muted-foreground">
					Switch a module on when you need it, off when you don't — billing stops at the end of the
					period and your data stays. Prices below are {BILLING_SCOPE} per month.
				</p>
			</div>

			<!-- Always included -->
			<Card.Root class="mt-12 bg-card">
				<Card.Header class="space-y-0">
					<div class="flex items-center gap-2">
						<Store class="size-4 text-primary" />
						<Card.Title class="text-base">Included in every plan, always</Card.Title>
					</div>
					<Card.Description class="mt-1">
						The parts you cannot run a counter without. Never billed separately, on every tier.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 sm:grid-cols-3">
						{#each CORE_MODULES as module (module.slug)}
							<div class="flex items-start gap-2.5">
								<Check class="mt-0.5 size-4 shrink-0 text-success" />
								<div class="min-w-0">
									<p class="text-sm font-medium">{module.name}</p>
									<p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
										{module.description}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Add-on modules by group -->
			<div class="mt-12 space-y-10">
				{#each MODULE_GROUPS as group (group)}
					{@const modules = addonsInGroup(group)}
					{#if modules.length > 0}
						<div>
							<div class="flex items-center gap-3">
								<h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
									{MODULE_GROUP_LABELS[group]}
								</h3>
								<div class="h-px flex-1 bg-border"></div>
							</div>

							<div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each modules as module (module.slug)}
									<Card.Root class="h-full gap-0 p-5 transition-shadow hover:shadow-md">
										<div class="flex items-start justify-between gap-3">
											<p class="text-sm font-semibold">{module.name}</p>
											{#if module.addOnMonthly === null}
												<Badge variant="outline" class="shrink-0 gap-1">
													<Lock class="size-3" />
													{tierName(module.minimumTier)} only
												</Badge>
											{:else if module.addOnMonthly === 0}
												<Badge variant="secondary" class="shrink-0">Included</Badge>
											{:else}
												<span class="shrink-0 text-right">
													<span class="text-base font-semibold tabular-nums"
														>₹{module.addOnMonthly.toLocaleString('en-IN')}</span
													>
													<span class="block text-[11px] leading-tight text-muted-foreground">
														{BILLING_SCOPE}/month
													</span>
												</span>
											{/if}
										</div>

										<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
											{module.description}
										</p>

										{#if module.addOnMonthly === null}
											<p class="mt-3 text-xs text-muted-foreground">
												Not sold on its own — comes with {tierName(module.minimumTier)}.
											</p>
										{/if}

										{#if module.dependsOn?.length}
											<p class="mt-3 text-xs text-muted-foreground">
												Needs {dependencyNames(module.dependsOn)}
											</p>
										{/if}
									</Card.Root>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<p
				class="mx-auto mt-10 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-muted-foreground"
			>
				<Blocks class="mt-0.5 size-3.5 shrink-0" />
				<span>
					Modules are enabled per outlet, so each location only pays for the modules it uses. All
					prices are exclusive of GST.
				</span>
			</p>
		</div>
	</section>

	<!-- Comparison -->
	<section class="py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="font-display text-3xl md:text-4xl">What differs between plans</h2>
				<p class="mt-3 text-muted-foreground">
					Only the things that genuinely change tier to tier — the module catalogue above is open to
					everyone.
				</p>
			</div>

			<!-- Desktop -->
			<div class="mt-12 hidden md:block">
				<Table.Root class="text-sm">
					<Table.Header>
						<Table.Row>
							<Table.Head class="text-left font-medium text-muted-foreground">Feature</Table.Head>
							{#each COMPARE_COLUMNS as col (col.key)}
								<Table.Head
									class="text-center font-semibold {col.highlighted ? 'text-primary' : ''}"
								>
									{col.name}
								</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each comparisonRows as row (row.label)}
							<Table.Row>
								<Table.Cell class="py-3.5 font-medium">{row.label}</Table.Cell>
								{#each COMPARE_COLUMNS as col (col.key)}
									{@const value = cell(row, col.key)}
									<Table.Cell class="py-3.5 text-center">
										{#if value === true}
											<Check class="mx-auto size-4 text-primary" />
										{:else if value === false}
											<X class="mx-auto size-4 text-muted-foreground/30" />
										{:else}
											<span class="tabular-nums {col.highlighted ? 'font-medium' : ''}"
												>{value}</span
											>
										{/if}
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Mobile -->
			<div class="mt-12 md:hidden">
				<Accordion.Root type="multiple">
					{#each COMPARE_COLUMNS as col (col.key)}
						<Accordion.Item value={col.key}>
							<Accordion.Trigger>{col.name}</Accordion.Trigger>
							<Accordion.Content>
								<ul class="space-y-2.5">
									{#each comparisonRows as row (row.label)}
										{@const value = cell(row, col.key)}
										<li class="flex items-center justify-between gap-4 text-sm">
											<span class="text-muted-foreground">{row.label}</span>
											{#if value === true}
												<Check class="size-4 shrink-0 text-primary" />
											{:else if value === false}
												<X class="size-4 shrink-0 text-muted-foreground/30" />
											{:else}
												<span class="font-medium tabular-nums">{value}</span>
											{/if}
										</li>
									{/each}
								</ul>
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			</div>
		</div>
	</section>

	<!-- FAQ -->
	<section class="border-t bg-muted/20 py-24">
		<div class="mx-auto max-w-3xl px-6 lg:px-8">
			<div class="text-center">
				<h2 class="font-display text-3xl md:text-4xl">Frequently asked questions</h2>
				<p class="mt-3 text-muted-foreground">
					How the modules, the billing and the fine print actually work.
				</p>
			</div>

			<div class="mt-12">
				<Accordion.Root type="single">
					{#each PRICING_FAQ as faq, i (faq.q)}
						<Accordion.Item value="faq-{i}">
							<Accordion.Trigger class="text-left">{faq.q}</Accordion.Trigger>
							<Accordion.Content>
								<p class="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			</div>
		</div>
	</section>

	<!-- Closing CTA -->
	<section class="py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="rounded-2xl border bg-muted/30 px-8 py-14 text-center">
				<h2 class="font-display text-2xl md:text-3xl">Start on the free plan today</h2>
				<p class="mx-auto mt-3 max-w-xl text-muted-foreground">
					Run real sales through it before you pay for anything. Add modules the day you need them,
					not before.
				</p>
				<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button href="/register" size="lg" class="px-8">
						Start free
						<ArrowRight class="ml-1.5 size-4" />
					</Button>
					<Button href="/contact" variant="outline" size="lg" class="px-8">Talk to us</Button>
				</div>
			</div>
		</div>
	</section>
</div>
