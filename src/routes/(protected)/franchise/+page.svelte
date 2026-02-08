<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import Plus from '@lucide/svelte/icons/plus';
	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchises = $derived(data.franchises ?? []);

	function navigateToFranchise(slug: string) {
		goto(`/franchise/${slug}`);
	}
</script>

<svelte:head>
	<title>Franchises | POS</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Your Franchises</h1>
			<p class="mt-1 text-muted-foreground">Manage your franchise networks and locations.</p>
		</div>
		<Button href="/franchise/create">
			<Plus class="mr-2 h-4 w-4" />
			Create Franchise
		</Button>
	</div>

	{#if franchises.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each franchises as franchise (franchise.id)}
				<Card.Root
					class="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
					onclick={() => navigateToFranchise(franchise.slug)}
				>
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								{#if franchise.logo}
									<img
										src={franchise.logo}
										alt={franchise.name}
										class="size-12 rounded-xl object-cover ring-2 ring-background shadow-sm"
									/>
								{:else}
									<div
										class="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm"
									>
										<Building2 class="size-5 text-primary" />
									</div>
								{/if}
								<div class="min-w-0">
									<Card.Title class="truncate text-base">{franchise.name}</Card.Title>
									<StatusPill
										label={franchise.status}
										status={franchise.status === 'active' ? 'success' : 'warning'}
										size="sm"
									/>
								</div>
							</div>
							<ChevronRight
								class="size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
							/>
						</div>
					</Card.Header>
					<Card.Content class="pt-0">
						{#if franchise.description}
							<p class="mb-3 text-sm text-muted-foreground line-clamp-2">
								{franchise.description}
							</p>
						{/if}
						<div class="flex items-center gap-4 text-sm text-muted-foreground">
							<div class="flex items-center gap-1">
								<MapPin class="size-3.5" />
								<span>{franchise._count?.businesses ?? 0} locations</span>
							</div>
							<div class="flex items-center gap-1">
								<Users class="size-3.5" />
								<span>{franchise._count?.staff ?? 0} staff</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<EmptyState
			type="empty"
			title="No franchises yet"
			description="Create your first franchise to manage multiple locations under one brand."
			actionLabel="Create Franchise"
			onAction={() => goto('/franchise/create')}
			icon={Building2}
		/>
	{/if}
</div>
