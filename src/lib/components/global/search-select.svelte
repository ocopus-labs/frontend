<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';

	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		options = [],
		placeholder = '',
		emptyPlaceholder = 'No options found'
	} = $props<{
		value: string;
		options: { label: string; value: string }[];
		placeholder?: string;
		emptyPlaceholder?: string;
	}>();

	let open = $state(false);

	function handleSelect(currentValue: string) {
		value = currentValue === value ? '' : currentValue;
		open = false;
	}
</script>

<div>
	<Popover.Root bind:open>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					class="w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
					{...props}
				>
					<span class={cn('truncate', !value && 'text-muted-foreground')}>
						{#if value}
							{options.find((option) => option.value === value)?.label}
						{:else}
							{placeholder}
						{/if}
					</span>
					<ChevronDown size={16} class="shrink-0 text-muted-foreground/80" aria-hidden="true" />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-full min-w-(--bits-popover-anchor-width) p-0" align="start">
			<Command.Root>
				<Command.Input {placeholder} />
				<Command.List>
					<Command.Empty>{emptyPlaceholder}</Command.Empty>
					<Command.Group>
						{#each options as option (option.value)}
							<Command.Item value={option.value} onSelect={() => handleSelect(option.value)}>
								{option.label}
								<Check
									class={cn('ml-auto', value === option.value ? 'opacity-100' : 'opacity-0')}
								/>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
</div>
