<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import DashboardImage from '$lib/assets/dashboard.png';

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

	const features = [
		{
			icon: ShoppingCart,
			title: 'Point of Sale',
			description:
				'Fast, intuitive billing with touch-friendly interface. Process orders, split bills, and handle multiple payment methods effortlessly.'
		},
		{
			icon: Package,
			title: 'Inventory Management',
			description:
				'Track stock in real-time, set low-stock alerts, manage suppliers, and automate reordering. Never run out of essentials again.'
		},
		{
			icon: Users,
			title: 'Staff Management',
			description:
				'Role-based access control, attendance tracking, and performance analytics. Manage your team with granular permissions.'
		},
		{
			icon: BarChart3,
			title: 'Analytics & Reports',
			description:
				'Real-time dashboards with sales trends, revenue breakdowns, and actionable insights. Make data-driven decisions.'
		},
		{
			icon: Building2,
			title: 'Multi-Location',
			description:
				'Manage multiple branches from a single dashboard. Centralized menu, pricing, and reporting across all locations.'
		},
		{
			icon: CreditCard,
			title: 'Payments & Billing',
			description:
				'Accept UPI, cards, cash, and digital wallets. Automatic GST calculation and invoice generation for every transaction.'
		}
	];

	const businessTypes = [
		{
			icon: UtensilsCrossed,
			name: 'Restaurant',
			features: ['Table management', 'KOT printing', 'Menu customization']
		},
		{
			icon: Coffee,
			name: 'Cafe',
			features: ['Quick billing', 'Combo offers', 'Loyalty programs']
		},
		{
			icon: Scissors,
			name: 'Salon',
			features: ['Appointment booking', 'Stylist tracking', 'Package deals']
		},
		{
			icon: Sparkles,
			name: 'Spa',
			features: ['Service scheduling', 'Therapist management', 'Membership plans']
		},
		{
			icon: Dumbbell,
			name: 'Gym',
			features: ['Member management', 'Subscription billing', 'Trainer scheduling']
		},
		{
			icon: Stethoscope,
			name: 'Clinic',
			features: ['Patient records', 'Appointment slots', 'Prescription tracking']
		},
		{
			icon: Hotel,
			name: 'Hotel',
			features: ['Room management', 'Check-in/out', 'Room service integration']
		}
	];

	const testimonials = [
		{
			name: 'Rajesh Kumar',
			role: 'Owner, Spice Garden Restaurant',
			content:
				'POS Platform transformed how we manage our restaurant. Table management and KOT printing have reduced our order errors by 80%.',
			rating: 5
		},
		{
			name: 'Priya Sharma',
			role: 'Manager, GlowUp Salon',
			content:
				'The appointment booking and staff management features are fantastic. Our no-show rate dropped significantly since we started using it.',
			rating: 5
		},
		{
			name: 'Amit Patel',
			role: 'Owner, FitLife Gym Chain',
			content:
				'Managing 3 branches from one dashboard is a game-changer. The multi-location support and subscription billing work seamlessly.',
			rating: 5
		}
	];

	const stats = [
		{ value: '7+', label: 'Business Types' },
		{ value: '50+', label: 'Features' },
		{ value: '99.9%', label: 'Uptime' },
		{ value: '24/7', label: 'Support' }
	];
</script>

<svelte:head>
	<title>POS Platform - The All-in-One Point of Sale for Every Business</title>
	<meta
		name="description"
		content="Modern POS and business management platform for restaurants, salons, gyms, clinics, and more. Built for Indian businesses with UPI, GST, and multi-location support."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden bg-background pt-24 lg:pt-32">
	<div
		aria-hidden="true"
		class="absolute inset-0 isolate z-0 hidden opacity-50 contain-strict lg:block"
	>
		<div
			class="absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]"
		></div>
		<div
			class="absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]"
		></div>
	</div>

	<div class="relative z-10 mx-auto max-w-6xl px-6 pb-16">
		<div class="mx-auto max-w-3xl text-center">
			<Badge variant="secondary" class="mb-6">Now with UPI & GST Support</Badge>
			<h1 class="text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
				The All-in-One POS Platform for Every Business
			</h1>
			<p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
				Streamline billing, inventory, staff management, and analytics — all from one powerful
				platform. Built for restaurants, salons, gyms, clinics, and more.
			</p>
			<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button href="/register" size="lg">
					Get Started Free
					<ArrowRight class="ml-1 size-4" />
				</Button>
				<Button href="/pricing" variant="outline" size="lg">View Pricing</Button>
			</div>
		</div>
	</div>

	<!-- Dashboard Screenshot -->
	<div class="mx-auto -mt-4 max-w-7xl">
		<div class="-mr-16 pl-16 perspective-distant lg:-mr-56 lg:pl-56">
			<div class="[transform:rotateX(20deg);]">
				<div class="relative skew-x-[.36rad] lg:h-176">
					<div
						aria-hidden="true"
						class="absolute -inset-16 z-1 bg-linear-to-b from-background via-transparent to-background sm:-inset-32"
					></div>
					<div
						aria-hidden="true"
						class="absolute -inset-16 z-1 bg-background/50 bg-linear-to-r from-background via-transparent to-background sm:-inset-32 dark:bg-transparent"
					></div>
					<div
						aria-hidden="true"
						class="absolute -inset-16 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[24px_24px] [--color-border:var(--color-zinc-400)] sm:-inset-32 dark:[--color-border:color-mix(in_oklab,var(--color-white)_20%,transparent)]"
					></div>
					<div
						aria-hidden="true"
						class="absolute inset-0 z-11 bg-linear-to-l from-background"
					></div>
					<div
						aria-hidden="true"
						class="absolute inset-0 z-2 size-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,transparent_40%,var(--color-background)_100%)]"
					></div>

					<img
						class="relative z-1 rounded border dark:hidden"
						src={DashboardImage}
						alt="POS Platform Dashboard"
						width={2880}
						height={2074}
					/>
					<img
						class="relative z-1 hidden rounded border dark:block"
						src={DashboardImage}
						alt="POS Platform Dashboard"
						width={2880}
						height={2074}
					/>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Social Proof Strip -->
<section class="relative z-10 border-y bg-muted/30 py-12">
	<div class="mx-auto max-w-6xl px-6">
		<p class="mb-8 text-center text-sm font-medium text-muted-foreground">
			Trusted by businesses across India
		</p>
		<div class="grid grid-cols-2 gap-8 md:grid-cols-4">
			{#each stats as stat}
				<div class="text-center">
					<p class="text-3xl font-bold text-foreground">{stat.value}</p>
					<p class="mt-1 text-sm text-muted-foreground">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Features Grid -->
<section id="features" class="scroll-mt-20 py-20">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mx-auto mb-12 max-w-2xl text-center">
			<Badge variant="outline" class="mb-4">Features</Badge>
			<h2 class="text-3xl font-bold tracking-tight md:text-4xl">
				Everything You Need to Run Your Business
			</h2>
			<p class="mt-4 text-lg text-muted-foreground">
				Powerful tools designed to simplify your daily operations and boost your bottom line.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header>
						<div
							class="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<feature.icon class="size-5" />
						</div>
						<Card.Title>{feature.title}</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">{feature.description}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>
</section>

<!-- Business Types -->
<section class="border-y bg-muted/30 py-20">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mx-auto mb-12 max-w-2xl text-center">
			<Badge variant="outline" class="mb-4">Built for You</Badge>
			<h2 class="text-3xl font-bold tracking-tight md:text-4xl">One Platform, Every Business</h2>
			<p class="mt-4 text-lg text-muted-foreground">
				Whether you run a restaurant, salon, or gym — POS Platform adapts to your workflow.
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
			{#each businessTypes as biz}
				<Card.Root class="text-center transition-shadow hover:shadow-md">
					<Card.Header class="items-center pb-2">
						<div
							class="mb-1 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<biz.icon class="size-6" />
						</div>
						<Card.Title class="text-base">{biz.name}</Card.Title>
					</Card.Header>
					<Card.Content>
						<ul class="space-y-1 text-sm text-muted-foreground">
							{#each biz.features as feat}
								<li class="flex items-center justify-center gap-1.5">
									<Check class="size-3.5 text-primary" />
									{feat}
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>
</section>

<!-- Testimonials -->
<section class="py-20">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mx-auto mb-12 max-w-2xl text-center">
			<Badge variant="outline" class="mb-4">Testimonials</Badge>
			<h2 class="text-3xl font-bold tracking-tight md:text-4xl">Loved by Business Owners</h2>
			<p class="mt-4 text-lg text-muted-foreground">
				See what our customers have to say about POS Platform.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-3">
			{#each testimonials as testimonial}
				<Card.Root class="relative">
					<Card.Header>
						<Quote class="size-8 text-primary/20" />
						<div class="mt-2 flex gap-0.5">
							{#each Array(testimonial.rating) as _}
								<Star class="size-4 fill-primary text-primary" />
							{/each}
						</div>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">"{testimonial.content}"</p>
					</Card.Content>
					<Card.Footer>
						<div>
							<p class="text-sm font-medium">{testimonial.name}</p>
							<p class="text-xs text-muted-foreground">{testimonial.role}</p>
						</div>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>
</section>

<!-- CTA Banner -->
<section class="border-t bg-primary py-20 text-primary-foreground">
	<div class="mx-auto max-w-6xl px-6 text-center">
		<h2 class="text-3xl font-bold tracking-tight md:text-4xl">
			Ready to Transform Your Business?
		</h2>
		<p class="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
			Join thousands of businesses across India that trust POS Platform to power their daily
			operations.
		</p>
		<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
			<Button href="/register" size="lg" variant="secondary">
				Get Started Free
				<ArrowRight class="ml-1 size-4" />
			</Button>
			<Button
				href="/contact"
				size="lg"
				variant="outline"
				class="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
			>
				Contact Sales
			</Button>
		</div>
	</div>
</section>
