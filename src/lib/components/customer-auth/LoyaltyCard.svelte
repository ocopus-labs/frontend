<script lang="ts">
	import type { LoyaltyEntry } from '$lib/api/customer-me';
	import StarIcon from '@lucide/svelte/icons/star';

	interface Props {
		loyalty: LoyaltyEntry[];
		loading: boolean;
	}

	let { loyalty, loading }: Props = $props();
</script>

{#if loading}
	<div class="space-y-3">
		{#each [1, 2] as _}
			<div class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-muted"></div>
		{/each}
	</div>
{:else if loyalty.length === 0}
	<p class="text-sm text-muted-foreground">Order something to start earning loyalty points.</p>
{:else}
	<div class="space-y-3">
		{#each loyalty as entry (entry.restaurantId)}
			<div
				class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-border dark:bg-muted/40"
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
{/if}
