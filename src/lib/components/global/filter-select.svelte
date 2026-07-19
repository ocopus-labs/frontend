<script lang="ts" module>
	export interface FilterSelectOption {
		value: string;
		label: string;
	}
</script>

<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { cn } from '$lib/utils.js';

	interface Props {
		value: string;
		options: FilterSelectOption[];
		onValueChange: (value: string) => void;
		placeholder?: string;
		size?: 'sm' | 'default';
		class?: string;
	}

	let {
		value = $bindable(),
		options,
		onValueChange,
		placeholder = 'Select',
		size = 'default',
		class: className = 'w-[160px]'
	}: Props = $props();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label);
</script>

<Select.Root type="single" {value} {onValueChange}>
	<Select.Trigger {size} class={cn(className)}>
		{selectedLabel ?? placeholder}
	</Select.Trigger>
	<Select.Content>
		{#each options as option (option.value)}
			<Select.Item value={option.value}>{option.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
