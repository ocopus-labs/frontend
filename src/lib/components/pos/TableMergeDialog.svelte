<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconTablePlus } from '@tabler/icons-svelte';

	interface OrderOption {
		id: string;
		orderNumber: string;
		tableNumber?: string;
		itemCount: number;
		total: number;
	}

	interface Props {
		open: boolean;
		currentOrderNumber: string;
		otherActiveOrders: OrderOption[];
		onConfirm: (sourceOrderId: string) => void;
		onCancel: () => void;
		isProcessing?: boolean;
		formatCurrency?: (amount: number) => string;
	}

	let {
		open,
		currentOrderNumber,
		otherActiveOrders,
		onConfirm,
		onCancel,
		isProcessing = false,
		formatCurrency = (n: number) => `₹${n.toFixed(2)}`
	}: Props = $props();

	let selectedOrderId = $state<string | null>(null);

	$effect(() => {
		if (open) {
			selectedOrderId = null;
		}
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconTablePlus class="h-5 w-5 text-primary" />
				Merge Orders
			</Dialog.Title>
			<Dialog.Description>
				Select an order to merge into #{currentOrderNumber}
			</Dialog.Description>
		</Dialog.Header>

		<Field.Field class="py-4">
			<Field.Label>Select source order</Field.Label>
			{#if otherActiveOrders.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">
					No other active orders to merge
				</p>
			{:else}
				<div class="max-h-60 space-y-2 overflow-y-auto">
					{#each otherActiveOrders as order}
						<button
							class="w-full rounded-lg border p-3 text-left transition-colors {selectedOrderId ===
							order.id
								? 'border-primary bg-primary/10 ring-2 ring-primary'
								: 'hover:bg-muted'}"
							onclick={() => (selectedOrderId = order.id)}
						>
							<div class="flex items-center justify-between">
								<div>
									<span class="text-sm font-semibold">#{order.orderNumber}</span>
									{#if order.tableNumber}
										<span class="ml-2 text-xs text-muted-foreground">Table {order.tableNumber}</span
										>
									{/if}
								</div>
								<span class="text-sm font-medium">{formatCurrency(order.total)}</span>
							</div>
							<div class="mt-1 text-xs text-muted-foreground">{order.itemCount} item(s)</div>
						</button>
					{/each}
				</div>
			{/if}
		</Field.Field>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>Cancel</Button>
			<Button
				onclick={() => selectedOrderId && onConfirm(selectedOrderId)}
				disabled={!selectedOrderId || isProcessing}
			>
				{isProcessing ? 'Merging...' : 'Merge Orders'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
