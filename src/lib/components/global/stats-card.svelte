<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { TrendBadge } from '$lib/components/data-display';

	interface StatItem {
		title: string;
		value: string | number;
		change: number;
		description: string;
		href?: string;
		trendText?: string;
		sparklineData?: number[];
	}

	interface Props {
		stats: StatItem[];
		basePath?: string;
	}

	let { stats, basePath = '' }: Props = $props();

	function buildSparklinePath(data: number[], width: number, height: number): string {
		if (!data || data.length < 2) return '';
		const max = Math.max(...data);
		const min = Math.min(...data);
		const range = max - min || 1;
		const step = width / (data.length - 1);
		const padding = 2;
		const usableHeight = height - padding * 2;

		return data
			.map((v, i) => {
				const x = i * step;
				const y = padding + usableHeight - ((v - min) / range) * usableHeight;
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	}
</script>

<div
	class="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/page:grid-cols-2 @5xl/page:grid-cols-4"
>
	{#each stats as stat (stat.title)}
		{@const href = stat.href && basePath ? `${basePath}/${stat.href}` : stat.href}
		{@const sparklinePath = stat.sparklineData
			? buildSparklinePath(stat.sparklineData, 120, 40)
			: ''}

		<svelte:element
			this={href ? 'a' : 'div'}
			href={href || undefined}
			class={href
				? 'group rounded-xl no-underline transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md'
				: ''}
		>
			<Card.Root
				class="@container/card relative overflow-hidden {href
					? 'transition-colors group-hover:border-primary/30'
					: ''}"
			>
				{#if sparklinePath}
					<svg
						class="pointer-events-none absolute bottom-0 right-0 h-12 w-28 opacity-[0.08]"
						viewBox="0 0 120 40"
						preserveAspectRatio="none"
					>
						<path
							d={sparklinePath}
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							class={stat.change >= 0 ? 'text-success' : 'text-destructive'}
						/>
					</svg>
				{/if}
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
					<div class="text-muted-foreground">
						{stat.description}
					</div>
				</Card.Footer>
			</Card.Root>
		</svelte:element>
	{/each}
</div>
