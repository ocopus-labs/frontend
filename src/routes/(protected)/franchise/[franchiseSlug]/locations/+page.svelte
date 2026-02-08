<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { StatusPill, EmptyState } from '$lib/components/data-display';
	import { getFranchiseBusinesses, removeBusinessFromFranchise } from '$lib/api/franchise';
	import type { Business } from '$lib/api/types';

	import Plus from '@lucide/svelte/icons/plus';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Store from '@lucide/svelte/icons/store';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const isOwner = $derived(userRole === 'franchise_owner');

	let businesses = $state<Business[]>([]);
	let loading = $state(true);

	$effect(() => {
		if (franchise?.id) {
			getFranchiseBusinesses(franchise.id)
				.then((res) => {
					businesses = res.businesses;
				})
				.catch(() => {
					businesses = [];
				})
				.finally(() => {
					loading = false;
				});
		}
	});

	async function handleRemove(businessId: string) {
		if (!franchise?.id) return;
		if (!confirm('Remove this business from the franchise? It will become independent.')) return;

		try {
			await removeBusinessFromFranchise(franchise.id, businessId);
			businesses = businesses.filter((b) => b.id !== businessId);
		} catch (err) {
			console.error('Failed to remove business:', err);
		}
	}
</script>

<svelte:head>
	<title>Locations - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Locations</h1>
			<p class="mt-1 text-muted-foreground">
				Manage businesses under {franchise?.name}.
			</p>
		</div>
		{#if isOwner}
			<Button onclick={() => goto('/business/setup')}>
				<Plus class="mr-2 h-4 w-4" />
				Add Location
			</Button>
		{/if}
	</div>

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each [1, 2, 3] as _}
				<Card.Root>
					<Card.Header>
						<div class="flex items-center gap-3">
							<div class="h-10 w-10 animate-pulse rounded-lg bg-muted"></div>
							<div>
								<div class="h-4 w-28 animate-pulse rounded bg-muted"></div>
								<div class="mt-2 h-3 w-16 animate-pulse rounded bg-muted"></div>
							</div>
						</div>
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
	{:else if businesses.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each businesses as business (business.id)}
				<Card.Root class="group">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								{#if business.logo}
									<img
										src={business.logo}
										alt={business.name}
										class="size-10 rounded-lg object-cover"
									/>
								{:else}
									<div
										class="flex size-10 items-center justify-center rounded-lg bg-muted"
									>
										<Store class="size-4 text-muted-foreground" />
									</div>
								{/if}
								<div class="min-w-0">
									<Card.Title class="truncate text-sm">{business.name}</Card.Title>
									<span class="text-xs text-muted-foreground capitalize">
										{business.type}
									</span>
								</div>
							</div>
							<StatusPill
								label={business.status}
								status={business.status === 'active' ? 'success' : 'warning'}
								size="sm"
							/>
						</div>
					</Card.Header>
					<Card.Content class="pt-0">
						{#if business.address}
							<div class="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
								<MapPin class="size-3 shrink-0" />
								<span class="truncate">
									{[business.address.city, business.address.country]
										.filter(Boolean)
										.join(', ')}
								</span>
							</div>
						{/if}
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								class="flex-1"
								onclick={() =>
									goto(`/${business.type}/${business.slug}/dashboard`)}
							>
								<ExternalLink class="mr-1 h-3 w-3" />
								Open
							</Button>
							{#if isOwner}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleRemove(business.id)}
								>
									<Trash2 class="h-3 w-3 text-destructive" />
								</Button>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<EmptyState
			type="empty"
			title="No locations yet"
			description="Add your first location to this franchise."
			actionLabel="Add Location"
			onAction={() => goto('/business/setup')}
			icon={MapPin}
		/>
	{/if}
</div>
