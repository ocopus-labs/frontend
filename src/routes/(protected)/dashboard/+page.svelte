<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { useSession } from '$lib/auth';
	import type { PageData } from './$types';

	import Plus from '@lucide/svelte/icons/plus';
	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Wine from '@lucide/svelte/icons/wine';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Users from '@lucide/svelte/icons/users';
	import CreditCard from '@lucide/svelte/icons/credit-card';

	let { data }: { data: PageData } = $props();

	const session = useSession();
	const user = $derived($session.data?.user);

	// Business type icons mapping
	const businessTypeIcons: Record<string, any> = {
		restaurant: UtensilsCrossed,
		cafe: Coffee,
		bar: Wine,
		salon: Scissors,
		spa: Sparkles,
		gym: Dumbbell,
		retail: Store,
		clinic: Stethoscope,
		other: Building2
	};

	// Business type colors for badges
	const businessTypeColors: Record<string, string> = {
		restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
		cafe: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		bar: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
		salon: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
		spa: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
		gym: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		retail: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
		clinic: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
	};

	function getBusinessIcon(type: string) {
		return businessTypeIcons[type] || Building2;
	}

	function getBusinessColor(type: string) {
		return businessTypeColors[type] || businessTypeColors.other;
	}

	function navigateToBusiness(business: any) {
		goto(`/${business.type}/${business.slug}/dashboard`);
	}

	// Quick stats
	const totalBusinesses = $derived(data.businesses?.length || 0);
	const activeBusinesses = $derived(
		data.businesses?.filter((b) => b.status === 'active' || !b.status).length || 0
	);
	const currentPlan = $derived(data.subscription?.plan?.displayName || 'Free');
	const isFreePlan = $derived(data.subscription?.plan?.slug === 'free' || !data.subscription);
</script>

<svelte:head>
	<title>Dashboard | POS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Welcome Section -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">
			Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
		</h1>
		<p class="mt-2 text-muted-foreground">
			Here's an overview of your businesses and account.
		</p>
	</div>

	<!-- Quick Stats -->
	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Businesses</Card.Title>
				<Building2 class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalBusinesses}</div>
				<p class="text-xs text-muted-foreground">
					{activeBusinesses} active
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Subscription</Card.Title>
				<CreditCard class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{currentPlan}</div>
				<p class="text-xs text-muted-foreground">
					{#if isFreePlan}
						<a href="/dashboard/subscriptions" class="text-primary hover:underline">Upgrade now</a>
					{:else}
						<a href="/dashboard/subscriptions" class="text-primary hover:underline">Manage plan</a>
					{/if}
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Account Status</Card.Title>
				<Users class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">Active</div>
				<p class="text-xs text-muted-foreground">
					All systems operational
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Recent Businesses -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">Your Businesses</h2>
			<Button variant="outline" size="sm" href="/dashboard/businesses">
				View All
			</Button>
		</div>

		{#if data.businesses && data.businesses.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.businesses.slice(0, 5) as business (business.id)}
					{@const Icon = getBusinessIcon(business.type)}
					<Card.Root
						class="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
						onclick={() => navigateToBusiness(business)}
					>
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex items-center gap-3">
									{#if business.logo}
										<Avatar.Root class="size-10 rounded-lg">
											<Avatar.Image src={business.logo} alt={business.name} class="object-cover" />
											<Avatar.Fallback class="rounded-lg bg-muted">
												<Icon class="size-5 text-muted-foreground" />
											</Avatar.Fallback>
										</Avatar.Root>
									{:else}
										<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
											<Icon class="size-5 text-muted-foreground" />
										</div>
									{/if}
									<div class="min-w-0">
										<Card.Title class="truncate text-base">{business.name}</Card.Title>
										<span class={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getBusinessColor(business.type)}`}>
											{business.type}
										</span>
									</div>
								</div>
								<ChevronRight class="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
							</div>
						</Card.Header>
						{#if business.address}
							<Card.Content class="pt-0">
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<MapPin class="size-3 shrink-0" />
									<span class="truncate text-xs">
										{[business.address.city, business.address.country].filter(Boolean).join(', ')}
									</span>
								</div>
							</Card.Content>
						{/if}
					</Card.Root>
				{/each}

				<!-- Add New Business Card -->
				<Card.Root
					class="group cursor-pointer border-dashed transition-all hover:border-primary hover:bg-muted/50"
					onclick={() => goto('/business/setup')}
				>
					<Card.Content class="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 py-6">
						<div class="flex size-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
							<Plus class="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
						</div>
						<div class="text-center">
							<p class="text-sm font-medium">Add Business</p>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else}
			<!-- Empty State -->
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 class="size-8 text-muted-foreground" />
					</div>
					<Card.Title class="mb-2 text-xl">No businesses yet</Card.Title>
					<Card.Description class="mb-6">
						Get started by creating your first business.
					</Card.Description>
					<Button onclick={() => goto('/business/setup')} size="lg">
						<Plus class="mr-2 size-4" />
						Create Your First Business
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
