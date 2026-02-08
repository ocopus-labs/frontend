<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		IconCash,
		IconCreditCard,
		IconDeviceMobile,
		IconReceipt,
		IconPlus,
		IconTrash
	} from '@tabler/icons-svelte';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { PaymentMethod } from '$lib/api';
	import { generatePaymentQr } from '$lib/api';

	interface SplitEntry {
		id: string;
		method: PaymentMethod;
		amount: number;
		cashReceived?: number;
	}

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
			tipAmount?: number;
		}) => void;
		onSplitPaymentComplete?: (result: {
			payments: { method: PaymentMethod; amount: number; cashReceived?: number }[];
			remainingBalance: number;
		}) => void;
		onCancel: () => void;
		isProcessing?: boolean;
		region?: string;
		businessId?: string;
	}

	let {
		open,
		orderId,
		orderNumber,
		totalAmount,
		balanceDue,
		onPaymentComplete,
		onSplitPaymentComplete,
		onCancel,
		isProcessing = false,
		region = 'us',
		businessId
	}: Props = $props();

	const i18n = createI18nUtils(region);

	// Payment mode
	let mode = $state<'single' | 'split'>('single');

	// Single payment state
	let paymentMethod = $state<PaymentMethod>('cash');
	let paymentAmount = $state(balanceDue);
	let cashReceived = $state(0);
	let transactionReference = $state('');
	let tipAmount = $state(0);

	// Split payment state
	let splitEntries = $state<SplitEntry[]>([]);

	// Reset state when dialog opens
	$effect(() => {
		if (open) {
			mode = 'single';
			paymentAmount = balanceDue;
			cashReceived = balanceDue;
			transactionReference = '';
			paymentMethod = 'cash';
			tipAmount = 0;
			splitEntries = [
				{ id: crypto.randomUUID(), method: 'cash', amount: Math.floor(balanceDue / 2) },
				{ id: crypto.randomUUID(), method: 'card', amount: balanceDue - Math.floor(balanceDue / 2) }
			];
		}
	});

	// UPI QR state
	let upiQrDataUrl = $state<string | null>(null);
	let isLoadingQr = $state(false);
	let qrDebounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	// Fetch UPI QR when method is UPI and amount changes (debounced)
	$effect(() => {
		if (
			open &&
			mode === 'single' &&
			paymentMethod === 'upi' &&
			businessId &&
			paymentAmount > 0
		) {
			if (qrDebounceTimer) clearTimeout(qrDebounceTimer);
			qrDebounceTimer = setTimeout(async () => {
				isLoadingQr = true;
				try {
					const result = await generatePaymentQr(
						businessId!,
						paymentAmount,
						`Order #${orderNumber}`
					);
					upiQrDataUrl = result.dataUrl;
				} catch {
					upiQrDataUrl = null;
				} finally {
					isLoadingQr = false;
				}
			}, 500);
		} else {
			upiQrDataUrl = null;
		}
	});

	// Update cashReceived when payment amount changes (single mode)
	$effect(() => {
		if (mode === 'single' && paymentMethod === 'cash' && cashReceived < paymentAmount) {
			cashReceived = paymentAmount;
		}
	});

	const change = $derived(
		mode === 'single' && paymentMethod === 'cash' && cashReceived > paymentAmount
			? cashReceived - paymentAmount
			: 0
	);

	let transactionRefError = $state('');

	const isValidSinglePayment = $derived(() => {
		if (paymentAmount <= 0 || paymentAmount > balanceDue) return false;
		if (paymentMethod === 'cash' && cashReceived < paymentAmount) return false;
		if ((paymentMethod === 'card' || paymentMethod === 'upi') && !transactionReference.trim()) {
			return false;
		}
		return true;
	});

	const splitTotal = $derived(splitEntries.reduce((sum, e) => sum + (e.amount || 0), 0));
	const splitRemaining = $derived(balanceDue - splitTotal);

	const isValidSplitPayment = $derived(() => {
		if (splitEntries.length < 2) return false;
		if (Math.abs(splitRemaining) > 0.01) return false;
		for (const entry of splitEntries) {
			if (entry.amount <= 0) return false;
			if (entry.method === 'cash' && (entry.cashReceived ?? 0) < entry.amount) return false;
		}
		return true;
	});

	function handleQuickAmount(amount: number) {
		cashReceived = amount;
	}

	function handleExactAmount() {
		cashReceived = paymentAmount;
	}

	function handleSubmit() {
		if (mode === 'single') {
			if ((paymentMethod === 'card' || paymentMethod === 'upi') && !transactionReference.trim()) {
				transactionRefError = 'Transaction reference is required for card/UPI payments';
				return;
			}
			if (!isValidSinglePayment()) return;
			onPaymentComplete({
				paymentMethod,
				amount: paymentAmount,
				change: change > 0 ? change : undefined,
				remainingBalance: balanceDue - paymentAmount,
				tipAmount: tipAmount > 0 ? tipAmount : undefined
			});
		} else {
			if (!isValidSplitPayment() || !onSplitPaymentComplete) return;
			onSplitPaymentComplete({
				payments: splitEntries.map((e) => ({
					method: e.method,
					amount: e.amount,
					cashReceived: e.method === 'cash' ? e.cashReceived : undefined
				})),
				remainingBalance: 0
			});
		}
	}

	const quickAmounts = $derived(() => {
		const base = Math.ceil(paymentAmount / 100) * 100;
		const amounts = [base, base + 100, base + 200, base + 500].filter(
			(a) => a >= paymentAmount && a !== paymentAmount
		);
		return [...new Set(amounts)];
	});

	// Split payment helpers
	function addSplitEntry() {
		splitEntries = [
			...splitEntries,
			{ id: crypto.randomUUID(), method: 'cash', amount: Math.max(0, splitRemaining) }
		];
	}

	function removeSplitEntry(id: string) {
		if (splitEntries.length <= 2) return;
		splitEntries = splitEntries.filter((e) => e.id !== id);
	}

	function updateSplitMethod(id: string, method: PaymentMethod) {
		splitEntries = splitEntries.map((e) =>
			e.id === id ? { ...e, method, cashReceived: method === 'cash' ? e.amount : undefined } : e
		);
	}

	function updateSplitAmount(id: string, amount: number) {
		splitEntries = splitEntries.map((e) =>
			e.id === id
				? {
						...e,
						amount,
						cashReceived: e.method === 'cash' ? Math.max(e.cashReceived ?? 0, amount) : undefined
					}
				: e
		);
	}

	function autoDistribute() {
		const count = splitEntries.length;
		const each = Math.floor((balanceDue / count) * 100) / 100;
		const remainder = balanceDue - each * (count - 1);
		splitEntries = splitEntries.map((e, i) => ({
			...e,
			amount: i === count - 1 ? Math.round(remainder * 100) / 100 : each,
			cashReceived:
				e.method === 'cash'
					? i === count - 1
						? Math.round(remainder * 100) / 100
						: each
					: undefined
		}));
	}

	const methodIcons = {
		cash: IconCash,
		card: IconCreditCard,
		upi: IconDeviceMobile,
		net_banking: IconReceipt,
		wallet: IconReceipt,
		other: IconReceipt
	} as const;

	const methodLabels: Record<PaymentMethod, string> = {
		cash: 'Cash',
		card: 'Card',
		upi: 'UPI',
		net_banking: 'Net Banking',
		wallet: 'Wallet',
		other: 'Other'
	};
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-h-[90vh] max-w-lg overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Process Payment</Dialog.Title>
			<Dialog.Description>
				Order #{orderNumber} - Total: {i18n.formatCurrency(totalAmount)}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Mode Toggle -->
			{#if onSplitPaymentComplete}
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="rounded-lg border-2 p-2.5 text-center text-sm font-medium transition-colors {mode ===
						'single'
							? 'border-primary bg-primary/10'
							: 'border-border hover:border-primary/50'}"
						onclick={() => (mode = 'single')}
					>
						Single Payment
					</button>
					<button
						type="button"
						class="rounded-lg border-2 p-2.5 text-center text-sm font-medium transition-colors {mode ===
						'split'
							? 'border-primary bg-primary/10'
							: 'border-border hover:border-primary/50'}"
						onclick={() => (mode = 'split')}
					>
						Split Payment
					</button>
				</div>
			{/if}

			{#if mode === 'single'}
				<!-- SINGLE PAYMENT MODE -->
				<!-- Payment Method Selection -->
				<div class="space-y-3">
					<Label class="text-sm font-medium">Payment Method</Label>
					<div class="grid grid-cols-4 gap-2">
						{#each ['cash', 'card', 'upi', 'other'] as const as method}
							{@const MethodIcons = methodIcons[method]}
							<button
								type="button"
								class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {paymentMethod ===
								method
									? 'border-primary bg-primary/10'
									: 'border-border hover:border-primary/50'}"
								onclick={() => (paymentMethod = method)}
							>
								<MethodIcons class="h-6 w-6" />
								<span class="text-xs font-medium">{methodLabels[method]}</span>
							</button>
						{/each}
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
							onclick={() => (paymentAmount = balanceDue)}
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
							<Button variant="outline" size="sm" onclick={handleExactAmount}>
								Exact ({i18n.formatCurrency(paymentAmount)})
							</Button>
							{#each quickAmounts() as amount}
								<Button variant="outline" size="sm" onclick={() => handleQuickAmount(amount)}>
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

				<!-- UPI QR Code -->
				{#if paymentMethod === 'upi' && businessId}
					<div class="space-y-3">
						<Label class="text-sm font-medium">Scan to Pay</Label>
						<div class="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/30 p-4">
							{#if isLoadingQr}
								<div class="flex h-[200px] w-[200px] items-center justify-center">
									<IconLoader2 class="h-8 w-8 animate-spin text-muted-foreground" />
								</div>
								<p class="text-xs text-muted-foreground">Generating QR code...</p>
							{:else if upiQrDataUrl}
								<img
									src={upiQrDataUrl}
									alt="UPI Payment QR Code"
									class="h-[200px] w-[200px]"
								/>
								<p class="text-xs text-muted-foreground">
									Ask customer to scan and pay {i18n.formatCurrency(paymentAmount)}
								</p>
							{:else}
								<div class="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-dashed border-border">
									<p class="text-center text-xs text-muted-foreground">
										UPI QR not available.<br />Configure in Settings &gt; UPI Payments.
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Card/UPI Transaction Reference -->
				{#if paymentMethod === 'card' || paymentMethod === 'upi'}
					<div class="space-y-2">
						<Label for="transactionRef"
							>Transaction Reference <span class="text-destructive">*</span></Label
						>
						<Input
							id="transactionRef"
							type="text"
							bind:value={transactionReference}
							placeholder="Enter transaction ID or reference"
							class={transactionRefError ? 'border-destructive' : ''}
							oninput={() => {
								transactionRefError = '';
							}}
						/>
						{#if transactionRefError}
							<p class="text-xs text-destructive">{transactionRefError}</p>
						{/if}
					</div>
				{/if}

				<!-- Tip (single payment mode only) -->
				<div class="space-y-2">
					<Label for="tipAmount">Tip (optional)</Label>
					<Input
						id="tipAmount"
						type="number"
						bind:value={tipAmount}
						min={0}
						step={0.01}
						placeholder="0.00"
					/>
				</div>

				<!-- Payment Summary -->
				<div class="rounded-lg border border-border bg-muted/50 p-4">
					<div class="flex justify-between text-sm">
						<span>Payment Amount:</span>
						<span class="font-semibold">{i18n.formatCurrency(paymentAmount)}</span>
					</div>
					{#if tipAmount > 0}
						<div class="flex justify-between text-sm">
							<span>Tip:</span>
							<span>{i18n.formatCurrency(tipAmount)}</span>
						</div>
					{/if}
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
			{:else}
				<!-- SPLIT PAYMENT MODE -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label class="text-sm font-medium">Payment Entries</Label>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" onclick={autoDistribute}>Split Evenly</Button>
							<Button variant="outline" size="sm" onclick={addSplitEntry}>
								<IconPlus class="mr-1 h-3 w-3" />
								Add
							</Button>
						</div>
					</div>

					{#each splitEntries as entry, idx}
						<div class="space-y-3 rounded-lg border border-border p-3">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Payment {idx + 1}</span>
								{#if splitEntries.length > 2}
									<Button
										variant="ghost"
										size="icon"
										class="h-7 w-7"
										onclick={() => removeSplitEntry(entry.id)}
									>
										<IconTrash class="h-3.5 w-3.5 text-muted-foreground" />
									</Button>
								{/if}
							</div>

							<!-- Method selector -->
							<div class="grid grid-cols-4 gap-1.5">
								{#each ['cash', 'card', 'upi', 'other'] as const as method}
									{@const MethodIcons = methodIcons[method]}
									<button
										type="button"
										class="flex flex-col items-center gap-0.5 rounded-md border-2 p-2 text-xs transition-colors {entry.method ===
										method
											? 'border-primary bg-primary/10'
											: 'border-border hover:border-primary/50'}"
										onclick={() => updateSplitMethod(entry.id, method)}
									>
										<MethodIcons class="h-4 w-4" />
										<span class="font-medium">{methodLabels[method]}</span>
									</button>
								{/each}
							</div>

							<!-- Amount -->
							<div>
								<Input
									type="number"
									value={entry.amount}
									oninput={(e) =>
										updateSplitAmount(entry.id, parseFloat(e.currentTarget.value) || 0)}
									min={0.01}
									step={0.01}
									class="font-semibold"
								/>
							</div>

							<!-- Cash received for cash entries -->
							{#if entry.method === 'cash'}
								<div class="space-y-1">
									<Label class="text-xs">Cash Received</Label>
									<Input
										type="number"
										value={entry.cashReceived ?? entry.amount}
										oninput={(e) => {
											const val = parseFloat(e.currentTarget.value) || 0;
											splitEntries = splitEntries.map((se) =>
												se.id === entry.id ? { ...se, cashReceived: val } : se
											);
										}}
										min={entry.amount}
										step={0.01}
										class="text-sm"
									/>
									{#if (entry.cashReceived ?? 0) > entry.amount}
										<p class="text-xs text-green-600">
											Change: {i18n.formatCurrency((entry.cashReceived ?? 0) - entry.amount)}
										</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}

					<!-- Split Summary -->
					<div class="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
						{#each splitEntries as entry, idx}
							<div class="flex justify-between text-sm">
								<span class="capitalize">{methodLabels[entry.method]}</span>
								<span>{i18n.formatCurrency(entry.amount)}</span>
							</div>
						{/each}
						<div class="flex justify-between border-t border-border pt-2 text-sm font-semibold">
							<span>Total</span>
							<span class={Math.abs(splitRemaining) < 0.01 ? '' : 'text-destructive'}>
								{i18n.formatCurrency(splitTotal)}
							</span>
						</div>
						{#if Math.abs(splitRemaining) >= 0.01}
							<div class="flex justify-between text-sm text-orange-600 dark:text-orange-400">
								<span>{splitRemaining > 0 ? 'Remaining:' : 'Over by:'}</span>
								<span>{i18n.formatCurrency(Math.abs(splitRemaining))}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel} disabled={isProcessing}>Cancel</Button>
			{#if mode === 'single'}
				<Button onclick={handleSubmit} disabled={!isValidSinglePayment() || isProcessing}>
					{isProcessing ? 'Processing...' : `Pay ${i18n.formatCurrency(paymentAmount)}`}
				</Button>
			{:else}
				<Button
					onclick={handleSubmit}
					disabled={!isValidSplitPayment() || isProcessing || !onSplitPaymentComplete}
				>
					{isProcessing ? 'Processing...' : `Pay ${i18n.formatCurrency(splitTotal)}`}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
