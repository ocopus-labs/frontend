<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { toast } from 'svelte-sonner';
	import { bulkCreateTables } from '$lib/api/table';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import StepSuccess from './step-success.svelte';

	let {
		businessId,
		completed = $bindable(false),
		summary = $bindable('')
	}: {
		businessId: string;
		completed: boolean;
		summary?: string;
	} = $props();

	const presets = [4, 8, 12, 16, 20];
	let tableCount = $state(8);
	let customCount = $state('');
	let isCustom = $state(false);
	let capacity = $state(4);
	let isLoading = $state(false);
	let createdCount = $state(0);

	function selectPreset(count: number) {
		tableCount = count;
		isCustom = false;
		customCount = '';
	}

	function handleCustom() {
		isCustom = true;
		const n = Number(customCount);
		if (n > 0 && n <= 50) tableCount = n;
	}

	$effect(() => {
		if (isCustom) {
			const n = Number(customCount);
			if (n > 0 && n <= 50) tableCount = n;
		}
	});

	const columns = 4;
	const previewTables = $derived(
		Array.from({ length: tableCount }, (_, i) => ({
			number: `T${i + 1}`,
			x: i % columns,
			y: Math.floor(i / columns)
		}))
	);

	async function handleCreate() {
		isLoading = true;
		try {
			const result = await bulkCreateTables(businessId, tableCount, capacity);
			createdCount = result.tables.length;
			completed = true;
			summary = `${createdCount} table${createdCount === 1 ? '' : 's'}, seats ${capacity}`;
			toast.success(`Created ${createdCount} tables`);
		} catch (e: any) {
			toast.error(e.message || 'Failed to create tables');
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Set up your tables</h1>
		<p class="mt-2 text-muted-foreground">
			Choose how many tables you have. We'll create a layout for you.
		</p>
	</div>

	{#if completed}
		<StepSuccess message="Created {createdCount} tables" />
	{:else}
		<!-- Table count selector -->
		<div class="space-y-3">
			<p class="text-sm font-medium">How many tables?</p>
			<div class="flex flex-wrap gap-2">
				<!-- ToggleGroup rather than raw buttons: single-select is exactly
				     what this is, and it brings roving focus with it. Bound to a
				     string because toggle values are strings. -->
				<ToggleGroup.Root
					type="single"
					value={isCustom ? '' : String(tableCount)}
					onValueChange={(v: string) => {
						if (v) selectPreset(Number(v));
					}}
					class="flex flex-wrap gap-2"
				>
					{#each presets as count (count)}
						<ToggleGroup.Item
							value={String(count)}
							aria-label="{count} tables"
							class="h-auto rounded-lg border-2 px-5 py-2.5 text-sm font-medium data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
						>
							{count}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
				<div class="flex items-center gap-2">
					<Input
						type="number"
						placeholder="Custom"
						class="w-24"
						bind:value={customCount}
						onfocus={handleCustom}
						min="1"
						max="50"
					/>
				</div>
			</div>
		</div>

		<!-- Capacity -->
		<Field.Group class="max-w-xs">
			<Field.Field>
				<Field.Label for="capacity">Default seats per table</Field.Label>
				<Input id="capacity" type="number" min="1" max="20" bind:value={capacity} />
			</Field.Field>
		</Field.Group>

		<!-- Preview grid -->
		<div class="space-y-3">
			<p class="text-sm font-medium">Preview</p>
			<div
				class="grid grid-cols-4 gap-2 rounded-lg border bg-muted/30 p-4"
				style="max-width: 320px"
			>
				{#each previewTables as table}
					<div
						class="flex aspect-square items-center justify-center rounded-md border bg-background text-xs font-medium shadow-sm"
					>
						{table.number}
					</div>
				{/each}
			</div>
		</div>

		<Button onclick={handleCreate} disabled={isLoading}>
			{#if isLoading}
				<Loader2 class="mr-2 size-4 animate-spin" />
				Creating tables...
			{:else}
				Create {tableCount} tables
			{/if}
		</Button>
	{/if}
</div>
