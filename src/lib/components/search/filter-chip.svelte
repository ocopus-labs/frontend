<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const filterChipVariants = tv({
		base: 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none',
		variants: {
			variant: {
				default: 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80',
				outline: 'bg-background text-foreground border-input hover:bg-accent',
				primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
				destructive:
					'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
			},
			removable: {
				true: 'pr-1.5',
				false: ''
			}
		},
		defaultVariants: {
			variant: 'default',
			removable: true
		}
	});

	export type FilterChipVariant = VariantProps<typeof filterChipVariants>['variant'];
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import XIcon from '@lucide/svelte/icons/x';

	type Props = {
		label: string;
		value?: string;
		variant?: FilterChipVariant;
		removable?: boolean;
		icon?: Snippet;
		onRemove?: () => void;
		class?: string;
	};

	let {
		label,
		value,
		variant = 'default',
		removable = true,
		icon,
		onRemove,
		class: className
	}: Props = $props();
</script>

<span class={cn(filterChipVariants({ variant, removable }), className)} data-slot="filter-chip">
	{#if icon}
		<span class="text-current/70">
			{@render icon()}
		</span>
	{/if}

	<span class="font-medium"
		>{label}{#if value}<span class="text-current/70">:</span>{/if}</span
	>

	{#if value}
		<span class="font-normal">{value}</span>
	{/if}

	{#if removable}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onRemove?.();
			}}
			class="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10 focus:outline-none"
			aria-label="Remove filter"
		>
			<XIcon class="h-3 w-3" />
		</button>
	{/if}
</span>
