<script lang="ts">
	import type { LoyaltyEntry } from '$lib/api/customer-me';
	import StarIcon from '@lucide/svelte/icons/star';
	import { Shimmer } from '@shimmer-from-structure/svelte';

	interface Props {
		loyalty: LoyaltyEntry[];
		loading: boolean;
	}

	let { loyalty, loading }: Props = $props();

	// Placeholder rows give <Shimmer> a real layout to measure while loading.
	const placeholderLoyalty: LoyaltyEntry[] = Array.from({ length: 2 }, (_, i) => ({
		customerId: 'skeleton',
		restaurantId: `skeleton-${i}`,
		restaurantName: 'Restaurant name',
		restaurantSlug: 'skeleton',
		points: 0,
		tier: 'Gold'
	}));
</script>

{#if !loading && loyalty.length === 0}
	<p class="text-sm text-muted-foreground">Order something to start earning loyalty points.</p>
{:else}
	<Shimmer {loading}>
		<div class="space-y-3">
			{#each loading ? placeholderLoyalty : loyalty as entry (entry.restaurantId)}
				<div
					class="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 dark:bg-muted/40"
				>
					<div>
						<p class="text-sm font-semibold">{entry.restaurantName}</p>
						{#if entry.tier}
							<span
								class="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
							>
								{entry.tier}
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-1.5 text-primary">
						<StarIcon class="h-4 w-4 fill-current" />
						<span class="text-sm font-bold">{entry.points} pts</span>
					</div>
				</div>
			{/each}
		</div>
	</Shimmer>
{/if}
