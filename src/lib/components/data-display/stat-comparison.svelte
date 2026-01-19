<script lang="ts">
	import type { Component } from 'svelte';
	import { cn } from '$lib/utils.js';
	import TrendBadge from './trend-badge.svelte';
	import LiveCounter from './live-counter.svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	type Props = {
		label: string;
		currentValue: number;
		previousValue: number;
		format?: 'number' | 'currency' | 'compact' | 'percent';
		currency?: string;
		currentLabel?: string;
		previousLabel?: string;
		showTrend?: boolean;
		invertTrend?: boolean;
		icon?: Component;
		class?: string;
	};

	let {
		label,
		currentValue,
		previousValue,
		format = 'number',
		currency = 'USD',
		currentLabel = 'Current',
		previousLabel = 'Previous',
		showTrend = true,
		invertTrend = false,
		icon: Icon,
		class: className
	}: Props = $props();

	const change = $derived(currentValue - previousValue);
	const isPositive = $derived(invertTrend ? change < 0 : change > 0);
</script>

<div
	class={cn('rounded-xl border bg-card p-4', className)}
	data-slot="stat-comparison"
>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if Icon}
				<Icon class="text-muted-foreground h-4 w-4" />
			{/if}
			<span class="text-muted-foreground text-sm font-medium">{label}</span>
		</div>
		{#if showTrend}
			<TrendBadge value={currentValue} {previousValue} invertColors={invertTrend} />
		{/if}
	</div>

	<!-- Values comparison -->
	<div class="flex items-center gap-4">
		<!-- Previous value -->
		<div class="flex-1 rounded-lg bg-muted/50 p-3">
			<p class="text-muted-foreground mb-1 text-xs">{previousLabel}</p>
			<p class="text-lg font-semibold tabular-nums text-muted-foreground">
				<LiveCounter value={previousValue} {format} {currency} />
			</p>
		</div>

		<!-- Arrow -->
		<div class="flex-shrink-0">
			<ArrowRightIcon
				class={cn(
					'h-5 w-5 transition-colors',
					isPositive ? 'text-green-500' : 'text-red-500'
				)}
			/>
		</div>

		<!-- Current value -->
		<div
			class={cn(
				'flex-1 rounded-lg p-3',
				isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
			)}
		>
			<p class="text-muted-foreground mb-1 text-xs">{currentLabel}</p>
			<p
				class={cn(
					'text-lg font-bold tabular-nums',
					isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
				)}
			>
				<LiveCounter value={currentValue} {format} {currency} />
			</p>
		</div>
	</div>

	<!-- Change indicator -->
	<div class="mt-3 text-center">
		<span class="text-muted-foreground text-xs">
			{change >= 0 ? '+' : ''}<LiveCounter value={change} {format} {currency} /> change
		</span>
	</div>
</div>
