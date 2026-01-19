<script lang="ts" module>
	export type Filter = {
		id: string;
		label: string;
		value?: string;
		variant?: 'default' | 'outline' | 'primary' | 'destructive';
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import FilterChip from './filter-chip.svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';

	type Props = {
		filters?: Filter[];
		showFilterButton?: boolean;
		showClearAll?: boolean;
		filterButtonLabel?: string;
		class?: string;
		leading?: Snippet;
		trailing?: Snippet;
		onFilterClick?: () => void;
		onRemoveFilter?: (id: string) => void;
		onClearAll?: () => void;
	};

	let {
		filters = [],
		showFilterButton = true,
		showClearAll = true,
		filterButtonLabel = 'Filters',
		leading,
		trailing,
		onFilterClick,
		onRemoveFilter,
		onClearAll,
		class: className
	}: Props = $props();

	const activeFilters = $derived(filters.filter((f) => f.value !== undefined && f.value !== ''));
	const hasActiveFilters = $derived(activeFilters.length > 0);
</script>

<div
	class={cn(
		'flex flex-wrap items-center gap-2 rounded-lg border border-transparent bg-muted/30 p-2 transition-colors',
		hasActiveFilters && 'border-border bg-muted/50',
		className
	)}
	data-slot="filter-bar"
>
	<!-- Leading slot (typically SearchInput) -->
	{#if leading}
		<div class="min-w-[200px] flex-1">
			{@render leading()}
		</div>
	{/if}

	<!-- Filter button -->
	{#if showFilterButton}
		<Button variant="outline" size="sm" onclick={onFilterClick} class="gap-2">
			<SlidersHorizontalIcon class="h-4 w-4" />
			{filterButtonLabel}
			{#if hasActiveFilters}
				<span
					class="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium"
				>
					{activeFilters.length}
				</span>
			{/if}
		</Button>
	{/if}

	<!-- Active filter chips -->
	{#if hasActiveFilters}
		<div class="flex flex-wrap items-center gap-1.5">
			{#each activeFilters as filter (filter.id)}
				<FilterChip
					label={filter.label}
					value={filter.value}
					variant={filter.variant}
					onRemove={() => onRemoveFilter?.(filter.id)}
				/>
			{/each}

			{#if showClearAll && activeFilters.length > 1}
				<Button
					variant="ghost"
					size="sm"
					onclick={onClearAll}
					class="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
				>
					<XIcon class="h-3 w-3" />
					Clear all
				</Button>
			{/if}
		</div>
	{/if}

	<!-- Trailing slot -->
	{#if trailing}
		<div class="ml-auto">
			{@render trailing()}
		</div>
	{/if}
</div>
