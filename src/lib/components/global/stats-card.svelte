<script lang="ts">
	import TrendingDownIcon from '@tabler/icons-svelte/icons/trending-down';
	import TrendingUpIcon from '@tabler/icons-svelte/icons/trending-up';
	import * as Card from '$lib/components/ui/card/index.js';
	import { TrendBadge } from '$lib/components/data-display';

	interface Props {
		stats: any[];
		basePath?: string;
	}

	let { stats, basePath = '' }: Props = $props();
</script>

<div
	class="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
>
	{#each stats as stat, index (stat.title)}
		{@const isPositive = stat.change >= 0}
		{@const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon}
		{@const trendText = isPositive ? 'Trending up' : 'Trending down'}
		{@const href = stat.href && basePath ? `${basePath}/${stat.href}` : stat.href}

		<svelte:element
			this={href ? 'a' : 'div'}
			href={href || undefined}
			class={href ? 'group rounded-xl no-underline transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md' : ''}
		>
			<Card.Root class="@container/card {href ? 'transition-colors group-hover:border-primary/30' : ''}">
				<Card.Header>
					<Card.Description>{stat.title}</Card.Description>
					<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{stat.value}
					</Card.Title>
					{#if stat.change !== 0}
						<Card.Action>
							<TrendBadge value={stat.change} changePercent={stat.change} format="percent" />
						</Card.Action>
					{/if}
				</Card.Header>
				<Card.Footer class="flex-col items-start gap-1.5 text-sm">
					{#if stat.change !== 0}
						<div class="line-clamp-1 flex gap-2 font-medium">
							{stat.trendText || `${trendText} this month`}
							<TrendIcon class="size-4" />
						</div>
					{/if}
					<div class="text-muted-foreground">
						{stat.description}
					</div>
				</Card.Footer>
			</Card.Root>
		</svelte:element>
	{/each}
</div>
