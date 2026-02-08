<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const trendBadgeVariants = tv({
		base: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
		variants: {
			trend: {
				up: 'bg-green-500/10 text-green-600 dark:text-green-400',
				down: 'bg-red-500/10 text-red-600 dark:text-red-400',
				neutral: 'bg-muted text-muted-foreground'
			},
			size: {
				sm: 'px-1.5 py-0.5 text-[10px]',
				default: 'px-2 py-0.5 text-xs',
				lg: 'px-2.5 py-1 text-sm'
			}
		},
		defaultVariants: {
			trend: 'neutral',
			size: 'default'
		}
	});

	export type TrendBadgeTrend = VariantProps<typeof trendBadgeVariants>['trend'];
	export type TrendBadgeSize = VariantProps<typeof trendBadgeVariants>['size'];
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import MinusIcon from '@lucide/svelte/icons/minus';

	type Props = {
		value: number;
		previousValue?: number;
		changeValue?: number;
		changePercent?: number;
		format?: 'percent' | 'value' | 'both';
		size?: 'sm' | 'default' | 'lg';
		showIcon?: boolean;
		invertColors?: boolean;
		class?: string;
	};

	let {
		value,
		previousValue,
		changeValue,
		changePercent,
		format = 'percent',
		size = 'default',
		showIcon = true,
		invertColors = false,
		class: className
	}: Props = $props();

	// Calculate change if not provided
	const calculatedChange = $derived(
		changeValue !== undefined ? changeValue :
		previousValue !== undefined ? value - previousValue : 0
	);

	const calculatedPercent = $derived(
		changePercent !== undefined ? changePercent :
		previousValue !== undefined && previousValue !== 0
			? ((value - previousValue) / Math.abs(previousValue)) * 100
			: 0
	);

	const trend = $derived<'up' | 'down' | 'neutral'>(
		calculatedChange > 0 ? (invertColors ? 'down' : 'up') :
		calculatedChange < 0 ? (invertColors ? 'up' : 'down') : 'neutral'
	);

	const displayValue = $derived(() => {
		const sign = calculatedChange >= 0 ? '+' : '';

		switch (format) {
			case 'percent':
				return `${sign}${calculatedPercent.toFixed(1)}%`;
			case 'value':
				return `${sign}${calculatedChange.toLocaleString()}`;
			case 'both':
				return `${sign}${calculatedChange.toLocaleString()} (${sign}${calculatedPercent.toFixed(1)}%)`;
			default:
				return `${sign}${calculatedPercent.toFixed(1)}%`;
		}
	});

	const iconSize = $derived({
		sm: 'h-3 w-3',
		default: 'h-3.5 w-3.5',
		lg: 'h-4 w-4'
	}[size]);
</script>

<span class={cn(trendBadgeVariants({ trend, size }), className)} data-slot="trend-badge">
	{#if showIcon}
		{#if trend === 'up'}
			<TrendingUpIcon class={iconSize} />
		{:else if trend === 'down'}
			<TrendingDownIcon class={iconSize} />
		{:else}
			<MinusIcon class={iconSize} />
		{/if}
	{/if}
	<span class="tabular-nums">{displayValue()}</span>
</span>
