<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	type Props = {
		value: number;
		duration?: number;
		format?: 'number' | 'currency' | 'compact' | 'percent';
		currency?: string;
		locale?: string;
		decimals?: number;
		prefix?: string;
		suffix?: string;
		class?: string;
	};

	let {
		value,
		duration = 1000,
		format = 'number',
		currency = 'USD',
		locale = 'en-US',
		decimals = 0,
		prefix = '',
		suffix = '',
		class: className
	}: Props = $props();

	const animatedValue = tweened(0, {
		duration,
		easing: cubicOut
	});

	$effect(() => {
		animatedValue.set(value);
	});

	const displayValue = $derived(() => {
		const val = $animatedValue;

		switch (format) {
			case 'currency':
				return new Intl.NumberFormat(locale, {
					style: 'currency',
					currency,
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				}).format(val);

			case 'compact':
				return new Intl.NumberFormat(locale, {
					notation: 'compact',
					compactDisplay: 'short',
					minimumFractionDigits: 0,
					maximumFractionDigits: 1
				}).format(val);

			case 'percent':
				return new Intl.NumberFormat(locale, {
					style: 'percent',
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				}).format(val / 100);

			case 'number':
			default:
				return new Intl.NumberFormat(locale, {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				}).format(val);
		}
	});
</script>

<span class={cn('tabular-nums', className)} data-slot="live-counter">
	{prefix}{displayValue()}{suffix}
</span>
