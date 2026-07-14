<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { IconCut } from '@tabler/icons-svelte';

	interface SplitItem {
		id: string;
		name: string;
		quantity: number;
		totalPrice: number;
		status: string;
	}

	interface TableOption {
		id: string;
		tableNumber: string;
		displayName: string;
		capacity: number;
		status: string;
	}

	interface Props {
		open: boolean;
		items: SplitItem[];
		availableTables: TableOption[];
		onConfirm: (itemIds: string[], targetTableId: string) => void;
		onCancel: () => void;
		isProcessing?: boolean;
		formatCurrency?: (amount: number) => string;
	}

	let {
		open,
		items,
		availableTables,
		onConfirm,
		onCancel,
		isProcessing = false,
		formatCurrency = (n: number) => `₹${n.toFixed(2)}`
	}: Props = $props();

	let selectedItemIds = $state<Set<string>>(new Set());
	let selectedTableId = $state<string | null>(null);

	$effect(() => {
		if (open) {
			selectedItemIds = new Set();
			selectedTableId = null;
		}
	});

	const activeItems = $derived(items.filter((i) => i.status !== 'cancelled'));
	const filteredTables = $derived(
		availableTables.filter((t) => t.status === 'available' || t.status === 'reserved')
	);
	const canConfirm = $derived(selectedItemIds.size > 0 && selectedTableId !== null);

	function toggleItem(id: string) {
		const next = new Set(selectedItemIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedItemIds = next;
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconCut class="h-5 w-5 text-primary" />
				Split Order
			</Dialog.Title>
			<Dialog.Description>Select items to move to another table</Dialog.Description>
		</Dialog.Header>

		<Field.Group class="py-4">
			<Field.Field>
				<Field.Label>Select items to split</Field.Label>
				<div class="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
					{#each activeItems as item}
						<button
							class="flex w-full items-center gap-3 rounded p-2 text-left hover:bg-muted"
							onclick={() => toggleItem(item.id)}
						>
							<Checkbox
								checked={selectedItemIds.has(item.id)}
								onchange={() => toggleItem(item.id)}
							/>
							<div class="flex-1">
								<span class="text-sm">{item.quantity}x {item.name}</span>
							</div>
							<span class="text-sm text-muted-foreground">{formatCurrency(item.totalPrice)}</span>
						</button>
					{/each}
				</div>
				<Field.Description>{selectedItemIds.size} item(s) selected</Field.Description>
			</Field.Field>

			<Field.Field>
				<Field.Label>Move to table</Field.Label>
				{#if filteredTables.length === 0}
					<p class="py-2 text-center text-sm text-muted-foreground">No available tables</p>
				{:else}
					<div class="grid max-h-32 grid-cols-4 gap-2 overflow-y-auto">
						{#each filteredTables as table}
							<button
								class="rounded-lg border p-2 text-center text-sm transition-colors {selectedTableId ===
								table.id
									? 'border-primary bg-primary/10 ring-2 ring-primary'
									: 'hover:bg-muted'}"
								onclick={() => (selectedTableId = table.id)}
							>
								{table.displayName}
							</button>
						{/each}
					</div>
				{/if}
			</Field.Field>
		</Field.Group>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>Cancel</Button>
			<Button
				onclick={() => canConfirm && onConfirm([...selectedItemIds], selectedTableId!)}
				disabled={!canConfirm || isProcessing}
			>
				{isProcessing ? 'Splitting...' : `Split ${selectedItemIds.size} Item(s)`}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
