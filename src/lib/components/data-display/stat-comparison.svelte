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

<div class={cn('rounded-xl border bg-card p-4', className)} data-slot="stat-comparison">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if Icon}
				<Icon class="h-4 w-4 text-muted-foreground" />
			{/if}
			<span class="text-sm font-medium text-muted-foreground">{label}</span>
		</div>
		{#if showTrend}
			<TrendBadge value={currentValue} {previousValue} invertColors={invertTrend} />
		{/if}
	</div>

	<!-- Values comparison -->
	<div class="flex items-center gap-4">
		<!-- Previous value -->
		<div class="flex-1 rounded-lg bg-muted/50 p-3">
			<p class="mb-1 text-xs text-muted-foreground">{previousLabel}</p>
			<p class="text-lg font-semibold text-muted-foreground tabular-nums">
				<LiveCounter value={previousValue} {format} {currency} />
			</p>
		</div>

		<!-- Arrow -->
		<div class="flex-shrink-0">
			<ArrowRightIcon
				class={cn('h-5 w-5 transition-colors', isPositive ? 'text-success' : 'text-destructive')}
			/>
		</div>

		<!-- Current value -->
		<div class={cn('flex-1 rounded-lg p-3', isPositive ? 'bg-success/10' : 'bg-destructive/10')}>
			<p class="mb-1 text-xs text-muted-foreground">{currentLabel}</p>
			<p
				class={cn(
					'text-lg font-bold tabular-nums',
					isPositive ? 'text-success' : 'text-destructive'
				)}
			>
				<LiveCounter value={currentValue} {format} {currency} />
			</p>
		</div>
	</div>

	<!-- Change indicator -->
	<div class="mt-3 text-center">
		<span class="text-xs text-muted-foreground">
			{change >= 0 ? '+' : ''}<LiveCounter value={change} {format} {currency} /> change
		</span>
	</div>
</div>
