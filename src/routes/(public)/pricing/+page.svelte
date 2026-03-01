<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { APP_NAME } from '$lib/constants/config';

	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Zap from '@lucide/svelte/icons/zap';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let billingCycle: string = $state('monthly');
	let isYearly = $derived(billingCycle === 'yearly');

	const plans = [
		{
			name: 'Free',
			tagline: 'For getting started',
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
			tagline: 'For growing businesses',
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
				'Priority support',
				'Up to 10 staff accounts'
			]
		},
		{
			name: 'Enterprise',
			tagline: 'For large operations',
			monthlyPrice: 8499,
			yearlyPrice: 84990,
			highlighted: false,
			cta: 'Contact Sales',
			ctaHref: '/contact',
			features: [
				'Unlimited locations',
				'Unlimited everything',
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
			q: `Can I try ${APP_NAME} for free?`,
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
			a: 'Yes! When you choose yearly billing, you save approximately 2 months compared to monthly billing. The discount is automatically applied.'
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
	<title>Pricing — {APP_NAME}</title>
	<meta
		name="description"
		content="Simple, transparent pricing for {APP_NAME}. Free plan available. Pro and Enterprise plans for growing businesses."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<!-- Header -->
	<section class="relative pb-16">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 text-center lg:px-8">
			<p class="animate-fade-up text-sm font-semibold uppercase tracking-wider text-primary">
				Pricing
			</p>
			<h1
				class="animate-fade-up delay-100 mt-3 font-display text-4xl md:text-5xl lg:text-6xl"
			>
				Simple, <span class="italic">transparent</span> pricing
			</h1>
			<p class="animate-fade-up delay-200 mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
				Start free and scale as you grow. No hidden fees, no surprises.
			</p>

			<div class="animate-fade-up delay-300 mt-10 flex justify-center">
				<Tabs.Root bind:value={billingCycle}>
					<Tabs.List class="bg-muted/50">
						<Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
						<Tabs.Trigger value="yearly">
							Yearly
							<span
								class="ml-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
								>Save ~17%</span
							>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
		</div>
	</section>

	<!-- Pricing Cards -->
	<section class="pb-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="grid items-start gap-6 md:grid-cols-3">
				{#each plans as plan, i}
					<div
						class="animate-fade-up relative rounded-xl border bg-card transition-shadow hover:shadow-lg {plan.highlighted
							? 'border-primary ring-1 ring-primary'
							: ''}"
						style="animation-delay: {i * 100 + 100}ms"
					>
						{#if plan.highlighted}
							<div class="absolute -top-3 left-1/2 -translate-x-1/2">
								<span
									class="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
								>
									<Sparkles class="size-3" />
									Most Popular
								</span>
							</div>
						{/if}

						<div class="p-6 pb-0">
							<p class="text-sm font-medium text-muted-foreground">{plan.tagline}</p>
							<p class="mt-1 text-xl font-semibold">{plan.name}</p>

							<div class="mt-5">
								<span class="font-display text-5xl"
									>&#8377;{formatPrice(isYearly ? plan.yearlyPrice : plan.monthlyPrice)}</span
								>
								<span class="text-sm text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
							</div>
							{#if isYearly && plan.monthlyPrice > 0}
								<p class="mt-1 text-xs text-muted-foreground">
									&#8377;{formatPrice(Math.round(plan.yearlyPrice / 12))}/mo billed annually
								</p>
							{/if}

							<Button
								href={plan.ctaHref}
								class="mt-6 w-full"
								variant={plan.highlighted ? 'default' : 'outline'}
							>
								{plan.cta}
								<ArrowRight class="ml-1 size-4" />
							</Button>
						</div>

						<Separator class="my-6" />

						<ul class="space-y-3 px-6 pb-6">
							{#each plan.features as feature}
								<li class="flex items-start gap-2.5 text-sm">
									<Check class="mt-0.5 size-4 shrink-0 text-primary" />
									<span>{feature}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Feature Comparison Table -->
	<section class="border-y bg-muted/20 py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="font-display text-3xl md:text-4xl">Compare all features</h2>
				<p class="mt-3 text-muted-foreground">See exactly what's included in each plan.</p>
			</div>

			<!-- Desktop Table -->
			<div class="mt-12 hidden overflow-x-auto md:block">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b">
							<th class="pb-4 pr-6 text-left font-medium text-muted-foreground">Feature</th>
							<th class="px-6 pb-4 text-center font-semibold">Free</th>
							<th class="px-6 pb-4 text-center font-semibold text-primary">Pro</th>
							<th class="px-6 pb-4 text-center font-semibold">Enterprise</th>
						</tr>
					</thead>
					<tbody>
						{#each comparisonFeatures as feature}
							<tr class="border-b last:border-0">
								<td class="py-3.5 pr-6 font-medium">{feature.name}</td>
								<td class="px-6 py-3.5 text-center">
									{#if typeof feature.free === 'boolean'}
										{#if feature.free}
											<Check class="mx-auto size-4 text-primary" />
										{:else}
											<X class="mx-auto size-4 text-muted-foreground/30" />
										{/if}
									{:else}
										<span class="text-muted-foreground">{feature.free}</span>
									{/if}
								</td>
								<td class="px-6 py-3.5 text-center">
									{#if typeof feature.pro === 'boolean'}
										{#if feature.pro}
											<Check class="mx-auto size-4 text-primary" />
										{:else}
											<X class="mx-auto size-4 text-muted-foreground/30" />
										{/if}
									{:else}
										<span class="font-medium">{feature.pro}</span>
									{/if}
								</td>
								<td class="px-6 py-3.5 text-center">
									{#if typeof feature.enterprise === 'boolean'}
										{#if feature.enterprise}
											<Check class="mx-auto size-4 text-primary" />
										{:else}
											<X class="mx-auto size-4 text-muted-foreground/30" />
										{/if}
									{:else}
										<span class="font-medium">{feature.enterprise}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Accordion -->
			<div class="mt-12 md:hidden">
				<Accordion.Root type="multiple">
					{#each ['Free', 'Pro', 'Enterprise'] as planName}
						<Accordion.Item value={planName}>
							<Accordion.Trigger>{planName} Plan</Accordion.Trigger>
							<Accordion.Content>
								<ul class="space-y-2.5">
									{#each comparisonFeatures as feature}
										{@const value = planName === 'Free' ? feature.free : planName === 'Pro' ? feature.pro : feature.enterprise}
										<li class="flex items-center justify-between text-sm">
											<span class="text-muted-foreground">{feature.name}</span>
											{#if typeof value === 'boolean'}
												{#if value}
													<Check class="size-4 text-primary" />
												{:else}
													<X class="size-4 text-muted-foreground/30" />
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
	<section class="py-24">
		<div class="mx-auto max-w-3xl px-6 lg:px-8">
			<div class="text-center">
				<h2 class="font-display text-3xl md:text-4xl">Frequently asked questions</h2>
				<p class="mt-3 text-muted-foreground">
					Everything you need to know about our pricing and plans.
				</p>
			</div>

			<div class="mt-12">
				<Accordion.Root type="single">
					{#each faqs as faq, i}
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

	<!-- Bottom CTA -->
	<section class="pb-8">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div
				class="rounded-2xl border bg-muted/30 px-8 py-14 text-center"
			>
				<h2 class="font-display text-2xl md:text-3xl">Not sure which plan is right?</h2>
				<p class="mt-3 text-muted-foreground">
					Our team can help you find the perfect fit for your business.
				</p>
				<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button href="/contact" size="lg" class="px-8">
						Talk to Sales
						<ArrowRight class="ml-1.5 size-4" />
					</Button>
					<Button href="/register" variant="outline" size="lg" class="px-8"
						>Start Free Trial</Button
					>
				</div>
			</div>
		</div>
	</section>
</div>
