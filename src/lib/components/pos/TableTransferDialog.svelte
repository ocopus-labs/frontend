<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconArrowsExchange } from '@tabler/icons-svelte';

	interface TableOption {
		id: string;
		tableNumber: string;
		displayName: string;
		capacity: number;
		status: string;
	}

	interface Props {
		open: boolean;
		currentTableNumber: string;
		availableTables: TableOption[];
		onConfirm: (targetTableId: string) => void;
		onCancel: () => void;
		isProcessing?: boolean;
	}

	let {
		open,
		currentTableNumber,
		availableTables,
		onConfirm,
		onCancel,
		isProcessing = false
	}: Props = $props();

	let selectedTableId = $state<string | null>(null);

	$effect(() => {
		if (open) {
			selectedTableId = null;
		}
	});

	const filteredTables = $derived(
		availableTables.filter((t) => t.status === 'available' || t.status === 'reserved')
	);
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconArrowsExchange class="h-5 w-5 text-primary" />
				Transfer Order
			</Dialog.Title>
			<Dialog.Description>
				Move order from Table {currentTableNumber} to another table
			</Dialog.Description>
		</Dialog.Header>

		<Field.Field class="py-4">
			<Field.Label>Select target table</Field.Label>
			{#if filteredTables.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">No available tables</p>
			{:else}
				<div class="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto">
					{#each filteredTables as table}
						<button
							class="rounded-lg border p-3 text-center transition-colors {selectedTableId ===
							table.id
								? 'border-primary bg-primary/10 ring-2 ring-primary'
								: 'hover:bg-muted'}"
							onclick={() => (selectedTableId = table.id)}
						>
							<div class="text-sm font-semibold">{table.displayName}</div>
							<div class="text-xs text-muted-foreground">Cap: {table.capacity}</div>
						</button>
					{/each}
				</div>
			{/if}
		</Field.Field>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>Cancel</Button>
			<Button
				onclick={() => selectedTableId && onConfirm(selectedTableId)}
				disabled={!selectedTableId || isProcessing}
			>
				{isProcessing ? 'Transferring...' : 'Transfer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
