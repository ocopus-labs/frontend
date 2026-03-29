<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Select from '$lib/components/ui/select';
	import { useSession } from '$lib/auth';
	import type { PageData } from './$types';

	import {
		LiveCounter,
		StatusPill,
		QuickActionCard,
		EmptyState,
		MetricRing
	} from '$lib/components/data-display';

	import Plus from '@lucide/svelte/icons/plus';
	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Wine from '@lucide/svelte/icons/wine';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Settings from '@lucide/svelte/icons/settings';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Users from '@lucide/svelte/icons/users';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Zap from '@lucide/svelte/icons/zap';
	import X from '@lucide/svelte/icons/x';
	import Network from '@lucide/svelte/icons/network';

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

	// Step 1: Selected business for quick actions
	let selectedBusiness = $state<any>(null);
	$effect(() => {
		if (data.businesses?.length && !selectedBusiness) {
			selectedBusiness = data.businesses[0];
		}
	});

	// Step 3: Show more/less toggle for businesses
	let showAllBusinesses = $state(false);
	const BUSINESS_LIMIT = 5;
	const visibleBusinesses = $derived(
		showAllBusinesses
			? (data.businesses ?? [])
			: (data.businesses ?? []).slice(0, BUSINESS_LIMIT)
	);
	const hasMoreBusinesses = $derived((data.businesses?.length ?? 0) > BUSINESS_LIMIT);

	// Step 4: Dismissible upgrade prompt
	let showUpgradePrompt = $state(true);
	$effect(() => {
		if (typeof sessionStorage !== 'undefined') {
			showUpgradePrompt = sessionStorage.getItem('dismiss-upgrade-prompt') !== 'true';
		}
	});
	function dismissUpgradePrompt() {
		showUpgradePrompt = false;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('dismiss-upgrade-prompt', 'true');
		}
	}
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
		<p class="mt-1 text-muted-foreground">
			Here's an overview of your businesses and account.
		</p>
	</div>

	{#if data.businesses}
		<!-- Quick Stats -->
		<div class="grid gap-4 md:grid-cols-3">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Businesses</Card.Title>
					<Building2 class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						<LiveCounter value={totalBusinesses} />
					</div>
					<div class="mt-1 flex items-center gap-2">
						<StatusPill
							label="{activeBusinesses} active"
							status="success"
							size="sm"
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Subscription</Card.Title>
					<CreditCard class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-3">
						<span class="text-2xl font-bold">{currentPlan}</span>
						{#if isFreePlan}
							<StatusPill label="Upgrade available" status="info" size="sm" />
						{/if}
					</div>
					<p class="mt-1 text-xs text-muted-foreground">
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
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-3">
						<StatusPill label="Active" status="success" pulse size="lg" />
					</div>
					<p class="mt-1 text-xs text-muted-foreground">
						All systems operational
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Quick Actions -->
		{#if totalBusinesses > 0}
			<!-- Business selector for quick actions when multiple businesses -->
			{#if (data.businesses?.length ?? 0) > 1}
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Quick actions for:</span>
					<Select.Root
						type="single"
						value={selectedBusiness?.id}
						onValueChange={(v) => {
							const biz = data.businesses?.find((b) => b.id === v);
							if (biz) selectedBusiness = biz;
						}}
					>
						<Select.Trigger class="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
							{selectedBusiness?.name ?? 'Select business'}
						</Select.Trigger>
						<Select.Content>
							{#each data.businesses ?? [] as biz (biz.id)}
								<Select.Item value={biz.id}>{biz.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			<div class="grid gap-4 md:grid-cols-4">
				<QuickActionCard
					title="New Order"
					description="Start a new POS order"
					icon={Receipt}
					onclick={() => {
						if (selectedBusiness) goto(`/${selectedBusiness.type}/${selectedBusiness.slug}/pos/new-order`);
					}}
					variant="gradient"
					size="sm"
				/>
				<QuickActionCard
					title="Analytics"
					description="View business reports"
					icon={BarChart3}
					onclick={() => {
						if (selectedBusiness) goto(`/${selectedBusiness.type}/${selectedBusiness.slug}/dashboard`);
					}}
					variant="default"
					size="sm"
				/>
				<QuickActionCard
					title="Team"
					description="Manage your team"
					icon={Users}
					onclick={() => {
						if (selectedBusiness) goto(`/${selectedBusiness.type}/${selectedBusiness.slug}/team`);
					}}
					variant="default"
					size="sm"
				/>
				<QuickActionCard
					title="Settings"
					description="Account settings"
					icon={Settings}
					href="/dashboard/settings"
					variant="default"
					size="sm"
				/>
			</div>
		{/if}

		<!-- Franchises Section -->
		{#if (data.franchises ?? []).length > 0}
			<div>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold">Your Franchises</h2>
					<Button variant="outline" size="sm" href="/franchise">
						View All
					</Button>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.franchises ?? [] as franchise (franchise.id)}
						<Card.Root
							class="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
							onclick={() => goto(`/franchise/${franchise.slug}`)}
						>
							<Card.Header class="pb-3">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-3">
										{#if franchise.logo}
											<Avatar.Root class="size-12 rounded-xl ring-2 ring-background shadow-sm">
												<Avatar.Image src={franchise.logo} alt={franchise.name} class="object-cover" />
												<Avatar.Fallback class="rounded-xl bg-muted">
													<Network class="size-5 text-muted-foreground" />
												</Avatar.Fallback>
											</Avatar.Root>
										{:else}
											<div class="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
												<Network class="size-5 text-primary" />
											</div>
										{/if}
										<div class="min-w-0">
											<Card.Title class="truncate text-base">{franchise.name}</Card.Title>
											<span class="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
												Franchise
											</span>
										</div>
									</div>
									<ChevronRight class="size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
								</div>
							</Card.Header>
							<Card.Content class="pt-0">
								<div class="flex items-center gap-4 text-sm text-muted-foreground">
									<span>{franchise._count?.businesses ?? 0} locations</span>
									<span>{franchise._count?.staff ?? 0} staff</span>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}

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
					{#each visibleBusinesses as business (business.id)}
						{@const Icon = getBusinessIcon(business.type)}
						<Card.Root
							class="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
							onclick={() => navigateToBusiness(business)}
						>
							<Card.Header class="pb-3">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-3">
										{#if business.logo}
											<Avatar.Root class="size-12 rounded-xl ring-2 ring-background shadow-sm">
												<Avatar.Image src={business.logo} alt={business.name} class="object-cover" />
												<Avatar.Fallback class="rounded-xl bg-muted">
													<Icon class="size-5 text-muted-foreground" />
												</Avatar.Fallback>
											</Avatar.Root>
										{:else}
											<div class="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/50 shadow-sm">
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
									<ChevronRight class="size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
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
					<QuickActionCard
						title="Add Business"
						description="Create a new business"
						icon={Plus}
						onclick={() => goto('/business/setup')}
						variant="outline"
					/>
				</div>

				<!-- Show more / Show less toggle -->
				{#if hasMoreBusinesses}
					<div class="mt-4 flex justify-center">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => (showAllBusinesses = !showAllBusinesses)}
						>
							{showAllBusinesses ? 'Show less' : `Show all ${data.businesses.length} businesses`}
							<ChevronDown class="ml-1 h-4 w-4 transition-transform {showAllBusinesses ? 'rotate-180' : ''}" />
						</Button>
					</div>
				{/if}
			{:else}
				<!-- Empty State -->
				<EmptyState
					type="empty"
					title="No businesses yet"
					description="Get started by creating your first business."
					actionLabel="Create Your First Business"
					onAction={() => goto('/business/setup')}
					icon={Building2}
				/>
			{/if}
		</div>

		<!-- Upgrade prompt for free users -->
		{#if isFreePlan && totalBusinesses > 0 && showUpgradePrompt}
			<Card.Root>
				<Card.Content class="flex items-center justify-between p-6">
					<div class="flex items-center gap-4">
						<div class="rounded-full bg-primary/10 p-3">
							<Zap class="size-6 text-primary" />
						</div>
						<div>
							<h3 class="font-semibold">Upgrade to Pro</h3>
							<p class="text-sm text-muted-foreground">
								Unlock unlimited businesses, advanced analytics, and priority support.
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Button href="/dashboard/subscriptions">
							Upgrade Now
						</Button>
						<Button variant="ghost" size="icon" onclick={dismissUpgradePrompt}>
							<X class="h-4 w-4" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{:else}
		<!-- Loading skeleton -->
		<div class="grid gap-4 md:grid-cols-3">
			{#each [1, 2, 3] as _}
				<Card.Root>
					<Card.Header class="pb-2">
						<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
					</Card.Header>
					<Card.Content>
						<div class="h-8 w-16 animate-pulse rounded bg-muted"></div>
						<div class="mt-2 h-3 w-20 animate-pulse rounded bg-muted"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each [1, 2, 3] as _}
				<Card.Root>
					<Card.Header>
						<div class="flex items-center gap-3">
							<div class="h-12 w-12 animate-pulse rounded-xl bg-muted"></div>
							<div>
								<div class="h-4 w-28 animate-pulse rounded bg-muted"></div>
								<div class="mt-2 h-3 w-16 animate-pulse rounded bg-muted"></div>
							</div>
						</div>
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
