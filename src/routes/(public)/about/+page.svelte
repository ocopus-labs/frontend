<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Globe from '@lucide/svelte/icons/globe';
	import Shield from '@lucide/svelte/icons/shield';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Heart from '@lucide/svelte/icons/heart';
	import Target from '@lucide/svelte/icons/target';

	const values = [
		{
			icon: Lightbulb,
			title: 'Simplicity',
			description:
				'We believe powerful software does not have to be complicated. Every feature is designed to be intuitive and easy to use from day one.'
		},
		{
			icon: Globe,
			title: 'Built for India',
			description:
				'From UPI payments to GST compliance, multilingual support to regional preferences — we build for Indian businesses first.'
		},
		{
			icon: Shield,
			title: 'Security First',
			description:
				'Your business data is sacred. We use industry-leading encryption, role-based access, and regular security audits to keep it safe.'
		},
		{
			icon: TrendingUp,
			title: 'Scalability',
			description:
				'Whether you run one shop or a hundred, our platform grows with you. From solo operators to franchise chains, we have got you covered.'
		}
	];

	const stats = [
		{ value: '7+', label: 'Business Types Supported' },
		{ value: '50+', label: 'Features Built' },
		{ value: 'Open', label: 'Source Architecture' }
	];
</script>

<svelte:head>
	<title>About - POS Platform</title>
	<meta
		name="description"
		content="Learn about POS Platform's mission to empower Indian businesses with modern, affordable POS technology."
	/>
</svelte:head>

<div class="pt-24 lg:pt-28">
	<!-- Mission Hero -->
	<section class="pb-16">
		<div class="mx-auto max-w-6xl px-6">
			<div class="mx-auto max-w-3xl text-center">
				<Badge variant="secondary" class="mb-4">About Us</Badge>
				<h1 class="text-4xl font-bold tracking-tight md:text-5xl">
					Empowering Businesses with Modern POS Technology
				</h1>
				<p class="mt-6 text-lg text-muted-foreground">
					We are on a mission to give every Indian business — from a street-side cafe to a
					multi-city franchise — access to world-class point of sale and business management tools,
					without the enterprise price tag.
				</p>
			</div>
		</div>
	</section>

	<!-- Story Section -->
	<section class="border-y bg-muted/30 py-20">
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div>
					<h2 class="text-3xl font-bold tracking-tight">Our Story</h2>
					<div class="mt-6 space-y-4 text-muted-foreground">
						<p>
							POS Platform was born from a simple observation: small and mid-sized businesses in
							India were either stuck with outdated cash registers or forced to pay exorbitant fees
							for enterprise software that was not built for their needs.
						</p>
						<p>
							We set out to change that. Our team of developers and business owners came together to
							build a platform that combines the power of enterprise POS systems with the simplicity
							and affordability that small businesses deserve.
						</p>
						<p>
							Today, POS Platform supports restaurants, salons, gyms, clinics, and more — all from a
							single, unified platform that adapts to each business type's unique workflow.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-center">
					<div
						class="flex aspect-square w-full max-w-md items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
					>
						<div class="text-center">
							<Target class="mx-auto size-16 text-primary/60" />
							<p class="mt-4 text-lg font-medium text-foreground">Built with Purpose</p>
							<p class="mt-1 text-sm text-muted-foreground">For Indian Businesses</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Values Grid -->
	<section class="py-20">
		<div class="mx-auto max-w-6xl px-6">
			<div class="mx-auto mb-12 max-w-2xl text-center">
				<Badge variant="outline" class="mb-4">Our Values</Badge>
				<h2 class="text-3xl font-bold tracking-tight">What Drives Us</h2>
				<p class="mt-4 text-muted-foreground">
					These principles guide every decision we make, from product design to customer support.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				{#each values as value}
					<Card.Root class="transition-shadow hover:shadow-md">
						<Card.Header>
							<div
								class="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
							>
								<value.icon class="size-5" />
							</div>
							<Card.Title>{value.title}</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="text-sm text-muted-foreground">{value.description}</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	</section>

	<!-- Stats Bar -->
	<section class="border-y bg-muted/30 py-12">
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid grid-cols-1 gap-8 sm:grid-cols-3">
				{#each stats as stat}
					<div class="text-center">
						<p class="text-3xl font-bold text-foreground">{stat.value}</p>
						<p class="mt-1 text-sm text-muted-foreground">{stat.label}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-20">
		<div class="mx-auto max-w-6xl px-6 text-center">
			<Heart class="mx-auto mb-4 size-10 text-primary/60" />
			<h2 class="text-3xl font-bold tracking-tight">Join the Community</h2>
			<p class="mx-auto mt-4 max-w-xl text-muted-foreground">
				Be part of a growing community of business owners who are modernizing their operations with
				POS Platform.
			</p>
			<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button href="/register" size="lg">
					Get Started Free
					<ArrowRight class="ml-1 size-4" />
				</Button>
				<Button href="/contact" variant="outline" size="lg">Talk to Us</Button>
			</div>
		</div>
	</section>
</div>
