<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData } from './$types';

	import Check from '@lucide/svelte/icons/check';
	import Zap from '@lucide/svelte/icons/zap';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Users from '@lucide/svelte/icons/users';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import Headphones from '@lucide/svelte/icons/headphones';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Shield from '@lucide/svelte/icons/shield';

	let { data }: { data: PageData } = $props();

	const plans = [
		{
			name: 'Free',
			price: '$0',
			period: 'forever',
			description: 'Perfect for getting started',
			features: [
				'1 business location',
				'Up to 100 orders/month',
				'Basic POS features',
				'Email support',
				'Basic analytics'
			],
			current: true,
			popular: false
		},
		{
			name: 'Pro',
			price: '$29',
			period: 'per month',
			description: 'For growing businesses',
			features: [
				'Up to 5 business locations',
				'Unlimited orders',
				'Advanced POS features',
				'Priority email support',
				'Advanced analytics',
				'Inventory management',
				'Staff management',
				'Custom reports'
			],
			current: false,
			popular: true
		},
		{
			name: 'Enterprise',
			price: '$99',
			period: 'per month',
			description: 'For large organizations',
			features: [
				'Unlimited business locations',
				'Unlimited orders',
				'All Pro features',
				'24/7 phone support',
				'Dedicated account manager',
				'Custom integrations',
				'API access',
				'White-label options',
				'SLA guarantee'
			],
			current: false,
			popular: false
		}
	];

	// Per-business add-ons
	const addons = [
		{
			name: 'Kitchen Display System',
			price: '$10',
			period: 'per location/month',
			description: 'Real-time kitchen order management',
			icon: HardDrive
		},
		{
			name: 'Multi-user Access',
			price: '$5',
			period: 'per user/month',
			description: 'Add team members with role-based access',
			icon: Users
		},
		{
			name: 'Priority Support',
			price: '$15',
			period: 'per month',
			description: '24/7 priority phone and chat support',
			icon: Headphones
		},
		{
			name: 'Advanced Analytics',
			price: '$20',
			period: 'per month',
			description: 'Deep insights and custom reports',
			icon: TrendingUp
		}
	];
</script>

<svelte:head>
	<title>Subscriptions | POS</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Subscriptions</h1>
		<p class="mt-2 text-muted-foreground">
			Manage your subscription plans and add-ons for your businesses.
		</p>
	</div>

	<!-- Current Plan Overview -->
	<Card.Root class="border-primary/50 bg-primary/5">
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="text-lg">Current Plan</Card.Title>
					<Card.Description>You are currently on the Free plan</Card.Description>
				</div>
				<Badge variant="secondary" class="text-sm">Free</Badge>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 md:grid-cols-3">
				<div class="flex items-center gap-3">
					<Building2 class="size-5 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">{data.businesses?.length || 0} / 1</p>
						<p class="text-xs text-muted-foreground">Business locations</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<TrendingUp class="size-5 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">0 / 100</p>
						<p class="text-xs text-muted-foreground">Orders this month</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<Shield class="size-5 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">Basic</p>
						<p class="text-xs text-muted-foreground">Support level</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Pricing Plans -->
	<div>
		<h2 class="mb-4 text-xl font-semibold">Available Plans</h2>
		<div class="grid gap-6 md:grid-cols-3">
			{#each plans as plan}
				<Card.Root class={plan.popular ? 'relative border-primary shadow-lg' : ''}>
					{#if plan.popular}
						<div class="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
							<Badge class="bg-primary text-primary-foreground">Most Popular</Badge>
						</div>
					{/if}
					<Card.Header class="text-center">
						<Card.Title class="text-xl">{plan.name}</Card.Title>
						<div class="mt-2">
							<span class="text-4xl font-bold">{plan.price}</span>
							<span class="text-muted-foreground">/{plan.period}</span>
						</div>
						<Card.Description>{plan.description}</Card.Description>
					</Card.Header>
					<Card.Content>
						<ul class="space-y-3">
							{#each plan.features as feature}
								<li class="flex items-center gap-2 text-sm">
									<Check class="size-4 text-green-500" />
									{feature}
								</li>
							{/each}
						</ul>
					</Card.Content>
					<Card.Footer>
						{#if plan.current}
							<Button class="w-full" variant="outline" disabled>
								Current Plan
							</Button>
						{:else}
							<Button class="w-full" variant={plan.popular ? 'default' : 'outline'}>
								<Zap class="mr-2 size-4" />
								Upgrade to {plan.name}
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>

	<Separator />

	<!-- Add-ons -->
	<div>
		<h2 class="mb-4 text-xl font-semibold">Add-ons</h2>
		<p class="mb-6 text-muted-foreground">Enhance your plan with additional features</p>
		<div class="grid gap-4 md:grid-cols-2">
			{#each addons as addon}
				{@const Icon = addon.icon}
				<Card.Root>
					<Card.Header>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
									<Icon class="size-5 text-muted-foreground" />
								</div>
								<div>
									<Card.Title class="text-base">{addon.name}</Card.Title>
									<Card.Description>{addon.description}</Card.Description>
								</div>
							</div>
							<div class="text-right">
								<p class="font-semibold">{addon.price}</p>
								<p class="text-xs text-muted-foreground">{addon.period}</p>
							</div>
						</div>
					</Card.Header>
					<Card.Footer class="pt-0">
						<Button variant="outline" size="sm" class="w-full">
							Add to Plan
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>

	<!-- Business Subscriptions -->
	{#if data.businesses && data.businesses.length > 0}
		<Separator />
		<div>
			<h2 class="mb-4 text-xl font-semibold">Per-Business Subscriptions</h2>
			<p class="mb-6 text-muted-foreground">Manage subscriptions for each of your businesses</p>
			<div class="space-y-4">
				{#each data.businesses as business}
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
										<Building2 class="size-5" />
									</div>
									<div>
										<Card.Title class="text-base">{business.name}</Card.Title>
										<Card.Description class="capitalize">{business.type}</Card.Description>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<Badge variant="outline">Free Plan</Badge>
									<Button variant="outline" size="sm">
										Manage
									</Button>
								</div>
							</div>
						</Card.Header>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>
