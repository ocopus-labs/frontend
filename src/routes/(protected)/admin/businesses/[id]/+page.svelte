<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { PageData } from './$types';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Building2 from '@lucide/svelte/icons/building-2';
	import User from '@lucide/svelte/icons/user';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Users from '@lucide/svelte/icons/users';
	import Calendar from '@lucide/svelte/icons/calendar';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';

	let { data }: { data: PageData } = $props();

	const business = data.business;

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getStatusBadgeVariant(status: string): 'default' | 'destructive' | 'secondary' {
		if (status === 'active') return 'default';
		if (status === 'suspended') return 'destructive';
		return 'secondary';
	}
</script>

<svelte:head>
	<title>{business.name} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/admin/businesses">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Business Details</h1>
			<p class="text-muted-foreground">View business information and statistics</p>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Profile Card -->
		<Card.Root class="md:col-span-1">
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center text-center">
					<div class="flex h-24 w-24 items-center justify-center rounded-xl bg-muted mb-4">
						{#if business.logo}
							<img src={business.logo} alt={business.name} class="h-24 w-24 rounded-xl object-cover" />
						{:else}
							<Building2 class="h-12 w-12 text-muted-foreground" />
						{/if}
					</div>
					<h2 class="text-xl font-semibold">{business.name}</h2>
					<p class="text-muted-foreground text-sm">/{business.slug}</p>
					<div class="flex gap-2 mt-4">
						<Badge variant="outline" class="capitalize">{business.type}</Badge>
						<Badge variant={getStatusBadgeVariant(business.status)} class="capitalize">
							{business.status}
						</Badge>
					</div>
					{#if business.description}
						<p class="text-sm text-muted-foreground mt-4">{business.description}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Info Cards -->
		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Business Information</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex items-center gap-3">
						<User class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Owner</p>
							<p class="text-xs text-muted-foreground">
								{business.owner.name || 'Unnamed'} ({business.owner.email})
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<Calendar class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Created</p>
							<p class="text-xs text-muted-foreground">{formatDate(business.createdAt)}</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<Users class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Team Members</p>
							<p class="text-xs text-muted-foreground">{business._count.businessUsers} members</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<LayoutGrid class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Tables</p>
							<p class="text-xs text-muted-foreground">{business._count.tables} tables</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Statistics Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Statistics</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-4">
				<div class="rounded-lg border p-4 text-center">
					<ShoppingCart class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{business._count.orders}</p>
					<p class="text-sm text-muted-foreground">Total Orders</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<IndianRupee class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{formatCurrency(business.totalRevenue || 0)}</p>
					<p class="text-sm text-muted-foreground">Total Revenue</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<Users class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{business._count.businessUsers}</p>
					<p class="text-sm text-muted-foreground">Team Members</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<LayoutGrid class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{business._count.tables}</p>
					<p class="text-sm text-muted-foreground">Tables</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
