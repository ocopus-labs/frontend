<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const emptyStateVariants = tv({
		base: 'flex flex-col items-center justify-center text-center',
		variants: {
			size: {
				sm: 'gap-2 p-4',
				default: 'gap-4 p-8',
				lg: 'gap-6 p-12'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type EmptyStateSize = VariantProps<typeof emptyStateVariants>['size'];
</script>

<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import FileXIcon from '@lucide/svelte/icons/file-x';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	type Props = {
		title: string;
		description?: string;
		type?: 'empty' | 'no-results' | 'no-data' | 'offline' | 'error';
		icon?: Component;
		size?: 'sm' | 'default' | 'lg';
		actionLabel?: string;
		actionVariant?: 'default' | 'secondary' | 'outline' | 'ghost';
		secondaryActionLabel?: string;
		onAction?: () => void;
		onSecondaryAction?: () => void;
		class?: string;
		children?: Snippet;
	};

	let {
		title,
		description,
		type = 'empty',
		icon: CustomIcon,
		size = 'default',
		actionLabel,
		actionVariant = 'default',
		secondaryActionLabel,
		onAction,
		onSecondaryAction,
		children,
		class: className
	}: Props = $props();

	const defaultIcons = {
		empty: InboxIcon,
		'no-results': SearchXIcon,
		'no-data': FileXIcon,
		offline: WifiOffIcon,
		error: AlertCircleIcon
	};

	const Icon = $derived(CustomIcon ?? defaultIcons[type]);

	const iconSizeClass = $derived({
		sm: 'h-10 w-10',
		default: 'h-16 w-16',
		lg: 'h-20 w-20'
	}[size]);

	const iconContainerClass = $derived({
		sm: 'h-16 w-16',
		default: 'h-24 w-24',
		lg: 'h-32 w-32'
	}[size]);

	const titleClass = $derived({
		sm: 'text-sm',
		default: 'text-lg',
		lg: 'text-xl'
	}[size]);

	const descClass = $derived({
		sm: 'text-xs',
		default: 'text-sm',
		lg: 'text-base'
	}[size]);

	const iconColorClass = $derived({
		empty: 'text-muted-foreground/50',
		'no-results': 'text-muted-foreground/50',
		'no-data': 'text-muted-foreground/50',
		offline: 'text-yellow-500/70',
		error: 'text-destructive/70'
	}[type]);

	const bgColorClass = $derived({
		empty: 'bg-muted/30',
		'no-results': 'bg-muted/30',
		'no-data': 'bg-muted/30',
		offline: 'bg-yellow-500/10',
		error: 'bg-destructive/10'
	}[type]);
</script>

<div class={cn(emptyStateVariants({ size }), className)} data-slot="empty-state">
	<!-- Illustration/Icon -->
	<div
		class={cn(
			'flex items-center justify-center rounded-full',
			bgColorClass,
			iconContainerClass
		)}
	>
		<Icon class={cn(iconColorClass, iconSizeClass)} />
	</div>

	<!-- Text content -->
	<div class="max-w-sm space-y-1.5">
		<h3 class={cn('font-semibold', titleClass)}>{title}</h3>
		{#if description}
			<p class={cn('text-muted-foreground', descClass)}>{description}</p>
		{/if}
	</div>

	<!-- Custom content slot -->
	{#if children}
		{@render children()}
	{/if}

	<!-- Actions -->
	{#if actionLabel || secondaryActionLabel}
		<div class="flex flex-wrap items-center justify-center gap-2">
			{#if actionLabel}
				<Button variant={actionVariant} onclick={onAction} size={size === 'sm' ? 'sm' : 'default'}>
					{actionLabel}
				</Button>
			{/if}
			{#if secondaryActionLabel}
				<Button
					variant="ghost"
					onclick={onSecondaryAction}
					size={size === 'sm' ? 'sm' : 'default'}
				>
					{secondaryActionLabel}
				</Button>
			{/if}
		</div>
	{/if}
</div>
