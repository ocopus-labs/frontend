<script lang="ts" module>
	export type FilterOption = {
		value: string;
		label: string;
		icon?: typeof import('svelte').SvelteComponent;
		count?: number;
		disabled?: boolean;
	};

	export type FilterGroup = {
		label?: string;
		options: FilterOption[];
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = {
		value?: string;
		options?: FilterOption[];
		groups?: FilterGroup[];
		placeholder?: string;
		label?: string;
		showCount?: boolean;
		showCheckmark?: boolean;
		allOptionLabel?: string;
		class?: string;
		triggerClass?: string;
		onValueChange?: (value: string) => void;
	};

	let {
		value = $bindable(''),
		options = [],
		groups = [],
		placeholder = 'Select...',
		label,
		showCount = true,
		showCheckmark = true,
		allOptionLabel = 'All',
		triggerClass,
		onValueChange,
		class: className
	}: Props = $props();

	// Combine flat options into a single group if no groups provided
	const allGroups = $derived(
		groups.length > 0 ? groups : options.length > 0 ? [{ options }] : []
	);

	// Find selected option label
	const selectedOption = $derived(() => {
		for (const group of allGroups) {
			const found = group.options.find((opt) => opt.value === value);
			if (found) return found;
		}
		return null;
	});

	const displayValue = $derived(
		value === '' ? allOptionLabel : (selectedOption()?.label ?? value)
	);

	const isActive = $derived(value !== '');
</script>

<div class={cn('flex flex-col gap-1.5', className)} data-slot="filter-dropdown">
	{#if label}
		<span class="text-muted-foreground text-xs font-medium">{label}</span>
	{/if}

	<Select.Root
		type="single"
		{value}
		onValueChange={(v) => {
			value = v ?? '';
			onValueChange?.(value);
		}}
	>
		<Select.Trigger
			class={cn(
				'min-w-[140px]',
				isActive && 'border-primary/50 bg-primary/5 text-primary',
				triggerClass
			)}
		>
			<span class="truncate">{displayValue}</span>
		</Select.Trigger>

		<Select.Content>
			<!-- "All" option -->
			<Select.Item value="">
				<div class="flex w-full items-center justify-between gap-2">
					<span>{allOptionLabel}</span>
					{#if showCheckmark && value === ''}
						<CheckIcon class="text-primary h-4 w-4" />
					{/if}
				</div>
			</Select.Item>

			<Select.Separator />

			{#each allGroups as group, groupIndex}
				{#if group.label}
					<Select.GroupHeading>{group.label}</Select.GroupHeading>
				{/if}

				<Select.Group>
					{#each group.options as option (option.value)}
						<Select.Item value={option.value} disabled={option.disabled}>
							<div class="flex w-full items-center justify-between gap-2">
								<span class="truncate">{option.label}</span>
								<div class="flex items-center gap-1.5">
									{#if showCount && option.count !== undefined}
										<Badge variant="secondary" class="h-5 min-w-5 px-1.5 text-xs">
											{option.count}
										</Badge>
									{/if}
									{#if showCheckmark && value === option.value}
										<CheckIcon class="text-primary h-4 w-4" />
									{/if}
								</div>
							</div>
						</Select.Item>
					{/each}
				</Select.Group>

				{#if groupIndex < allGroups.length - 1}
					<Select.Separator />
				{/if}
			{/each}
		</Select.Content>
	</Select.Root>
</div>
