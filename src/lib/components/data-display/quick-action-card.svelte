<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const quickActionCardVariants = tv({
		base: 'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md',
		variants: {
			variant: {
				default: 'hover:border-primary/50 hover:bg-primary/5',
				outline: 'border-2 border-dashed hover:border-primary hover:bg-primary/5',
				filled: 'border-transparent bg-muted hover:bg-muted/80',
				gradient:
					'border-transparent bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10'
			},
			size: {
				sm: 'gap-2 p-4',
				default: 'gap-3 p-6',
				lg: 'gap-4 p-8'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type QuickActionCardVariant = VariantProps<typeof quickActionCardVariants>['variant'];
	export type QuickActionCardSize = VariantProps<typeof quickActionCardVariants>['size'];
</script>

<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Badge } from '$lib/components/ui/badge';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	type Props = {
		title: string;
		description?: string;
		icon?: Component;
		iconColor?: string;
		variant?: 'default' | 'outline' | 'filled' | 'gradient';
		size?: 'sm' | 'default' | 'lg';
		badge?: string;
		badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
		showArrow?: boolean;
		disabled?: boolean;
		href?: string;
		onclick?: () => void;
		class?: string;
		children?: Snippet;
	};

	let {
		title,
		description,
		icon: Icon,
		iconColor,
		variant = 'default',
		size = 'default',
		badge,
		badgeVariant = 'secondary',
		showArrow = false,
		disabled = false,
		href,
		onclick,
		children,
		class: className
	}: Props = $props();

	const iconSizeClass = $derived(
		{
			sm: 'h-8 w-8',
			default: 'h-10 w-10',
			lg: 'h-12 w-12'
		}[size]
	);

	const titleSizeClass = $derived(
		{
			sm: 'text-sm',
			default: 'text-base',
			lg: 'text-lg'
		}[size]
	);

	const descSizeClass = $derived(
		{
			sm: 'text-xs',
			default: 'text-sm',
			lg: 'text-sm'
		}[size]
	);
</script>

<svelte:element
	this={href ? 'a' : 'button'}
	{href}
	{onclick}
	type={href ? undefined : 'button'}
	disabled={disabled && !href}
	role={href ? undefined : 'button'}
	class={cn(
		quickActionCardVariants({ variant, size }),
		disabled && 'pointer-events-none opacity-50',
		className
	)}
	data-slot="quick-action-card"
>
	{#if badge}
		<Badge variant={badgeVariant} class="absolute top-3 right-3">
			{badge}
		</Badge>
	{/if}

	{#if children}
		{@render children()}
	{:else}
		{#if Icon}
			<div
				class={cn(
					'flex items-center justify-center rounded-xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110',
					iconColor
				)}
			>
				<Icon class={iconSizeClass} />
			</div>
		{/if}

		<div class="space-y-1">
			<h3 class={cn('font-semibold', titleSizeClass)}>{title}</h3>
			{#if description}
				<p class={cn('text-muted-foreground', descSizeClass)}>{description}</p>
			{/if}
		</div>

		{#if showArrow}
			<ArrowRightIcon
				class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1"
			/>
		{/if}
	{/if}
</svelte:element>
