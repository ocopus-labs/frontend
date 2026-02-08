<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Zap from '@lucide/svelte/icons/zap';

	let billingCycle: string = $state('monthly');
	let isYearly = $derived(billingCycle === 'yearly');

	const plans = [
		{
			name: 'Free',
			description: 'Perfect for getting started with a single location.',
			monthlyPrice: 0,
			yearlyPrice: 0,
			highlighted: false,
			cta: 'Get Started',
			ctaHref: '/register',
			features: [
				'1 business location',
				'Up to 50 menu items',
				'Basic POS billing',
				'Daily sales reports',
				'Email support',
				'1 staff account'
			]
		},
		{
			name: 'Pro',
			description: 'For growing businesses that need more power and flexibility.',
			monthlyPrice: 2499,
			yearlyPrice: 24990,
			highlighted: true,
			cta: 'Start Free Trial',
			ctaHref: '/register?plan=pro',
			features: [
				'Up to 3 locations',
				'Unlimited menu items',
				'Full POS with table management',
				'Inventory management',
				'Staff management & roles',
				'Advanced analytics',
				'KOT & receipt printing',
				'Priority email & chat support',
				'Up to 10 staff accounts'
			]
		},
		{
			name: 'Enterprise',
			description: 'For large operations and franchise chains.',
			monthlyPrice: 8499,
			yearlyPrice: 84990,
			highlighted: false,
			cta: 'Contact Sales',
			ctaHref: '/contact',
			features: [
				'Unlimited locations',
				'Unlimited menu items',
				'Everything in Pro',
				'Multi-location analytics',
				'Custom integrations',
				'Dedicated account manager',
				'API access',
				'SSO & advanced security',
				'Unlimited staff accounts',
				'SLA guarantee'
			]
		}
	];

	function formatPrice(price: number): string {
		if (price === 0) return '0';
		return price.toLocaleString('en-IN');
	}

	const comparisonFeatures = [
		{ name: 'Business Locations', free: '1', pro: 'Up to 3', enterprise: 'Unlimited' },
		{ name: 'Menu Items', free: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
		{ name: 'Staff Accounts', free: '1', pro: '10', enterprise: 'Unlimited' },
		{ name: 'POS Billing', free: true, pro: true, enterprise: true },
		{ name: 'Table Management', free: false, pro: true, enterprise: true },
		{ name: 'Inventory Management', free: false, pro: true, enterprise: true },
		{ name: 'Staff Roles & Permissions', free: false, pro: true, enterprise: true },
		{ name: 'KOT Printing', free: false, pro: true, enterprise: true },
		{ name: 'Advanced Analytics', free: false, pro: true, enterprise: true },
		{ name: 'Multi-location Dashboard', free: false, pro: false, enterprise: true },
		{ name: 'Custom Integrations', free: false, pro: false, enterprise: true },
		{ name: 'API Access', free: false, pro: false, enterprise: true },
		{ name: 'SSO', free: false, pro: false, enterprise: true },
		{ name: 'Dedicated Account Manager', free: false, pro: false, enterprise: true },
		{ name: 'SLA Guarantee', free: false, pro: false, enterprise: true }
	];

	const faqs = [
		{
			q: 'Can I try POS Platform for free?',
			a: 'Yes! Our Free plan is completely free forever with no credit card required. You can also start a 14-day free trial of the Pro plan to test all features.'
		},
		{
			q: 'What payment methods do you accept?',
			a: 'We accept all major credit/debit cards, UPI, net banking, and wallet payments through our secure payment gateway. Enterprise customers can also pay via invoice.'
		},
		{
			q: 'Can I switch plans later?',
			a: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you will be prorated for the remaining billing period. Downgrades take effect at the next billing cycle.'
		},
		{
			q: 'Is there a long-term contract?',
			a: 'No long-term contracts required. All plans are month-to-month (or yearly if you choose the annual discount). You can cancel anytime.'
		},
		{
			q: 'Do you offer discounts for yearly billing?',
			a: 'Yes! When you choose yearly billing, you get approximately 2 months free compared to monthly billing. The discount is automatically applied.'
		},
		{
			q: 'What happens to my data if I downgrade?',
			a: 'Your data is always safe. If you downgrade and exceed the limits of your new plan, existing data is preserved but you will not be able to add new items beyond the plan limits.'
		},
		{
			q: 'Do you offer custom pricing for large chains?',
			a: 'Yes! For businesses with more than 10 locations or special requirements, contact our sales team for a custom quote tailored to your needs.'
		},
		{
			q: 'Is GST included in the pricing?',
			a: 'The prices shown are exclusive of GST. Applicable GST (18%) will be added during checkout as per Indian tax regulations.'
		}
	];
</script>

<svelte:head>
	<title>Pricing - POS Platform</title>
	<meta
		name="description"
		content="Simple, transparent pricing for POS Platform. Free plan available. Pro and Enterprise plans for growing businesses."
	/>
</svelte:head>

<div class="pt-24 lg:pt-28">
	<!-- Header -->
	<section class="pb-12">
		<div class="mx-auto max-w-6xl px-6 text-center">
			<Badge variant="secondary" class="mb-4">Pricing</Badge>
			<h1 class="text-4xl font-bold tracking-tight md:text-5xl">Simple, Transparent Pricing</h1>
			<p class="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
				Start free and scale as you grow. No hidden fees, no surprises.
			</p>

			<div class="mt-8 flex justify-center">
				<Tabs.Root bind:value={billingCycle}>
					<Tabs.List>
						<Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
						<Tabs.Trigger value="yearly">
							Yearly
							<Badge variant="secondary" class="ml-2 text-xs">Save ~17%</Badge>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
		</div>
	</section>

	<!-- Pricing Cards -->
	<section class="pb-20">
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid gap-6 md:grid-cols-3">
				{#each plans as plan}
					<Card.Root
						class="relative flex flex-col {plan.highlighted
							? 'border-primary shadow-lg ring-1 ring-primary'
							: ''}"
					>
						{#if plan.highlighted}
							<div class="absolute -top-3 left-1/2 -translate-x-1/2">
								<Badge class="gap-1">
									<Zap class="size-3" />
									Most Popular
								</Badge>
							</div>
						{/if}
						<Card.Header>
							<Card.Title class="text-xl">{plan.name}</Card.Title>
							<Card.Description>{plan.description}</Card.Description>
							<div class="mt-4">
								<span class="text-4xl font-bold"
									>&#8377;{formatPrice(isYearly ? plan.yearlyPrice : plan.monthlyPrice)}</span
								>
								<span class="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
							</div>
							{#if isYearly && plan.monthlyPrice > 0}
								<p class="text-sm text-muted-foreground">
									&#8377;{formatPrice(Math.round(plan.yearlyPrice / 12))}/month billed annually
								</p>
							{/if}
						</Card.Header>
						<Card.Content class="flex-1">
							<Button
								href={plan.ctaHref}
								class="w-full"
								variant={plan.highlighted ? 'default' : 'outline'}
							>
								{plan.cta}
								<ArrowRight class="ml-1 size-4" />
							</Button>
							<Separator class="my-6" />
							<ul class="space-y-3">
								{#each plan.features as feature}
									<li class="flex items-start gap-2 text-sm">
										<Check class="mt-0.5 size-4 shrink-0 text-primary" />
										<span>{feature}</span>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	</section>

	<!-- Feature Comparison Table -->
	<section class="border-y bg-muted/30 py-20">
		<div class="mx-auto max-w-6xl px-6">
			<h2 class="mb-8 text-center text-2xl font-bold tracking-tight">Compare Plans</h2>

			<!-- Desktop Table -->
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b">
							<th class="py-3 pr-4 text-left font-medium text-muted-foreground">Feature</th>
							<th class="px-4 py-3 text-center font-medium">Free</th>
							<th class="px-4 py-3 text-center font-medium">Pro</th>
							<th class="px-4 py-3 text-center font-medium">Enterprise</th>
						</tr>
					</thead>
					<tbody>
						{#each comparisonFeatures as feature}
							<tr class="border-b last:border-0">
								<td class="py-3 pr-4">{feature.name}</td>
								<td class="px-4 py-3 text-center">
									{#if typeof feature.free === 'boolean'}
										{#if feature.free}
											<Check class="mx-auto size-4 text-primary" />
										{:else}
											<X class="mx-auto size-4 text-muted-foreground/40" />
										{/if}
									{:else}
										{feature.free}
									{/if}
								</td>
								<td class="px-4 py-3 text-center">
									{#if typeof feature.pro === 'boolean'}
										{#if feature.pro}
											<Check class="mx-auto size-4 text-primary" />
										{:else}
											<X class="mx-auto size-4 text-muted-foreground/40" />
										{/if}
									{:else}
										{feature.pro}
									{/if}
								</td>
								<td class="px-4 py-3 text-center">
									{#if typeof feature.enterprise === 'boolean'}
										{#if feature.enterprise}
											<Check class="mx-auto size-4 text-primary" />
										{:else}
											<X class="mx-auto size-4 text-muted-foreground/40" />
										{/if}
									{:else}
										{feature.enterprise}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Accordion -->
			<div class="md:hidden">
				<Accordion.Root type="multiple">
					{#each ['Free', 'Pro', 'Enterprise'] as planName}
						<Accordion.Item value={planName}>
							<Accordion.Trigger>{planName} Plan Features</Accordion.Trigger>
							<Accordion.Content>
								<ul class="space-y-2">
									{#each comparisonFeatures as feature}
										{@const value = planName === 'Free' ? feature.free : planName === 'Pro' ? feature.pro : feature.enterprise}
										<li class="flex items-center justify-between text-sm">
											<span>{feature.name}</span>
											{#if typeof value === 'boolean'}
												{#if value}
													<Check class="size-4 text-primary" />
												{:else}
													<X class="size-4 text-muted-foreground/40" />
												{/if}
											{:else}
												<span class="font-medium">{value}</span>
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
	<section class="py-20">
		<div class="mx-auto max-w-3xl px-6">
			<h2 class="mb-8 text-center text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
			<Accordion.Root type="single">
				{#each faqs as faq, i}
					<Accordion.Item value="faq-{i}">
						<Accordion.Trigger>{faq.q}</Accordion.Trigger>
						<Accordion.Content>
							<p class="text-sm text-muted-foreground">{faq.a}</p>
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		</div>
	</section>

	<!-- CTA -->
	<section class="border-t bg-muted/30 py-16">
		<div class="mx-auto max-w-6xl px-6 text-center">
			<h2 class="text-2xl font-bold tracking-tight">Not sure which plan is right for you?</h2>
			<p class="mt-2 text-muted-foreground">
				Our team can help you find the perfect plan for your business.
			</p>
			<div class="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button href="/contact" size="lg">
					Contact Our Team
					<ArrowRight class="ml-1 size-4" />
				</Button>
				<Button href="/register" variant="outline" size="lg">Start Free Trial</Button>
			</div>
		</div>
	</section>
</div>
