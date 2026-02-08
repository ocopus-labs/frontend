<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		placeCustomerOrder,
		generateCustomerPaymentQr,
		createDodoPaymentCheckout,
		type CustomerPlaceOrderPayload
	} from '$lib/api';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UserIcon from '@lucide/svelte/icons/user';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import StoreIcon from '@lucide/svelte/icons/store';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';

	const slug = $derived(page.params.slug ?? '');
	const tableNumber = $derived(page.params.tableNumber ?? '');

	// ── Types ──
	interface CartModifiers {
		size?: { id: string; name: string; price: number };
		spiceLevel?: { id: string; name: string; price: number };
		addOns?: Array<{ id: string; name: string; price: number }>;
		specialInstructions?: string;
	}

	interface CartItem {
		cartId: string;
		menuItemId: string;
		name: string;
		image?: string;
		quantity: number;
		basePrice: number;
		modifiers?: CartModifiers;
		unitPrice: number;
	}

	// ── State ──
	let cart = $state<CartItem[]>([]);
	let businessInfo = $state<any>(null);

	// Load cart and business info
	$effect(() => {
		if (typeof window !== 'undefined') {
			const cartKey = `cart:${slug}:${tableNumber}`;
			const saved = sessionStorage.getItem(cartKey);
			if (saved) {
				try {
					cart = JSON.parse(saved);
				} catch {
					/* ignore */
				}
			}

			const bizKey = `business:${slug}`;
			const savedBiz = sessionStorage.getItem(bizKey);
			if (savedBiz) {
				try {
					businessInfo = JSON.parse(savedBiz);
				} catch {
					/* ignore */
				}
			}
		}
	});

	const cartTotal = $derived(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
	const cartItemCount = $derived(cart.reduce((sum, item) => sum + item.quantity, 0));
	const hasDodo = $derived(!!businessInfo?.paymentMethods?.dodo);
	const requirePrepayment = $derived(!!businessInfo?.ordering?.requirePrepayment);

	function formatPrice(amount: number) {
		const currency = businessInfo?.currency || 'INR';
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// ── Form state ──
	let customerName = $state('');
	let customerPhone = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// UPI payment state (fallback when Dodo not available)
	let upiDeepLink = $state<string | null>(null);
	let isLoadingUpi = $state(false);

	// Steps: if Dodo + prepay → identify → confirm → place+redirect
	// If no Dodo + prepay → identify → payment(UPI) → confirm
	// If postpay → identify → confirm → place
	let step = $state<'identify' | 'payment' | 'confirm'>('identify');

	function validatePhone(phone: string): boolean {
		return /^\+?[\d\s-]{7,20}$/.test(phone.trim());
	}

	async function handleIdentify() {
		if (!customerName.trim()) {
			errorMessage = 'Please enter your name';
			return;
		}
		if (!validatePhone(customerPhone)) {
			errorMessage = 'Please enter a valid phone number';
			return;
		}
		errorMessage = '';

		if (requirePrepayment && !hasDodo) {
			// No Dodo → show UPI deep link step
			step = 'payment';
			isLoadingUpi = true;
			try {
				const result = await generateCustomerPaymentQr(
					slug,
					cartTotal,
					`Order for Table ${tableNumber}`
				);
				upiDeepLink = result.upiString; // upi://pay?pa=...&am=...
			} catch {
				upiDeepLink = null;
			} finally {
				isLoadingUpi = false;
			}
		} else {
			// Dodo available or postpay → go straight to confirm
			step = 'confirm';
		}
	}

	async function handlePaymentDone() {
		step = 'confirm';
	}

	async function handlePlaceOrder() {
		if (cart.length === 0) {
			errorMessage = 'Your cart is empty';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const payload: CustomerPlaceOrderPayload = {
				tableNumber,
				customerName: customerName.trim(),
				customerPhone: customerPhone.trim(),
				items: cart.map((item) => ({
					menuItemId: item.menuItemId,
					name: item.name,
					quantity: item.quantity,
					basePrice: item.basePrice,
					modifiers: item.modifiers
						? {
								size: item.modifiers.size,
								spiceLevel: item.modifiers.spiceLevel,
								addOns: item.modifiers.addOns,
								specialInstructions: item.modifiers.specialInstructions
							}
						: undefined
				}))
			};

			const result = await placeCustomerOrder(slug, payload);

			if (typeof window !== 'undefined') {
				sessionStorage.removeItem(`cart:${slug}:${tableNumber}`);
			}

			// If prepay + Dodo → create checkout session and redirect
			if (requirePrepayment && hasDodo) {
				try {
					const trackingUrl = `${window.location.origin}/order/track/${result.trackingToken}`;
					const checkout = await createDodoPaymentCheckout(
						result.trackingToken,
						trackingUrl
					);

					if (checkout.checkoutUrl) {
						window.location.href = checkout.checkoutUrl;
						return;
					}
				} catch (err) {
					// Dodo failed → still go to tracking, customer can pay later
					console.error('Dodo checkout failed:', err);
				}
			}

			// Default: go to tracking page
			goto(`/order/track/${result.trackingToken}`);
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to place order. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function goBack() {
		if (step === 'payment') {
			step = 'identify';
		} else if (step === 'confirm') {
			step = requirePrepayment && !hasDodo ? 'payment' : 'identify';
		} else {
			goto(`/order/${slug}/${tableNumber}`);
		}
	}

	// Step labels adapt based on payment flow
	const showPaymentStep = $derived(requirePrepayment && !hasDodo);
	const stepLabels = $derived(showPaymentStep ? ['Details', 'Payment', 'Confirm'] : ['Details', 'Confirm']);
	const currentStepIdx = $derived(
		showPaymentStep
			? step === 'identify'
				? 0
				: step === 'payment'
					? 1
					: 2
			: step === 'identify'
				? 0
				: 1
	);
</script>

<div class="flex min-h-svh flex-col bg-gray-50 dark:bg-background">
	<!-- ═══ Header ═══ -->
	<header
		class="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:bg-background/95"
	>
		<div class="flex items-center gap-3 px-4 py-3">
			<button
				onclick={goBack}
				class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-muted"
				aria-label="Go back"
			>
				<ArrowLeftIcon class="h-4 w-4" />
			</button>
			<h1 class="text-base font-bold">
				{#if step === 'identify'}Your Details
				{:else if step === 'payment'}Payment
				{:else}Confirm Order
				{/if}
			</h1>
		</div>

		<!-- Step indicator -->
		<div class="flex items-center gap-2 px-4 pb-3">
			{#each stepLabels as label, i}
				{@const active = i <= currentStepIdx}
				{@const isLast = i === stepLabels.length - 1}
				<div class="flex items-center gap-2 {isLast ? '' : 'flex-1'}">
					<div class="flex items-center gap-1.5">
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors {active
								? 'bg-primary text-primary-foreground'
								: 'bg-gray-200 text-gray-500 dark:bg-muted dark:text-muted-foreground'}"
						>
							{#if i < currentStepIdx}
								<CheckCircle2Icon class="h-3.5 w-3.5" />
							{:else}
								{i + 1}
							{/if}
						</div>
						<span class="text-xs font-medium {active ? 'text-primary' : 'text-gray-400'}">{label}</span>
					</div>
					{#if !isLast}
						<div class="h-0.5 flex-1 rounded-full {i < currentStepIdx ? 'bg-primary' : 'bg-gray-200 dark:bg-muted'}"></div>
					{/if}
				</div>
			{/each}
		</div>
	</header>

	<div class="flex-1 px-4 py-4 space-y-4">
		{#if errorMessage}
			<div class="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
				<span class="shrink-0 text-lg">!</span>
				{errorMessage}
			</div>
		{/if}

		<!-- ═══ Step 1: Identify ═══ -->
		{#if step === 'identify'}
			<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
				<div class="mb-4 flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
						<UserIcon class="h-4 w-4 text-primary" />
					</div>
					<div>
						<h2 class="text-sm font-bold">Enter your details</h2>
						<p class="text-xs text-muted-foreground">So we know who this order belongs to</p>
					</div>
				</div>
				<div class="space-y-4">
					<div class="space-y-1.5">
						<label for="name" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Your Name</label>
						<div class="relative">
							<UserIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<input
								id="name"
								type="text"
								bind:value={customerName}
								placeholder="Enter your name"
								class="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:border-border dark:bg-muted"
							/>
						</div>
					</div>
					<div class="space-y-1.5">
						<label for="phone" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Phone Number</label>
						<div class="relative">
							<PhoneIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<input
								id="phone"
								type="tel"
								bind:value={customerPhone}
								placeholder="+91 XXXXX XXXXX"
								class="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:border-border dark:bg-muted"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Order Summary -->
			<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
				<div class="mb-3 flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
						<ReceiptIcon class="h-4 w-4 text-primary" />
					</div>
					<div>
						<h2 class="text-sm font-bold">Order Summary</h2>
						<p class="text-xs text-muted-foreground">Table {tableNumber} &middot; {cartItemCount} items</p>
					</div>
				</div>
				<div class="space-y-2.5">
					{#each cart as item (item.cartId)}
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<span class="text-sm font-medium">{item.name}</span>
									<span class="text-xs text-muted-foreground">x{item.quantity}</span>
								</div>
								{#if item.modifiers}
									<div class="mt-0.5 flex flex-wrap gap-1">
										{#if item.modifiers.size}
											<span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-muted dark:text-muted-foreground">
												{item.modifiers.size.name}
											</span>
										{/if}
										{#if item.modifiers.spiceLevel}
											<span class="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-600 dark:bg-orange-900/20 dark:text-orange-300">
												{item.modifiers.spiceLevel.name}
											</span>
										{/if}
										{#if item.modifiers.addOns?.length}
											{#each item.modifiers.addOns as addOn}
												<span class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
													+{addOn.name}
												</span>
											{/each}
										{/if}
									</div>
									{#if item.modifiers.specialInstructions}
										<p class="mt-0.5 text-[10px] italic text-muted-foreground">
											"{item.modifiers.specialInstructions}"
										</p>
									{/if}
								{/if}
							</div>
							<span class="shrink-0 text-sm font-semibold">
								{formatPrice(item.unitPrice * item.quantity)}
							</span>
						</div>
					{/each}
					<div class="mt-2 border-t border-dashed pt-2.5 flex justify-between">
						<span class="text-sm font-bold">Total</span>
						<span class="text-sm font-bold text-primary">{formatPrice(cartTotal)}</span>
					</div>
				</div>
			</div>

			<button
				class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98]"
				onclick={handleIdentify}
			>
				Continue
			</button>

		<!-- ═══ Step 2: Payment (UPI deep link — only when Dodo not available) ═══ -->
		{:else if step === 'payment'}
			<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
				<div class="mb-4 flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
						<WalletIcon class="h-4 w-4 text-primary" />
					</div>
					<div>
						<h2 class="text-sm font-bold">Pay via UPI</h2>
						<p class="text-xs text-muted-foreground">Tap to open your UPI app</p>
					</div>
				</div>

				<!-- Amount display -->
				<div class="mb-5 rounded-xl bg-primary/5 px-4 py-3 text-center">
					<p class="text-xs text-muted-foreground">Amount to pay</p>
					<p class="text-2xl font-bold text-primary">{formatPrice(cartTotal)}</p>
				</div>

				{#if isLoadingUpi}
					<div class="flex items-center justify-center py-8">
						<Loader2Icon class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else if upiDeepLink}
					<!-- Primary: Open any UPI app -->
					<a
						href={upiDeepLink}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5f259f] px-5 py-3.5 font-semibold text-white shadow-lg transition-all active:scale-[0.98]"
					>
						<WalletIcon class="h-5 w-5" />
						Pay with UPI App
					</a>
					<p class="mt-3 text-center text-[11px] text-muted-foreground">
						Opens GPay, PhonePe, Paytm or your default UPI app
					</p>
				{:else}
					<div class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-6 py-8">
						<StoreIcon class="h-8 w-8 text-gray-300" />
						<p class="text-center text-xs text-muted-foreground">
							UPI payment not configured. You can pay at the counter.
						</p>
					</div>
				{/if}
			</div>

			<div class="space-y-2">
				<button
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98]"
					onclick={handlePaymentDone}
				>
					<CheckCircle2Icon class="h-4 w-4" />
					I've completed payment
				</button>
				<button
					class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-border dark:bg-card dark:text-foreground"
					onclick={() => (step = 'confirm')}
				>
					<StoreIcon class="h-4 w-4" />
					Pay at counter instead
				</button>
			</div>

		<!-- ═══ Step 3: Confirm ═══ -->
		{:else if step === 'confirm'}
			<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
				<div class="mb-4 flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
						<ShieldCheckIcon class="h-4 w-4 text-green-600 dark:text-green-400" />
					</div>
					<h2 class="text-sm font-bold">Review your order</h2>
				</div>

				<!-- Customer details -->
				<div class="mb-4 rounded-xl bg-gray-50 p-3 dark:bg-muted/50">
					<div class="grid gap-2 text-sm">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-1.5 text-muted-foreground">
								<UserIcon class="h-3.5 w-3.5" />
								Name
							</span>
							<span class="font-medium">{customerName}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-1.5 text-muted-foreground">
								<PhoneIcon class="h-3.5 w-3.5" />
								Phone
							</span>
							<span class="font-medium">{customerPhone}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Table</span>
							<span class="font-medium">{tableNumber}</span>
						</div>
					</div>
				</div>

				<!-- Items -->
				<div class="space-y-2.5">
					{#each cart as item (item.cartId)}
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<span class="text-sm font-medium">{item.name}</span>
									<span class="text-xs text-muted-foreground">x{item.quantity}</span>
								</div>
								{#if item.modifiers}
									<div class="mt-0.5 flex flex-wrap gap-1">
										{#if item.modifiers.size}
											<span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-muted dark:text-muted-foreground">
												{item.modifiers.size.name}
											</span>
										{/if}
										{#if item.modifiers.spiceLevel}
											<span class="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-600 dark:bg-orange-900/20 dark:text-orange-300">
												{item.modifiers.spiceLevel.name}
											</span>
										{/if}
										{#if item.modifiers.addOns?.length}
											{#each item.modifiers.addOns as addOn}
												<span class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
													+{addOn.name}
												</span>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
							<span class="shrink-0 text-sm font-semibold">
								{formatPrice(item.unitPrice * item.quantity)}
							</span>
						</div>
					{/each}
				</div>

				<div class="mt-3 border-t border-dashed pt-3 flex justify-between">
					<span class="font-bold">Total</span>
					<span class="text-lg font-bold text-primary">{formatPrice(cartTotal)}</span>
				</div>
			</div>

			<!-- Payment info banner -->
			{#if requirePrepayment && hasDodo}
				<div class="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
						<CreditCardIcon class="h-5 w-5 text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<p class="text-sm font-semibold text-blue-800 dark:text-blue-300">Secure online payment</p>
						<p class="text-xs text-blue-600 dark:text-blue-400">
							You'll be redirected to a secure payment page after placing your order.
						</p>
					</div>
				</div>
			{/if}

			<button
				class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
				onclick={handlePlaceOrder}
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<Loader2Icon class="h-4 w-4 animate-spin" />
					{requirePrepayment && hasDodo ? 'Redirecting to payment...' : 'Placing Order...'}
				{:else if requirePrepayment && hasDodo}
					<CreditCardIcon class="h-4 w-4" />
					Place Order & Pay
				{:else}
					<CheckCircle2Icon class="h-4 w-4" />
					Place Order
				{/if}
			</button>
		{/if}
	</div>
</div>
