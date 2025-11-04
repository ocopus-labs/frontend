<script lang="ts">
	import TrendingDownIcon from '@tabler/icons-svelte/icons/trending-down';
	import TrendingUpIcon from '@tabler/icons-svelte/icons/trending-up';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let { stats = $bindable() } = $props();
</script>

<div
	class="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
>
	{#each stats as stat, index (stat.title)}
		{@const isPositive = stat.change >= 0}
		{@const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon}
		{@const trendText = isPositive ? 'Trending up' : 'Trending down'}
		{@const trendVariant = isPositive ? 'default' : 'destructive'}

		<Card.Root class="@container/card">
			<Card.Header>
				<Card.Description>{stat.title}</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{stat.value}
				</Card.Title>
				<Card.Action>
					<Badge variant={trendVariant}>
						<TrendIcon class="size-4" />
						{Math.abs(stat.change)}%
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Footer class="flex-col items-start gap-1.5 text-sm">
				<div class="line-clamp-1 flex gap-2 font-medium">
					{stat.trendText || `${trendText} this month`}
					<TrendIcon class="size-4" />
				</div>
				<div class="text-muted-foreground">
					{stat.description || 'Visitors for the last 6 months'}
				</div>
			</Card.Footer>
		</Card.Root>
	{/each}
</div>
