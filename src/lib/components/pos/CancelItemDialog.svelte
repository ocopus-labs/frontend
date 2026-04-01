<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { IconX } from '@tabler/icons-svelte';
	import type { CancellationReason } from '$lib/api/order';

	interface Props {
		open: boolean;
		itemName: string;
		onConfirm: (reason: CancellationReason, note?: string) => void;
		onCancel: () => void;
		isProcessing?: boolean;
	}

	let {
		open,
		itemName,
		onConfirm,
		onCancel,
		isProcessing = false
	}: Props = $props();

	let reason = $state<CancellationReason>('customer_changed_mind');
	let note = $state('');

	$effect(() => {
		if (open) {
			reason = 'customer_changed_mind';
			note = '';
		}
	});

	const reasons: { value: CancellationReason; label: string }[] = [
		{ value: 'customer_changed_mind', label: 'Customer changed mind' },
		{ value: 'out_of_stock', label: 'Out of stock' },
		{ value: 'wrong_item', label: 'Wrong item' },
		{ value: 'kitchen_error', label: 'Kitchen error' },
		{ value: 'other', label: 'Other' }
	];

	function handleConfirm() {
		onConfirm(reason, note || undefined);
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconX class="h-5 w-5 text-red-500" />
				Cancel Item
			</Dialog.Title>
			<Dialog.Description>
				Cancel "{itemName}" from this order
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label>Reason</Label>
				<RadioGroup.Root bind:value={reason} class="space-y-2">
					{#each reasons as r}
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value={r.value} id={r.value} />
							<Label for={r.value} class="cursor-pointer font-normal">{r.label}</Label>
						</div>
					{/each}
				</RadioGroup.Root>
			</div>

			<div class="space-y-2">
				<Label for="cancel-note">Note (optional)</Label>
				<Textarea
					id="cancel-note"
					bind:value={note}
					placeholder="Additional details..."
					maxlength={200}
					rows={2}
				/>
				<p class="text-muted-foreground text-xs">{note.length}/200</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>
				Go Back
			</Button>
			<Button variant="destructive" onclick={handleConfirm} disabled={isProcessing}>
				{isProcessing ? 'Cancelling...' : 'Cancel Item'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
