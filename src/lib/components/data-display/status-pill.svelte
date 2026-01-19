<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const statusPillVariants = tv({
		base: 'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
		variants: {
			status: {
				success: 'bg-green-500/10 text-green-600 dark:text-green-400',
				warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
				error: 'bg-red-500/10 text-red-600 dark:text-red-400',
				info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
				neutral: 'bg-muted text-muted-foreground',
				primary: 'bg-primary/10 text-primary'
			},
			size: {
				sm: 'px-2 py-0.5 text-xs',
				default: 'px-2.5 py-1 text-xs',
				lg: 'px-3 py-1.5 text-sm'
			}
		},
		defaultVariants: {
			status: 'neutral',
			size: 'default'
		}
	});

	export type StatusPillStatus = VariantProps<typeof statusPillVariants>['status'];
	export type StatusPillSize = VariantProps<typeof statusPillVariants>['size'];
</script>

<script lang="ts">
	import type { Component } from 'svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		label: string;
		status?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
		size?: 'sm' | 'default' | 'lg';
		pulse?: boolean;
		icon?: Component;
		class?: string;
	};

	let {
		label,
		status = 'neutral',
		size = 'default',
		pulse = false,
		icon: Icon,
		class: className
	}: Props = $props();

	const dotColorClass = $derived({
		success: 'bg-green-500',
		warning: 'bg-yellow-500',
		error: 'bg-red-500',
		info: 'bg-blue-500',
		neutral: 'bg-muted-foreground',
		primary: 'bg-primary'
	}[status]);

	const dotSize = $derived({
		sm: 'h-1.5 w-1.5',
		default: 'h-2 w-2',
		lg: 'h-2.5 w-2.5'
	}[size]);

	const iconSize = $derived({
		sm: 'h-3 w-3',
		default: 'h-3.5 w-3.5',
		lg: 'h-4 w-4'
	}[size]);
</script>

<span class={cn(statusPillVariants({ status, size }), className)} data-slot="status-pill">
	{#if Icon}
		<Icon class={iconSize} />
	{:else}
		<span class="relative flex">
			<span class={cn('rounded-full', dotColorClass, dotSize)}></span>
			{#if pulse}
				<span
					class={cn(
						'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
						dotColorClass
					)}
				></span>
			{/if}
		</span>
	{/if}
	<span>{label}</span>
</span>
