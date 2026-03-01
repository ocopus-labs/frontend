<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { APP_NAME } from '$lib/constants/config';

	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Globe from '@lucide/svelte/icons/globe';
	import Shield from '@lucide/svelte/icons/shield';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Heart from '@lucide/svelte/icons/heart';
	import Target from '@lucide/svelte/icons/target';
	import Users from '@lucide/svelte/icons/users';
	import Code from '@lucide/svelte/icons/code';

	const values = [
		{
			icon: Lightbulb,
			title: 'Simplicity',
			description:
				'We believe powerful software should feel effortless. Every feature is designed to be intuitive from day one — no training manuals needed.'
		},
		{
			icon: Globe,
			title: 'Built for India',
			description:
				'From UPI payments to GST compliance, multilingual support to regional preferences — we build for Indian businesses first, always.'
		},
		{
			icon: Shield,
			title: 'Security First',
			description:
				'Your business data is sacred. We use industry-leading encryption, role-based access, and regular security audits to keep everything safe.'
		},
		{
			icon: TrendingUp,
			title: 'Scalability',
			description:
				'Whether you run one shop or a hundred, our platform grows with you. From solo operators to franchise chains, we have got you covered.'
		}
	];

	const milestones = [
		{ year: '2024', event: `${APP_NAME} founded with a mission to democratize business software.` },
		{
			year: '2024',
			event: 'Launched beta with support for restaurants, salons, and gyms.'
		},
		{ year: '2025', event: 'Added multi-location support, inventory management, and UPI payments.' },
		{ year: '2025', event: 'Expanded to 7+ business types with KOT, appointments, and subscriptions.' }
	];
</script>

<svelte:head>
	<title>About — {APP_NAME}</title>
	<meta
		name="description"
		content="Learn about {APP_NAME}'s mission to empower Indian businesses with modern, affordable POS technology."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<!-- Hero -->
	<section class="relative pb-20">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
			<div
				class="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/5 blur-3xl"
			></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-3xl text-center">
				<p class="animate-fade-up text-sm font-semibold uppercase tracking-wider text-primary">
					About us
				</p>
				<h1
					class="animate-fade-up delay-100 mt-3 font-display text-4xl md:text-5xl lg:text-6xl"
				>
					Empowering businesses with <span class="italic">modern</span> POS technology
				</h1>
				<p class="animate-fade-up delay-200 mt-6 text-lg leading-relaxed text-muted-foreground">
					We are on a mission to give every Indian business — from a street-side cafe to a multi-city
					franchise — access to world-class point of sale tools, without the enterprise price tag.
				</p>
			</div>
		</div>
	</section>

	<!-- Story -->
	<section class="border-y bg-muted/20 py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="grid items-center gap-16 lg:grid-cols-2">
				<div>
					<p class="text-sm font-semibold uppercase tracking-wider text-primary">Our story</p>
					<h2 class="mt-3 font-display text-3xl md:text-4xl">
						Born from a <span class="italic">real</span> problem
					</h2>
					<div class="mt-6 space-y-4 text-muted-foreground leading-relaxed">
						<p>
							{APP_NAME} was born from a simple observation: small and mid-sized businesses in India
							were either stuck with outdated cash registers or forced to pay exorbitant fees for
							enterprise software that wasn't built for their needs.
						</p>
						<p>
							We set out to change that. Our team of developers and business owners came together to
							build a platform that combines the power of enterprise POS systems with the simplicity
							and affordability that small businesses deserve.
						</p>
						<p>
							Today, {APP_NAME} supports restaurants, salons, gyms, clinics, and more — all from a
							single, unified platform that adapts to each business type's unique workflow.
						</p>
					</div>
				</div>

				<!-- Visual: Timeline -->
				<div class="relative">
					<div class="absolute left-4 top-0 bottom-0 w-px bg-border"></div>
					<div class="space-y-8">
						{#each milestones as m, i}
							<div class="relative pl-12">
								<div
									class="absolute left-2 top-1 flex size-5 items-center justify-center rounded-full border bg-background"
								>
									<div class="size-2 rounded-full bg-primary"></div>
								</div>
								<p class="text-xs font-semibold uppercase tracking-wider text-primary">{m.year}</p>
								<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{m.event}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Values -->
	<section class="py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<p class="text-sm font-semibold uppercase tracking-wider text-primary">Our values</p>
				<h2 class="mt-3 font-display text-3xl md:text-4xl">
					What <span class="italic">drives</span> us
				</h2>
				<p class="mt-4 text-muted-foreground">
					These principles guide every decision we make, from product design to customer support.
				</p>
			</div>

			<div class="mt-14 grid gap-6 md:grid-cols-2">
				{#each values as value, i}
					<div
						class="group rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
					>
						<div
							class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
						></div>
						<div
							class="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<value.icon class="size-5" />
						</div>
						<h3 class="text-lg font-semibold">{value.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Stats -->
	<section class="border-y bg-muted/20 py-16">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="grid grid-cols-2 gap-8 md:grid-cols-4">
				{#each [{ value: '7+', label: 'Business Types' }, { value: '50+', label: 'Features Built' }, { value: 'Open', label: 'Source Architecture' }, { value: '100%', label: 'Indian-made' }] as stat}
					<div class="text-center">
						<p class="font-display text-3xl md:text-4xl">{stat.value}</p>
						<p class="mt-1 text-sm text-muted-foreground">{stat.label}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div
				class="grain-overlay relative overflow-hidden rounded-2xl bg-primary px-8 py-20 text-center text-primary-foreground"
			>
				<div
					aria-hidden="true"
					class="absolute -right-20 -top-20 size-64 rounded-full border border-primary-foreground/10"
				></div>
				<div
					aria-hidden="true"
					class="absolute -bottom-10 -left-10 size-40 rounded-full border border-primary-foreground/10"
				></div>

				<div class="relative z-10">
					<Heart class="mx-auto mb-4 size-10 text-primary-foreground/60" />
					<h2 class="font-display text-3xl md:text-4xl">Join the community</h2>
					<p class="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/80">
						Be part of a growing community of business owners modernizing their operations with POS
						Platform.
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
							class="border-primary-foreground/30 px-8 text-base text-primary-foreground hover:bg-primary-foreground/10"
						>
							Talk to Us
						</Button>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
