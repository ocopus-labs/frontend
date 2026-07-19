<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { StatusPill } from '$lib/components/data-display';
	import FranchiseNav from '$lib/components/global/franchise-nav.svelte';
	import { ROLE_LABELS } from '$lib/constants/domain';
	import type { LayoutData } from './$types';

	import Network from '@lucide/svelte/icons/network';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';

	let { children, data }: { children: any; data: LayoutData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const roleLabel = $derived(
		userRole ? ((ROLE_LABELS as Record<string, string>)[userRole] ?? userRole) : null
	);
</script>

<div class="flex flex-1 flex-col gap-5">
	<!-- Franchise identity — persistent across every section so you always know
	     which franchise you're in and can get back out. -->
	<div class="space-y-4">
		<Button variant="ghost" size="sm" href="/franchise" class="-ml-2 w-fit text-muted-foreground">
			<ChevronLeft class="mr-1 size-4" />
			All franchises
		</Button>

		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex min-w-0 items-center gap-3">
				{#if franchise?.logo}
					<Avatar.Root class="size-12 shrink-0 rounded-xl">
						<Avatar.Image src={franchise.logo} alt={franchise.name} class="object-cover" />
						<Avatar.Fallback class="rounded-xl bg-primary/10">
							<Network class="size-5 text-primary" />
						</Avatar.Fallback>
					</Avatar.Root>
				{:else}
					<span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
						<Network class="size-5 text-primary" />
					</span>
				{/if}

				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-page-title truncate">{franchise?.name}</h1>
						{#if franchise?.status}
							<StatusPill
								label={franchise.status}
								status={franchise.status === 'active' ? 'success' : 'warning'}
								size="sm"
							/>
						{/if}
					</div>
					<div class="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
						<span class="flex items-center gap-1 tabular-nums">
							<MapPin class="size-3.5 shrink-0" />
							{franchise?._count?.businesses ?? 0} locations
						</span>
						<span class="flex items-center gap-1 tabular-nums">
							<Users class="size-3.5 shrink-0" />
							{franchise?._count?.staff ?? 0} staff
						</span>
					</div>
				</div>
			</div>

			{#if roleLabel}
				<Badge variant="secondary" class="shrink-0">{roleLabel}</Badge>
			{/if}
		</div>
	</div>

	{#if franchise?.slug}
		<FranchiseNav slug={franchise.slug} />
	{/if}

	{@render children()}
</div>
