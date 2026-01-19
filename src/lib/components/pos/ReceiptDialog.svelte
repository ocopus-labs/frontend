<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconPrinter, IconX, IconCheck } from '@tabler/icons-svelte';
	import Receipt from './Receipt.svelte';
	import { generateReceipt, type Receipt as ReceiptType, type PaymentMethod } from '$lib/api';
	import { page } from '$app/stores';

	interface Props {
		open: boolean;
		paymentId: string;
		change?: number;
		onClose: () => void;
		onPrintComplete?: () => void;
	}

	let { open, paymentId, change, onClose, onPrintComplete }: Props = $props();

	let isLoading = $state(true);
	let isPrinting = $state(false);
	let error = $state<string | null>(null);

	let receiptData = $state<{
		receipt: ReceiptType;
		business: { name: string; address: object; contact: object };
		orderNumber: string;
		paymentNumber: string;
	} | null>(null);

	$effect(() => {
		if (open && paymentId) {
			loadReceipt();
		}
	});

	async function loadReceipt() {
		isLoading = true;
		error = null;

		try {
			const businessId = $page.data.business.id;
			const data = await generateReceipt(businessId, paymentId);
			receiptData = data;
		} catch (err) {
			console.error('Failed to load receipt:', err);
			error = 'Failed to load receipt. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function handlePrint() {
		isPrinting = true;

		// Use a slight delay to ensure the print dialog opens properly
		setTimeout(() => {
			window.print();
			isPrinting = false;
			onPrintComplete?.();
		}, 100);
	}

	function handleClose() {
		receiptData = null;
		error = null;
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content class="max-w-md print:hidden">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconPrinter class="h-5 w-5" />
				Receipt
			</Dialog.Title>
			<Dialog.Description>Preview and print your receipt</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[60vh] overflow-y-auto py-4">
			{#if isLoading}
				<div class="flex h-48 items-center justify-center">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
				</div>
			{:else if error}
				<div class="flex h-48 flex-col items-center justify-center gap-4 text-center">
					<p class="text-destructive">{error}</p>
					<Button variant="outline" onclick={loadReceipt}>Try Again</Button>
				</div>
			{:else if receiptData}
				<div class="rounded-lg border border-border bg-white">
					<Receipt
						receipt={receiptData.receipt}
						business={receiptData.business}
						orderNumber={receiptData.orderNumber}
						paymentNumber={receiptData.paymentNumber}
						{change}
					/>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-2 sm:justify-between">
			<Button variant="outline" onclick={handleClose}>
				<IconX class="mr-2 h-4 w-4" />
				Close
			</Button>
			<Button onclick={handlePrint} disabled={isLoading || !!error || isPrinting}>
				<IconPrinter class="mr-2 h-4 w-4" />
				{isPrinting ? 'Printing...' : 'Print Receipt'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Print-only content (hidden on screen, shown when printing) -->
{#if open && receiptData}
	<div class="print-only">
		<Receipt
			receipt={receiptData.receipt}
			business={receiptData.business}
			orderNumber={receiptData.orderNumber}
			paymentNumber={receiptData.paymentNumber}
			{change}
		/>
	</div>
{/if}

<style>
	/* Print-only class - hidden on screen, visible when printing */
	.print-only {
		display: none;
	}

	@media print {
		.print-only {
			display: block;
		}
	}
</style>
