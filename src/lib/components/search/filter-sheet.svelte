<script lang="ts" module>
	import type { FilterOption } from './filter-dropdown.svelte';

	export type FilterConfig = {
		id: string;
		label: string;
		type: 'select' | 'multi-select' | 'date-range' | 'search';
		options?: FilterOption[];
		placeholder?: string;
	};

	export type FilterValues = Record<string, string | string[] | null>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import FilterDropdown from './filter-dropdown.svelte';
	import SearchInput from './search-input.svelte';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import XIcon from '@lucide/svelte/icons/x';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

	type Props = {
		open?: boolean;
		filters?: FilterConfig[];
		values?: FilterValues;
		title?: string;
		description?: string;
		side?: 'left' | 'right' | 'top' | 'bottom';
		class?: string;
		trigger?: Snippet;
		footer?: Snippet;
		onApply?: (values: FilterValues) => void;
		onReset?: () => void;
		onOpenChange?: (open: boolean) => void;
	};

	let {
		open = $bindable(false),
		filters = [],
		values = $bindable({}),
		title = 'Filters',
		description = 'Refine your search results',
		side = 'right',
		trigger,
		footer,
		onApply,
		onReset,
		onOpenChange,
		class: className
	}: Props = $props();

	// Local copy for editing
	let localValues: FilterValues = $state({ ...values });

	// Count active filters
	const activeCount = $derived(
		Object.values(localValues).filter((v) => {
			if (Array.isArray(v)) return v.length > 0;
			return v !== null && v !== '' && v !== undefined;
		}).length
	);

	function handleApply() {
		values = { ...localValues };
		onApply?.(values);
		open = false;
	}

	function handleReset() {
		localValues = {};
		values = {};
		onReset?.();
	}

	function handleMultiSelectChange(filterId: string, optionValue: string, checked: boolean) {
		const current = (localValues[filterId] as string[]) || [];
		if (checked) {
			localValues[filterId] = [...current, optionValue];
		} else {
			localValues[filterId] = current.filter((v) => v !== optionValue);
		}
	}

	// Sync local values when sheet opens
	$effect(() => {
		if (open) {
			localValues = { ...values };
		}
	});
</script>

<Sheet.Root bind:open {onOpenChange}>
	<Sheet.Trigger>
		{#snippet child({ props })}
			{#if trigger}
				{@render trigger()}
			{:else}
				<Button {...props} variant="outline" size="sm" class="gap-2">
					<FilterIcon class="h-4 w-4" />
					Filters
					{#if activeCount > 0}
						<Badge variant="default" class="h-5 min-w-5 px-1.5">{activeCount}</Badge>
					{/if}
				</Button>
			{/if}
		{/snippet}
	</Sheet.Trigger>

	<Sheet.Content {side} class={cn('flex h-full flex-col', className)}>
		<Sheet.Header>
			<Sheet.Title class="flex items-center gap-2">
				<FilterIcon class="h-5 w-5" />
				{title}
				{#if activeCount > 0}
					<Badge variant="secondary">{activeCount} active</Badge>
				{/if}
			</Sheet.Title>
			<Sheet.Description>{description}</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 overflow-y-auto py-4">
			<div class="flex flex-col gap-6">
				{#each filters as filter (filter.id)}
					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium">{filter.label}</span>

						{#if filter.type === 'select'}
							<FilterDropdown
								options={filter.options ?? []}
								placeholder={filter.placeholder}
								value={(localValues[filter.id] as string) ?? ''}
								onValueChange={(v) => (localValues[filter.id] = v)}
							/>
						{:else if filter.type === 'multi-select'}
							<div class="flex flex-col gap-2 rounded-lg border p-3">
								{#each filter.options ?? [] as option (option.value)}
									{@const isChecked = ((localValues[filter.id] as string[]) || []).includes(
										option.value
									)}
									<div class="flex items-center gap-2">
										<Checkbox
											id={`${filter.id}-${option.value}`}
											checked={isChecked}
											onCheckedChange={(checked) =>
												handleMultiSelectChange(filter.id, option.value, checked === true)}
										/>
										<Label
											for={`${filter.id}-${option.value}`}
											class="flex flex-1 cursor-pointer items-center justify-between"
										>
											<span>{option.label}</span>
											{#if option.count !== undefined}
												<Badge variant="outline" class="text-xs">{option.count}</Badge>
											{/if}
										</Label>
									</div>
								{/each}
							</div>
						{:else if filter.type === 'search'}
							<SearchInput
								placeholder={filter.placeholder}
								value={(localValues[filter.id] as string) ?? ''}
								onClear={() => (localValues[filter.id] = '')}
							/>
						{/if}
					</div>

					<Separator />
				{/each}
			</div>
		</div>

		<Sheet.Footer class="flex-shrink-0 gap-2 border-t pt-4">
			{#if footer}
				{@render footer()}
			{:else}
				<Button variant="outline" onclick={handleReset} class="gap-2">
					<RotateCcwIcon class="h-4 w-4" />
					Reset
				</Button>
				<Button onclick={handleApply} class="flex-1">
					Apply Filters
					{#if activeCount > 0}
						<Badge variant="secondary" class="ml-2">
							{activeCount}
						</Badge>
					{/if}
				</Button>
			{/if}
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
