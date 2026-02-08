<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const metricRingVariants = tv({
		base: 'relative inline-flex items-center justify-center',
		variants: {
			size: {
				sm: 'h-16 w-16',
				default: 'h-24 w-24',
				lg: 'h-32 w-32',
				xl: 'h-40 w-40'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type MetricRingSize = VariantProps<typeof metricRingVariants>['size'];
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	type Props = {
		value: number;
		max?: number;
		size?: 'sm' | 'default' | 'lg' | 'xl';
		strokeWidth?: number;
		showValue?: boolean;
		valueFormat?: (value: number, max: number) => string;
		label?: string;
		color?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
		animated?: boolean;
		class?: string;
		children?: Snippet;
	};

	let {
		value,
		max = 100,
		size = 'default',
		strokeWidth = 8,
		showValue = true,
		valueFormat,
		label,
		color = 'primary',
		animated = true,
		children,
		class: className
	}: Props = $props();

	const animatedValue = tweened(0, {
		duration: animated ? 800 : 0,
		easing: cubicOut
	});

	$effect(() => {
		animatedValue.set(value);
	});

	const percentage = $derived(Math.min(100, Math.max(0, ($animatedValue / max) * 100)));

	const sizeConfig = $derived({
		sm: { viewBox: 48, radius: 18 },
		default: { viewBox: 64, radius: 26 },
		lg: { viewBox: 80, radius: 32 },
		xl: { viewBox: 96, radius: 40 }
	}[size]);

	const circumference = $derived(2 * Math.PI * sizeConfig.radius);
	const strokeDashoffset = $derived(circumference - (percentage / 100) * circumference);

	const colorClasses = $derived({
		primary: 'stroke-primary',
		success: 'stroke-success',
		warning: 'stroke-warning',
		destructive: 'stroke-destructive',
		muted: 'stroke-muted-foreground'
	}[color]);

	const displayValue = $derived(
		valueFormat ? valueFormat($animatedValue, max) : `${Math.round(percentage)}%`
	);

	const textSizeClass = $derived({
		sm: 'text-sm',
		default: 'text-lg',
		lg: 'text-2xl',
		xl: 'text-3xl'
	}[size]);

	const labelSizeClass = $derived({
		sm: 'text-[10px]',
		default: 'text-xs',
		lg: 'text-sm',
		xl: 'text-base'
	}[size]);
</script>

<div class={cn(metricRingVariants({ size }), className)} data-slot="metric-ring">
	<svg
		class="absolute inset-0 -rotate-90 transform"
		viewBox={`0 0 ${sizeConfig.viewBox} ${sizeConfig.viewBox}`}
	>
		<!-- Background ring -->
		<circle
			cx={sizeConfig.viewBox / 2}
			cy={sizeConfig.viewBox / 2}
			r={sizeConfig.radius}
			fill="none"
			stroke="currentColor"
			stroke-width={strokeWidth}
			class="text-muted/30"
		/>
		<!-- Progress ring -->
		<circle
			cx={sizeConfig.viewBox / 2}
			cy={sizeConfig.viewBox / 2}
			r={sizeConfig.radius}
			fill="none"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={strokeDashoffset}
			class={cn('transition-all duration-300', colorClasses)}
		/>
	</svg>

	<!-- Center content -->
	<div class="relative flex flex-col items-center justify-center">
		{#if children}
			{@render children()}
		{:else if showValue}
			<span class={cn('font-bold tabular-nums', textSizeClass)}>{displayValue}</span>
			{#if label}
				<span class={cn('text-muted-foreground', labelSizeClass)}>{label}</span>
			{/if}
		{/if}
	</div>
</div>
