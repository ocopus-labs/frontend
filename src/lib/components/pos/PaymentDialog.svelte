<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { IconCash, IconCreditCard, IconDeviceMobile, IconReceipt } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { PaymentMethod } from '$lib/api';

	interface Props {
		open: boolean;
		orderId: string;
		orderNumber: string;
		totalAmount: number;
		balanceDue: number;
		onPaymentComplete: (result: {
			paymentMethod: PaymentMethod;
			amount: number;
			change?: number;
			remainingBalance: number;
		}) => void;
		onCancel: () => void;
		isProcessing?: boolean;
	}

	let {
		open,
		orderId,
		orderNumber,
		totalAmount,
		balanceDue,
		onPaymentComplete,
		onCancel,
		isProcessing = false
	}: Props = $props();

	const i18n = createI18nUtils('in');

	let paymentMethod = $state<PaymentMethod>('cash');
	let paymentAmount = $state(balanceDue);
	let cashReceived = $state(0);
	let transactionReference = $state('');

	// Reset state when dialog opens
	$effect(() => {
		if (open) {
			paymentAmount = balanceDue;
			cashReceived = balanceDue; // Default to exact amount for easier payment
			transactionReference = '';
			paymentMethod = 'cash';
		}
	});

	// Update cashReceived when payment amount changes
	$effect(() => {
		if (paymentMethod === 'cash' && cashReceived < paymentAmount) {
			cashReceived = paymentAmount;
		}
	});

	const change = $derived(
		paymentMethod === 'cash' && cashReceived > paymentAmount
			? cashReceived - paymentAmount
			: 0
	);

	const isValidPayment = $derived(() => {
		console.log('Validating payment:', {
			paymentAmount,
			balanceDue,
			cashReceived,
			paymentMethod
		});
		if (paymentAmount <= 0 || paymentAmount > balanceDue) return false;
		if (paymentMethod === 'cash' && cashReceived < paymentAmount) return false;
		return true;
	});

	function handleQuickAmount(amount: number) {
		cashReceived = amount;
	}

	function handleExactAmount() {
		cashReceived = paymentAmount;
	}

	function handleSubmit() {
		console.log('Payment submit clicked');
		console.log('isValidPayment:', isValidPayment());
		console.log('paymentMethod:', paymentMethod);
		console.log('paymentAmount:', paymentAmount);
		console.log('cashReceived:', cashReceived);
		console.log('balanceDue:', balanceDue);

		if (!isValidPayment()) {
			console.log('Payment validation failed');
			return;
		}

		console.log('Calling onPaymentComplete');
		onPaymentComplete({
			paymentMethod,
			amount: paymentAmount,
			change: change > 0 ? change : undefined,
			remainingBalance: balanceDue - paymentAmount
		});
	}

	const quickAmounts = $derived(() => {
		const base = Math.ceil(paymentAmount / 100) * 100;
		return [base, base + 100, base + 200, base + 500].filter(a => a >= paymentAmount);
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Process Payment</Dialog.Title>
			<Dialog.Description>
				Order #{orderNumber} - Total: {i18n.formatCurrency(totalAmount)}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Payment Method Selection -->
			<div class="space-y-3">
				<Label class="text-sm font-medium">Payment Method</Label>
				<div class="grid grid-cols-4 gap-2">
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => paymentMethod = 'cash'}
					>
						<IconCash class="h-6 w-6" />
						<span class="text-xs font-medium">Cash</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => paymentMethod = 'card'}
					>
						<IconCreditCard class="h-6 w-6" />
						<span class="text-xs font-medium">Card</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {paymentMethod === 'upi' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => paymentMethod = 'upi'}
					>
						<IconDeviceMobile class="h-6 w-6" />
						<span class="text-xs font-medium">UPI</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {paymentMethod === 'other' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}"
						onclick={() => paymentMethod = 'other'}
					>
						<IconReceipt class="h-6 w-6" />
						<span class="text-xs font-medium">Other</span>
					</button>
				</div>
			</div>

			<!-- Amount to Pay -->
			<div class="space-y-2">
				<Label for="paymentAmount">Amount to Pay</Label>
				<div class="flex gap-2">
					<Input
						id="paymentAmount"
						type="number"
						bind:value={paymentAmount}
						min={0.01}
						max={balanceDue}
						step={0.01}
						class="text-lg font-semibold"
					/>
					<Button
						variant="outline"
						onclick={() => paymentAmount = balanceDue}
						disabled={paymentAmount === balanceDue}
					>
						Full Amount
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					Balance due: {i18n.formatCurrency(balanceDue)}
				</p>
			</div>

			<!-- Cash Payment Options -->
			{#if paymentMethod === 'cash'}
				<div class="space-y-3">
					<Label for="cashReceived">Cash Received</Label>
					<Input
						id="cashReceived"
						type="number"
						bind:value={cashReceived}
						min={0}
						step={0.01}
						placeholder="Enter cash received"
						class="text-lg"
					/>

					<!-- Quick Amount Buttons -->
					<div class="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={handleExactAmount}
						>
							Exact ({i18n.formatCurrency(paymentAmount)})
						</Button>
						{#each quickAmounts() as amount}
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleQuickAmount(amount)}
							>
								{i18n.formatCurrency(amount)}
							</Button>
						{/each}
					</div>

					<!-- Change Display -->
					{#if change > 0}
						<div class="rounded-lg bg-green-50 p-3 dark:bg-green-950">
							<p class="text-sm text-muted-foreground">Change to return:</p>
							<p class="text-2xl font-bold text-green-600 dark:text-green-400">
								{i18n.formatCurrency(change)}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Card/UPI Transaction Reference -->
			{#if paymentMethod === 'card' || paymentMethod === 'upi'}
				<div class="space-y-2">
					<Label for="transactionRef">Transaction Reference (Optional)</Label>
					<Input
						id="transactionRef"
						type="text"
						bind:value={transactionReference}
						placeholder="Enter transaction ID or reference"
					/>
				</div>
			{/if}

			<!-- Payment Summary -->
			<div class="rounded-lg border border-border bg-muted/50 p-4">
				<div class="flex justify-between text-sm">
					<span>Payment Amount:</span>
					<span class="font-semibold">{i18n.formatCurrency(paymentAmount)}</span>
				</div>
				{#if paymentMethod === 'cash' && cashReceived > 0}
					<div class="flex justify-between text-sm">
						<span>Cash Received:</span>
						<span>{i18n.formatCurrency(cashReceived)}</span>
					</div>
					{#if change > 0}
						<div class="flex justify-between text-sm text-green-600 dark:text-green-400">
							<span>Change:</span>
							<span>{i18n.formatCurrency(change)}</span>
						</div>
					{/if}
				{/if}
				{#if paymentAmount < balanceDue}
					<div class="mt-2 border-t border-border pt-2">
						<div class="flex justify-between text-sm text-orange-600 dark:text-orange-400">
							<span>Remaining Balance:</span>
							<span>{i18n.formatCurrency(balanceDue - paymentAmount)}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>
				Cancel
			</Button>
			<Button
				onclick={handleSubmit}
				disabled={!isValidPayment() || isProcessing}
			>
				{isProcessing ? 'Processing...' : `Pay ${i18n.formatCurrency(paymentAmount)}`}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
