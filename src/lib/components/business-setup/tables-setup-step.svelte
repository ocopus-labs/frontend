<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import { toast } from 'svelte-sonner';
	import { bulkCreateTables } from '$lib/api/table';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';

	let {
		businessId,
		completed = $bindable(false)
	}: {
		businessId: string;
		completed: boolean;
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
			y: Math.floor(i / columns),
		}))
	);

	async function handleCreate() {
		isLoading = true;
		try {
			const result = await bulkCreateTables(businessId, tableCount, capacity);
			createdCount = result.tables.length;
			completed = true;
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
		<p class="mt-2 text-muted-foreground">Choose how many tables you have. We'll create a layout for you.</p>
	</div>

	{#if completed}
		<div class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
			<Check class="size-5 text-green-600" />
			<p class="text-sm font-medium text-green-800 dark:text-green-200">Created {createdCount} tables</p>
		</div>
	{:else}
		<!-- Table count selector -->
		<div class="space-y-3">
			<p class="text-sm font-medium">How many tables?</p>
			<div class="flex flex-wrap gap-2">
				{#each presets as count}
					<button
						class="rounded-lg border-2 px-5 py-2.5 text-sm font-medium transition-colors {tableCount === count && !isCustom ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'}"
						onclick={() => selectPreset(count)}
					>
						{count}
					</button>
				{/each}
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
			<div class="grid grid-cols-4 gap-2 rounded-lg border bg-muted/30 p-4" style="max-width: 320px">
				{#each previewTables as table}
					<div class="flex aspect-square items-center justify-center rounded-md border bg-background text-xs font-medium shadow-sm">
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
