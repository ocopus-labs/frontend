<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { APP_NAME } from '$lib/constants/config';

	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Rss from '@lucide/svelte/icons/rss';
	import Clock from '@lucide/svelte/icons/clock';
	import Tag from '@lucide/svelte/icons/tag';

	const posts = [
		{
			title: 'How to Choose the Right POS System for Your Restaurant',
			excerpt:
				'A comprehensive guide to evaluating POS features, pricing, and integrations for restaurants of all sizes — from quick-service to fine dining.',
			date: 'Feb 5, 2026',
			readTime: '8 min read',
			tag: 'Guide',
			slug: '#'
		},
		{
			title: '5 Ways Inventory Management Can Save Your Business Money',
			excerpt:
				'Discover how real-time stock tracking, automated alerts, and supplier management can reduce waste and increase margins.',
			date: 'Jan 28, 2026',
			readTime: '5 min read',
			tag: 'Tips',
			slug: '#'
		},
		{
			title: 'UPI Payments in 2026: What Every Business Owner Should Know',
			excerpt:
				'The latest UPI updates, transaction limits, and how to integrate seamless digital payments into your business workflow.',
			date: 'Jan 20, 2026',
			readTime: '6 min read',
			tag: 'Industry',
			slug: '#'
		},
		{
			title: 'Managing Multiple Business Locations: A Practical Guide',
			excerpt:
				'From centralized menus to cross-location analytics — learn how to scale from one outlet to many without losing control.',
			date: 'Jan 12, 2026',
			readTime: '7 min read',
			tag: 'Guide',
			slug: '#'
		},
		{
			title: 'GST Compliance Made Simple for Small Businesses',
			excerpt:
				'Step-by-step walkthrough of GST invoicing, filing requirements, and how your POS system can automate most of the work.',
			date: 'Jan 5, 2026',
			readTime: '6 min read',
			tag: 'Compliance',
			slug: '#'
		},
		{
			title: 'Staff Management Best Practices for Service Businesses',
			excerpt:
				'Role-based access, shift scheduling, and performance tracking — build a team that runs itself.',
			date: 'Dec 28, 2025',
			readTime: '5 min read',
			tag: 'Tips',
			slug: '#'
		}
	];

	const tagColors: Record<string, string> = {
		Guide: 'bg-primary/10 text-primary',
		Tips: 'bg-success/10 text-success',
		Industry: 'bg-info/10 text-info',
		Compliance: 'bg-warning/10 text-warning'
	};
</script>

<svelte:head>
	<title>Blog — {APP_NAME}</title>
	<meta
		name="description"
		content="Insights, guides, and tips for Indian business owners. Learn about POS systems, inventory management, UPI payments, GST compliance, and more."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<!-- Header -->
	<section class="relative pb-16">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
			<div
				class="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/5 blur-3xl"
			></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 text-center lg:px-8">
			<p class="animate-fade-up text-sm font-semibold uppercase tracking-wider text-primary">
				Blog
			</p>
			<h1 class="animate-fade-up delay-100 mt-3 font-display text-4xl md:text-5xl lg:text-6xl">
				Insights for <span class="italic">modern</span> businesses
			</h1>
			<p class="animate-fade-up delay-200 mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
				Guides, tips, and industry insights to help you run a smarter business.
			</p>
		</div>
	</section>

	<!-- Blog Grid -->
	<section class="pb-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<!-- Featured post -->
			<div class="animate-fade-up mb-12">
				<div class="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg">
					<div class="grid md:grid-cols-2">
						<div class="flex flex-col justify-center p-8 md:p-10">
							<div class="flex items-center gap-3">
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {tagColors[
										posts[0].tag
									] || 'bg-muted text-muted-foreground'}">{posts[0].tag}</span
								>
								<span class="flex items-center gap-1 text-xs text-muted-foreground">
									<Clock class="size-3" />
									{posts[0].readTime}
								</span>
							</div>
							<h2 class="mt-4 font-display text-2xl md:text-3xl">{posts[0].title}</h2>
							<p class="mt-3 text-sm leading-relaxed text-muted-foreground">{posts[0].excerpt}</p>
							<div class="mt-6">
								<span class="text-xs text-muted-foreground">{posts[0].date}</span>
							</div>
						</div>
						<div class="flex items-center justify-center bg-muted/30 p-12">
							<div class="text-center">
								<Rss class="mx-auto size-16 text-primary/20" />
								<p class="mt-3 text-sm text-muted-foreground">Featured Article</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Post grid -->
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each posts.slice(1) as post, i}
					<article
						class="animate-fade-up group rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
						style="animation-delay: {i * 80 + 100}ms"
					>
						<div
							class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
						></div>

						<div class="flex items-center gap-3">
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {tagColors[
									post.tag
								] || 'bg-muted text-muted-foreground'}">{post.tag}</span
							>
							<span class="flex items-center gap-1 text-xs text-muted-foreground">
								<Clock class="size-3" />
								{post.readTime}
							</span>
						</div>
						<h3 class="mt-4 text-lg font-semibold leading-snug">{post.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
						<div class="mt-4">
							<span class="text-xs text-muted-foreground">{post.date}</span>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<!-- Newsletter CTA -->
	<section class="pb-8">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="rounded-2xl border bg-muted/30 px-8 py-14 text-center">
				<Rss class="mx-auto mb-4 size-8 text-primary/60" />
				<h2 class="font-display text-2xl md:text-3xl">Stay in the loop</h2>
				<p class="mx-auto mt-3 max-w-md text-muted-foreground">
					Get the latest articles, guides, and product updates delivered to your inbox.
				</p>
				<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button href="/contact" size="lg" class="px-8">
						Subscribe to Updates
						<ArrowRight class="ml-1.5 size-4" />
					</Button>
				</div>
			</div>
		</div>
	</section>
</div>
