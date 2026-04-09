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
		IconTrash,
		IconBrandStripe,
		IconBuildingBank
	} from '@tabler/icons-svelte';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { PaymentMethod } from '$lib/api';
	import {
		generatePaymentQr,
		createStripeIntent,
		confirmStripePayment,
		getPaymentCredentials,
		createRazorpayOrder,
		verifyRazorpayPayment
	} from '$lib/api';
	import { toast } from 'svelte-sonner';

	type ExtendedPaymentMethod = PaymentMethod | 'stripe' | 'razorpay';

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
		stripePublishableKey?: string;
		currency?: string;
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
		businessId,
		stripePublishableKey,
		currency = 'usd'
	}: Props = $props();

	const i18n = createI18nUtils(region);

	// Payment mode
	let mode = $state<'single' | 'split'>('single');

	// Single payment state
	let paymentMethod = $state<ExtendedPaymentMethod>('cash');
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
			stripeError = '';
			razorpayError = '';
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

	// Stripe state
	let stripeInstance = $state<any>(null);
	let stripeElements = $state<any>(null);
	let stripeCardElement = $state<any>(null);
	let stripeCardContainer = $state<HTMLDivElement | null>(null);
	let isStripeLoading = $state(false);
	let stripeError = $state('');

	// Razorpay state
	let isRazorpayLoading = $state(false);
	let razorpayError = $state('');

	// Resolved gateway credentials — either from the prop (override) or
	// fetched dynamically from the business's payment credentials.
	let resolvedStripeKey = $state<string | null>(null);
	let resolvedRazorpayKey = $state<string | null>(null);
	let isLoadingCredentials = $state(false);
	let hasAttemptedKeyFetch = $state(false);

	// The key we should actually use: prop wins, fallback to fetched credential.
	const effectiveStripeKey = $derived(stripePublishableKey ?? resolvedStripeKey);
	// Razorpay is enabled if keyId exists
	const effectiveRazorpayEnabled = $derived(!!resolvedRazorpayKey);

	// Dynamic list of available payment methods, including gateways that are
	// actually configured for this business.
	const availableMethods = $derived.by<ExtendedPaymentMethod[]>(() => {
		const methods: ExtendedPaymentMethod[] = ['cash', 'card', 'upi'];
		if (effectiveStripeKey) methods.push('stripe');
		if (effectiveRazorpayEnabled) methods.push('razorpay');
		methods.push('other');
		return methods;
	});

	// Fetch the business's payment credentials when the dialog opens and no
	// prop override is provided. We fetch eagerly (rather than only on
	// method-select) so we know which gateway options to render.
	$effect(() => {
		if (!open) {
			hasAttemptedKeyFetch = false;
			return;
		}
		// Note: even if a Stripe publishable key is passed via prop (override),
		// we still fetch credentials to discover Razorpay configuration.
		if (!businessId) return;
		if (hasAttemptedKeyFetch) return;

		hasAttemptedKeyFetch = true;
		isLoadingCredentials = true;
		getPaymentCredentials(businessId)
			.then(({ credentials }) => {
				const stripeCred = credentials.find(
					(c) => c.provider === 'stripe' && c.enabled && c.publishableKey
				);
				resolvedStripeKey = stripeCred?.publishableKey ?? null;

				const razorpayCred = credentials.find(
					(c) => c.provider === 'razorpay' && c.enabled && c.keyId
				);
				resolvedRazorpayKey = razorpayCred?.keyId ?? null;
			})
			.catch(() => {
				resolvedStripeKey = null;
				resolvedRazorpayKey = null;
				toast.error('Failed to load payment gateway credentials');
			})
			.finally(() => {
				isLoadingCredentials = false;
			});
	});

	// Initialize Stripe when method is 'stripe' (or tear down when switching away)
	$effect(() => {
		if (
			open &&
			mode === 'single' &&
			paymentMethod === 'stripe' &&
			effectiveStripeKey &&
			stripeCardContainer
		) {
			initStripe();
		}

		return () => {
			// Cleanup card element when switching away
			if (stripeCardElement) {
				stripeCardElement.unmount();
				stripeCardElement = null;
			}
			stripeElements = null;
		};
	});

	async function initStripe() {
		if (!effectiveStripeKey) return;
		if (stripeInstance) {
			mountStripeCard();
			return;
		}
		isStripeLoading = true;
		stripeError = '';
		try {
			const { loadStripe } = await import('@stripe/stripe-js');
			stripeInstance = await loadStripe(effectiveStripeKey);
			if (!stripeInstance) {
				stripeError = 'Failed to initialize Stripe';
				return;
			}
			mountStripeCard();
		} catch {
			stripeError = 'Failed to load Stripe';
		} finally {
			isStripeLoading = false;
		}
	}

	function mountStripeCard() {
		if (!stripeInstance || !stripeCardContainer) return;
		stripeElements = stripeInstance.elements();
		stripeCardElement = stripeElements.create('card', {
			style: {
				base: {
					fontSize: '16px',
					color: '#1a1a1a',
					'::placeholder': { color: '#6b7280' }
				}
			}
		});
		stripeCardElement.mount(stripeCardContainer);
		stripeCardElement.on('change', (event: any) => {
			stripeError = event.error ? event.error.message : '';
		});
	}

	async function handleStripePayment() {
		if (!stripeInstance || !stripeCardElement || !businessId) return;
		isStripeLoading = true;
		stripeError = '';
		try {
			// 1. Create a PaymentIntent on the backend
			const { clientSecret } = await createStripeIntent(businessId, {
				amount: Math.round(paymentAmount * 100), // Stripe expects cents
				currency,
				orderId
			});

			// 2. Confirm card payment with Stripe.js
			const { error, paymentIntent } = await stripeInstance.confirmCardPayment(clientSecret, {
				payment_method: { card: stripeCardElement }
			});

			if (error) {
				stripeError = error.message ?? 'Payment failed';
				return;
			}

			if (paymentIntent?.status === 'succeeded') {
				// 3. Notify backend
				await confirmStripePayment(businessId, { intentId: paymentIntent.id });
				toast.success('Stripe payment successful');
				onPaymentComplete({
					paymentMethod: 'stripe',
					amount: paymentAmount,
					remainingBalance: balanceDue - paymentAmount
				});
			} else {
				stripeError = `Payment status: ${paymentIntent?.status ?? 'unknown'}`;
			}
		} catch (err: any) {
			stripeError = err?.message ?? 'Payment failed';
		} finally {
			isStripeLoading = false;
		}
	}

	// Lazy-load the Razorpay Checkout script. Resolves once the global
	// `window.Razorpay` constructor is available.
	async function loadRazorpayScript(): Promise<void> {
		if (typeof window === 'undefined') return;
		if ((window as any).Razorpay) return;

		const existing = document.querySelector<HTMLScriptElement>(
			'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
		);
		if (existing) {
			// Wait for existing script to finish loading
			await new Promise<void>((resolve, reject) => {
				if ((window as any).Razorpay) return resolve();
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener(
					'error',
					() => reject(new Error('Failed to load Razorpay')),
					{ once: true }
				);
			});
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://checkout.razorpay.com/v1/checkout.js';
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Razorpay'));
			document.head.appendChild(script);
		});
	}

	async function handleRazorpayPayment() {
		if (!businessId || !resolvedRazorpayKey) return;
		isRazorpayLoading = true;
		razorpayError = '';
		try {
			// 1. Load the Razorpay Checkout widget (idempotent)
			await loadRazorpayScript();

			// 2. Create a Razorpay order on the backend
			const rzpOrder = await createRazorpayOrder(businessId, {
				orderId,
				amount: Math.round(paymentAmount * 100) // paise
			});

			// 3. Open the Razorpay checkout widget
			await new Promise<void>((resolve, reject) => {
				const rzp = new (window as any).Razorpay({
					key: resolvedRazorpayKey,
					amount: rzpOrder.amount,
					currency: rzpOrder.currency || 'INR',
					order_id: rzpOrder.razorpayOrderId,
					name: 'Order Payment',
					description: `Order #${orderNumber}`,
					handler: async (response: {
						razorpay_order_id: string;
						razorpay_payment_id: string;
						razorpay_signature: string;
					}) => {
						try {
							// 4. Verify the payment signature on the backend
							await verifyRazorpayPayment(businessId, {
								orderId,
								razorpay_order_id: response.razorpay_order_id,
								razorpay_payment_id: response.razorpay_payment_id,
								razorpay_signature: response.razorpay_signature
							});

							toast.success('Razorpay payment successful');
							onPaymentComplete({
								paymentMethod: 'razorpay',
								amount: paymentAmount,
								remainingBalance: balanceDue - paymentAmount,
								tipAmount: tipAmount > 0 ? tipAmount : undefined
							});
							resolve();
						} catch (err: any) {
							reject(err);
						}
					},
					modal: {
						ondismiss: () => {
							// User closed the widget without paying — not an error
							isRazorpayLoading = false;
						}
					},
					theme: { color: '#3b82f6' }
				});
				rzp.on('payment.failed', (response: any) => {
					reject(
						new Error(response?.error?.description ?? 'Razorpay payment failed')
					);
				});
				rzp.open();
			});
		} catch (err: any) {
			razorpayError = err?.message ?? 'Razorpay payment failed';
			toast.error(razorpayError);
		} finally {
			isRazorpayLoading = false;
		}
	}

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
		if (paymentMethod === 'card' && !transactionReference.trim()) {
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
			if (paymentMethod === 'card' && !transactionReference.trim()) {
				transactionRefError = 'Transaction reference is required for card payments';
				return;
			}
			if (!isValidSinglePayment()) return;
			onPaymentComplete({
				paymentMethod: paymentMethod as PaymentMethod,
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

	const methodIcons: Record<string, any> = {
		cash: IconCash,
		card: IconCreditCard,
		upi: IconDeviceMobile,
		net_banking: IconReceipt,
		wallet: IconReceipt,
		stripe: IconBrandStripe,
		razorpay: IconBuildingBank,
		other: IconReceipt
	};

	const methodLabels: Record<string, string> = {
		cash: 'Cash',
		card: 'Card',
		upi: 'UPI',
		net_banking: 'Net Banking',
		wallet: 'Wallet',
		stripe: 'Stripe',
		razorpay: 'Razorpay',
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
					<div class="flex items-center justify-between">
						<Label class="text-sm font-medium">Payment Method</Label>
						{#if isLoadingCredentials}
							<span class="flex items-center gap-1 text-xs text-muted-foreground">
								<IconLoader2 class="h-3 w-3 animate-spin" />
								Loading payment options...
							</span>
						{/if}
					</div>
					<div
						class="grid gap-2"
						style="grid-template-columns: repeat({availableMethods.length}, minmax(0, 1fr));"
					>
						{#each availableMethods as method}
							{@const MethodIcons = methodIcons[method] ?? IconReceipt}
							<button
								type="button"
								class="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors {paymentMethod ===
								method
									? 'border-primary bg-primary/10'
									: 'border-border hover:border-primary/50'}"
								onclick={() => (paymentMethod = method)}
							>
								<MethodIcons class="h-6 w-6" />
								<span class="text-xs font-medium">{methodLabels[method] ?? method}</span>
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
							<div class="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
								<p class="text-sm text-muted-foreground">Change to return:</p>
								<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
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

				<!-- Card Transaction Reference (required) -->
				{#if paymentMethod === 'card'}
					<div class="space-y-2">
						<Label for="transactionRef"
							>Transaction Reference <span class="text-destructive">*</span></Label
						>
						<Input
							id="transactionRef"
							type="text"
							bind:value={transactionReference}
							placeholder="Enter card transaction ID"
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

				<!-- UPI Reference (optional) -->
				{#if paymentMethod === 'upi'}
					<div class="space-y-2">
						<Label for="upiRef" class="text-sm">UTR / Reference Number <span class="text-muted-foreground font-normal">(optional)</span></Label>
						<Input
							id="upiRef"
							type="text"
							bind:value={transactionReference}
							placeholder="Enter UTR if available"
						/>
						<p class="text-xs text-muted-foreground">
							Not required — just confirm you received the payment
						</p>
					</div>
				{/if}

				<!-- Stripe Card Input -->
				{#if paymentMethod === 'stripe'}
					<div class="space-y-3">
						<Label class="text-sm font-medium">Card Details</Label>
						<div
							bind:this={stripeCardContainer}
							class="rounded-md border border-border bg-background p-3"
						></div>
						{#if isStripeLoading && !stripeCardElement}
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<IconLoader2 class="h-4 w-4 animate-spin" />
								Loading Stripe...
							</div>
						{/if}
						{#if stripeError}
							<p class="text-xs text-destructive">{stripeError}</p>
						{/if}
					</div>
				{/if}

				<!-- Razorpay Info -->
				{#if paymentMethod === 'razorpay'}
					<div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
						<div class="flex items-start gap-3">
							<IconBuildingBank class="mt-0.5 h-5 w-5 text-muted-foreground" />
							<div class="space-y-1">
								<p class="text-sm font-medium">Razorpay Checkout</p>
								<p class="text-xs text-muted-foreground">
									Clicking "Pay" will open the Razorpay secure checkout widget. The customer
									can pay with card, UPI, net banking, or wallets.
								</p>
							</div>
						</div>
						{#if razorpayError}
							<p class="text-xs text-destructive">{razorpayError}</p>
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
							<div class="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
								<span>Change:</span>
								<span>{i18n.formatCurrency(change)}</span>
							</div>
						{/if}
					{/if}
					{#if paymentAmount < balanceDue}
						<div class="mt-2 border-t border-border pt-2">
							<div class="flex justify-between text-sm text-amber-600 dark:text-amber-400">
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
										<p class="text-xs text-emerald-600 dark:text-emerald-400">
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
							<div class="flex justify-between text-sm text-amber-600 dark:text-amber-400">
								<span>{splitRemaining > 0 ? 'Remaining:' : 'Over by:'}</span>
								<span>{i18n.formatCurrency(Math.abs(splitRemaining))}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={onCancel}
				disabled={isProcessing || isStripeLoading || isRazorpayLoading}
			>
				Cancel
			</Button>
			{#if mode === 'single'}
				{#if paymentMethod === 'stripe'}
					<Button
						onclick={handleStripePayment}
						disabled={!stripeCardElement || isStripeLoading || isProcessing || paymentAmount <= 0}
					>
						{#if isStripeLoading}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						{isStripeLoading ? 'Processing...' : `Pay ${i18n.formatCurrency(paymentAmount)} with Stripe`}
					</Button>
				{:else if paymentMethod === 'razorpay'}
					<Button
						onclick={handleRazorpayPayment}
						disabled={isRazorpayLoading || isProcessing || paymentAmount <= 0 || !resolvedRazorpayKey}
					>
						{#if isRazorpayLoading}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						{isRazorpayLoading
							? 'Processing...'
							: `Pay ${i18n.formatCurrency(paymentAmount)} with Razorpay`}
					</Button>
				{:else}
					<Button onclick={handleSubmit} disabled={!isValidSinglePayment() || isProcessing}>
						{isProcessing ? 'Processing...' : `Pay ${i18n.formatCurrency(paymentAmount)}`}
					</Button>
				{/if}
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
