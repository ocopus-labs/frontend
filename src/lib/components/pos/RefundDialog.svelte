<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { IconCash, IconCreditCard, IconDeviceMobile, IconReceipt, IconAlertTriangle } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { PaymentMethod } from '$lib/api';

	interface Props {
		open: boolean;
		paymentId: string;
		paymentNumber: string;
		paymentAmount: number;
		paymentMethod: PaymentMethod;
		onRefundComplete: (result: { refundAmount: number }) => void;
		onCancel: () => void;
		isProcessing?: boolean;
		region?: string;
	}

	let {
		open,
		paymentId,
		paymentNumber,
		paymentAmount,
		paymentMethod: originalMethod,
		onRefundComplete,
		onCancel,
		isProcessing = false,
		region = 'us'
	}: Props = $props();

	const i18n = createI18nUtils(region);

	let refundAmount = $state(0);
	let reason = $state('');
	let refundMethod = $state<PaymentMethod>('cash');
	let showConfirmation = $state(false);

	// Reset state when dialog opens
	$effect(() => {
		if (open) {
			refundAmount = paymentAmount;
			reason = '';
			refundMethod = originalMethod;
			showConfirmation = false;
		}
	});

	const isValid = $derived(refundAmount > 0 && refundAmount <= paymentAmount);

	function handleRefundRequest() {
		if (!isValid) return;
		showConfirmation = true;
	}

	function handleConfirm() {
		showConfirmation = false;
		onRefundComplete({ refundAmount });
	}

	function handleCancelConfirmation() {
		showConfirmation = false;
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconAlertTriangle class="h-5 w-5 text-orange-500" />
				Process Refund
			</Dialog.Title>
			<Dialog.Description>
				Payment #{paymentNumber} - {i18n.formatCurrency(paymentAmount)}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-5 py-4">
			<!-- Refund Amount -->
			<div class="space-y-2">
				<Label for="refundAmount">Refund Amount</Label>
				<div class="flex gap-2">
					<Input
						id="refundAmount"
						type="number"
						bind:value={refundAmount}
						min={0.01}
						max={paymentAmount}
						step={0.01}
						class="text-lg font-semibold"
					/>
					<Button
						variant="outline"
						onclick={() => (refundAmount = paymentAmount)}
						disabled={refundAmount === paymentAmount}
					>
						Full Amount
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					Maximum: {i18n.formatCurrency(paymentAmount)}
				</p>
				{#if refundAmount > paymentAmount}
					<p class="text-xs text-destructive">Cannot exceed payment amount</p>
				{/if}
			</div>

			<!-- Refund Method -->
			<div class="space-y-3">
				<Label class="text-sm font-medium">Refund Method</Label>
				<div class="grid grid-cols-4 gap-2">
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {refundMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => (refundMethod = 'cash')}
					>
						<IconCash class="h-5 w-5" />
						<span class="text-xs font-medium">Cash</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {refundMethod === 'card' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => (refundMethod = 'card')}
					>
						<IconCreditCard class="h-5 w-5" />
						<span class="text-xs font-medium">Card</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {refundMethod === 'upi' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => (refundMethod = 'upi')}
					>
						<IconDeviceMobile class="h-5 w-5" />
						<span class="text-xs font-medium">UPI</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {refundMethod === 'other' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => (refundMethod = 'other')}
					>
						<IconReceipt class="h-5 w-5" />
						<span class="text-xs font-medium">Other</span>
					</button>
				</div>
			</div>

			<!-- Reason -->
			<div class="space-y-2">
				<Label for="refundReason">Reason (Optional)</Label>
				<Textarea
					id="refundReason"
					bind:value={reason}
					placeholder="Why is this refund being processed?"
					rows={2}
					class="text-sm"
				/>
			</div>

			<!-- Summary -->
			<div class="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
				<div class="flex justify-between text-sm">
					<span>Refund Amount:</span>
					<span class="font-semibold">{i18n.formatCurrency(refundAmount)}</span>
				</div>
				<div class="flex justify-between text-sm">
					<span>Refund Method:</span>
					<span class="capitalize">{refundMethod.replace('_', ' ')}</span>
				</div>
				{#if refundAmount < paymentAmount}
					<div class="mt-2 border-t border-orange-200 pt-2 dark:border-orange-800">
						<div class="flex justify-between text-sm text-muted-foreground">
							<span>Remaining after refund:</span>
							<span>{i18n.formatCurrency(paymentAmount - refundAmount)}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={handleRefundRequest}
				disabled={!isValid || isProcessing}
			>
				{isProcessing ? 'Processing...' : 'Process Refund'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Confirmation Dialog -->
<AlertDialog.Root bind:open={showConfirmation}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Confirm Refund</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to refund {i18n.formatCurrency(refundAmount)} for payment #{paymentNumber}?
				This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancelConfirmation}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				onclick={handleConfirm}
			>
				Yes, Process Refund
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
