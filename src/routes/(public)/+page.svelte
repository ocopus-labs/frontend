<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import DashboardImage from '$lib/assets/dashboard.png';
	import { APP_NAME } from '$lib/constants/config';

	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Package from '@lucide/svelte/icons/package';
	import Users from '@lucide/svelte/icons/users';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import Hotel from '@lucide/svelte/icons/hotel';
	import Star from '@lucide/svelte/icons/star';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Quote from '@lucide/svelte/icons/quote';
	import Zap from '@lucide/svelte/icons/zap';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import Shield from '@lucide/svelte/icons/shield';
	import Clock from '@lucide/svelte/icons/clock';

	const features = [
		{
			icon: ShoppingCart,
			title: 'Point of Sale',
			description:
				'Fast, intuitive billing with touch-friendly interface. Process orders, split bills, and handle multiple payment methods.'
		},
		{
			icon: Package,
			title: 'Inventory Management',
			description:
				'Track stock in real-time, set low-stock alerts, manage suppliers, and automate reordering across locations.'
		},
		{
			icon: Users,
			title: 'Staff Management',
			description:
				'Role-based access control, attendance tracking, and performance analytics. Granular permissions per branch.'
		},
		{
			icon: BarChart3,
			title: 'Analytics & Reports',
			description:
				'Real-time dashboards with sales trends, revenue breakdowns, and actionable insights for smarter decisions.'
		},
		{
			icon: Building2,
			title: 'Multi-Location',
			description:
				'Manage multiple branches from a single dashboard. Centralized menu, pricing, and reporting across all outlets.'
		},
		{
			icon: CreditCard,
			title: 'Payments & Billing',
			description:
				'Accept UPI, cards, cash, and digital wallets. Automatic GST calculation and invoice generation.'
		}
	];

	const businessTypes = [
		{ icon: UtensilsCrossed, name: 'Restaurant', desc: 'Table management & KOT' },
		{ icon: Coffee, name: 'Cafe', desc: 'Quick billing & combos' },
		{ icon: Scissors, name: 'Salon', desc: 'Appointments & packages' },
		{ icon: Sparkles, name: 'Spa', desc: 'Scheduling & memberships' },
		{ icon: Dumbbell, name: 'Gym', desc: 'Subscriptions & trainers' },
		{ icon: Stethoscope, name: 'Clinic', desc: 'Patient records & slots' },
		{ icon: Hotel, name: 'Hotel', desc: 'Room service & check-in' }
	];

	const testimonials = [
		{
			name: 'Rajesh Kumar',
			role: 'Spice Garden Restaurant, Mumbai',
			content:
				`${APP_NAME} transformed how we manage our restaurant. Table management and KOT printing have reduced our order errors by 80%.`,
			rating: 5
		},
		{
			name: 'Priya Sharma',
			role: 'GlowUp Salon, Delhi',
			content:
				'The appointment booking and staff management features are fantastic. Our no-show rate dropped significantly since we started using it.',
			rating: 5
		},
		{
			name: 'Amit Patel',
			role: 'FitLife Gym Chain, Bangalore',
			content:
				'Managing 3 branches from one dashboard is a game-changer. The multi-location support and subscription billing work seamlessly.',
			rating: 5
		}
	];

	const highlights = [
		{ icon: IndianRupee, label: 'UPI & GST Ready' },
		{ icon: Shield, label: 'Bank-grade Security' },
		{ icon: Clock, label: '99.9% Uptime' },
		{ icon: Zap, label: 'Real-time Sync' }
	];
</script>

<svelte:head>
	<title>{APP_NAME} — The All-in-One Point of Sale for Every Business</title>
	<meta
		name="description"
		content="Modern POS and business management platform for restaurants, salons, gyms, clinics, and more. Built for Indian businesses with UPI, GST, and multi-location support."
	/>
</svelte:head>

<!-- ============ HERO ============ -->
<section class="relative -z-10 overflow-hidden pt-28 lg:pt-36">
	<!-- Background decoration -->
	<div aria-hidden="true" class="absolute inset-0 -z-10">
		<div class="dot-grid absolute inset-0 opacity-40 dark:opacity-20"></div>
		<div
			class="absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/8 blur-3xl dark:bg-primary/5"
		></div>
		<div class="absolute top-1/4 right-0 h-64 w-64 rounded-full bg-primary/5 blur-2xl"></div>
	</div>

	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="mx-auto max-w-4xl text-center">
			<!-- Pill -->
			<div
				class="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm backdrop-blur-sm"
			>
				<span class="flex size-2 rounded-full bg-success"></span>
				<span class="text-muted-foreground">Now with UPI & GST Support</span>
			</div>

			<!-- Headline -->
			<h1
				class="animate-fade-up font-display text-5xl leading-[1.1] font-normal tracking-tight delay-100 md:text-6xl lg:text-7xl"
			>
				The POS platform that
				<span class="text-primary italic">grows</span> with your business
			</h1>

			<!-- Subheadline -->
			<p
				class="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground delay-200 md:text-xl"
			>
				Streamline billing, inventory, staff, and analytics from one beautiful dashboard. Built for
				restaurants, salons, gyms, clinics & more.
			</p>

			<!-- CTAs -->
			<div
				class="animate-fade-up mt-10 flex flex-col items-center justify-center gap-4 delay-300 sm:flex-row"
			>
				<Button href="/register" size="lg" class="px-8 text-base">
					Start for Free
					<ArrowRight class="ml-1.5 size-4" />
				</Button>
				<Button href="/pricing" variant="outline" size="lg" class="px-8 text-base"
					>View Pricing</Button
				>
			</div>

			<!-- Highlight pills -->
			<div
				class="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground delay-400"
			>
				{#each highlights as h}
					<span class="flex items-center gap-1.5">
						<h.icon class="size-4 text-primary" />
						{h.label}
					</span>
				{/each}
			</div>
		</div>
	</div>

	<!-- Dashboard Screenshot with perspective -->
	<div class="animate-scale-in mx-auto mt-16 max-w-7xl px-6 delay-500 lg:px-8">
		<div class="relative overflow-hidden rounded-xl border bg-muted/30 p-2 shadow-2xl">
			<div class="overflow-hidden rounded-lg">
				<img
					class="w-full"
					src={DashboardImage}
					alt="{APP_NAME} Dashboard showing sales analytics and order management"
					width={2880}
					height={2074}
				/>
			</div>
			<!-- Gradient overlay at bottom -->
			<div
				aria-hidden="true"
				class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 to-transparent"
			></div>
		</div>
	</div>
</section>

<!-- ============ SOCIAL PROOF ============ -->
<section class="relative z-10 py-20">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each [{ value: '7+', label: 'Business Types', suffix: '' }, { value: '50+', label: 'Built-in Features', suffix: '' }, { value: '99.9%', label: 'Platform Uptime', suffix: '' }, { value: '24/7', label: 'Customer Support', suffix: '' }] as stat, i}
				<div
					class="animate-fade-up rounded-xl border bg-card p-6 text-center transition-shadow hover:shadow-md"
					style="animation-delay: {i * 100 + 200}ms"
				>
					<p class="font-display text-3xl text-foreground md:text-4xl">{stat.value}</p>
					<p class="mt-1 text-sm text-muted-foreground">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ============ FEATURES ============ -->
<section id="features" class="scroll-mt-20 py-20">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<!-- Section header -->
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-sm font-semibold tracking-wider text-primary uppercase">Features</p>
			<h2 class="font-display mt-3 text-3xl md:text-4xl lg:text-5xl">
				Everything you need, <span class="italic">nothing you don't</span>
			</h2>
			<p class="mt-4 text-lg text-muted-foreground">
				Powerful tools designed to simplify your daily operations and boost your bottom line.
			</p>
		</div>

		<!-- Feature cards -->
		<div class="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature, i}
				<div
					class="group relative rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
				>
					<!-- Accent line -->
					<div
						class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
					></div>

					<div
						class="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<feature.icon class="size-5" />
					</div>
					<h3 class="text-lg font-semibold">{feature.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ============ BUSINESS TYPES ============ -->
<section class="relative overflow-hidden py-24">
	<!-- Background -->
	<div aria-hidden="true" class="absolute inset-0 -z-10 bg-muted/30"></div>
	<div
		aria-hidden="true"
		class="absolute top-1/2 left-0 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"
	></div>

	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-sm font-semibold tracking-wider text-primary uppercase">Built for you</p>
			<h2 class="font-display mt-3 text-3xl md:text-4xl lg:text-5xl">
				One platform, <span class="italic">every</span> business
			</h2>
			<p class="mt-4 text-lg text-muted-foreground">
				Whether you run a restaurant, salon, or gym — {APP_NAME} adapts to your workflow.
			</p>
		</div>

		<div class="mt-14 flex flex-wrap items-center justify-center gap-4">
			{#each businessTypes as biz, i}
				<div
					class="group flex items-center gap-3 rounded-full border bg-card px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
				>
					<div
						class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
					>
						<biz.icon class="size-4" />
					</div>
					<div>
						<p class="text-sm font-semibold">{biz.name}</p>
						<p class="text-xs text-muted-foreground">{biz.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ============ TESTIMONIALS ============ -->
<section class="py-24">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-sm font-semibold tracking-wider text-primary uppercase">Testimonials</p>
			<h2 class="font-display mt-3 text-3xl md:text-4xl lg:text-5xl">
				Loved by <span class="italic">business owners</span>
			</h2>
		</div>

		<div class="mt-14 grid gap-6 md:grid-cols-3">
			{#each testimonials as t, i}
				<div class="relative rounded-xl border bg-card p-6">
					<!-- Quote mark -->
					<Quote class="absolute top-6 right-6 size-8 text-primary/10" />

					<div class="flex gap-0.5">
						{#each Array(t.rating) as _}
							<Star class="size-4 fill-primary text-primary" />
						{/each}
					</div>
					<p class="mt-4 text-sm leading-relaxed text-muted-foreground">"{t.content}"</p>
					<Separator class="my-4" />
					<div>
						<p class="text-sm font-semibold">{t.name}</p>
						<p class="text-xs text-muted-foreground">{t.role}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ============ CTA BANNER ============ -->
<section class="relative overflow-hidden">
	<div class="mx-auto max-w-7xl px-6 py-4 lg:px-8">
		<div
			class="grain-overlay relative overflow-hidden rounded-2xl bg-primary px-8 py-20 text-primary-foreground"
		>
			<!-- Decorative circles -->
			<div
				aria-hidden="true"
				class="absolute -top-20 -right-20 size-64 rounded-full border border-primary-foreground/10"
			></div>
			<div
				aria-hidden="true"
				class="absolute -bottom-10 -left-10 size-40 rounded-full border border-primary-foreground/10"
			></div>

			<div class="relative z-10 mx-auto max-w-2xl text-center">
				<h2 class="font-display text-3xl md:text-4xl lg:text-5xl">
					Ready to transform your business?
				</h2>
				<p class="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/80">
					Join businesses across India that trust {APP_NAME} to power their daily operations.
				</p>
				<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button href="/register" size="lg" variant="secondary" class="px-8 text-base">
						Get Started Free
						<ArrowRight class="ml-1.5 size-4" />
					</Button>
					<Button
						href="/contact"
						size="lg"
						variant="outline"
						class="border-primary-foreground/30 px-8 text-base text-black hover:bg-primary-foreground/10"
					>
						Contact Sales
					</Button>
				</div>
			</div>
		</div>
	</div>
</section>
