<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onlineCheckout, type OnlineBusinessConfig, type OnlineCheckoutPayload } from '$lib/api';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UserIcon from '@lucide/svelte/icons/user';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import MailIcon from '@lucide/svelte/icons/mail';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import PackageIcon from '@lucide/svelte/icons/package';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import BanknoteIcon from '@lucide/svelte/icons/banknote';
	import CircleCheckBigIcon from '@lucide/svelte/icons/circle-check-big';
	import NotepadTextIcon from '@lucide/svelte/icons/notepad-text';
	import StoreIcon from '@lucide/svelte/icons/store';

	const slug = $derived(page.params.slug ?? '');

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
	let config = $state<OnlineBusinessConfig | null>(null);
	let orderType = $state<'takeaway' | 'delivery'>('takeaway');
	let loaded = $state(false);

	// Load cart and config from sessionStorage
	$effect(() => {
		if (typeof window !== 'undefined' && !loaded) {
			loaded = true;
			const cartKey = `online-cart:${slug}`;
			const saved = sessionStorage.getItem(cartKey);
			if (saved) {
				try {
					cart = JSON.parse(saved);
				} catch {
					/* ignore */
				}
			}

			const configKey = `online-config:${slug}`;
			const savedConfig = sessionStorage.getItem(configKey);
			if (savedConfig) {
				try {
					config = JSON.parse(savedConfig);
				} catch {
					/* ignore */
				}
			}

			const savedType = sessionStorage.getItem(`online-order-type:${slug}`);
			if (savedType === 'takeaway' || savedType === 'delivery') {
				orderType = savedType;
			}

			// If no cart, go back to menu
			if (!saved || cart.length === 0) {
				goto(`/${slug}`, { replaceState: true });
			}
		}
	});

	const business = $derived(config?.business);
	const onlineOrdering = $derived(config?.onlineOrdering);
	const deliveryZones = $derived(config?.deliveryZones || []);
	const acceptedPaymentMethods = $derived(onlineOrdering?.acceptedPaymentMethods || ['cash']);

	const cartTotal = $derived(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
	const cartItemCount = $derived(cart.reduce((sum, item) => sum + item.quantity, 0));

	function formatPrice(amount: number) {
		const cur = business?.currency || 'INR';
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: cur,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// ── Form state ──
	let customerName = $state('');
	let customerPhone = $state('');
	let customerEmail = $state('');
	let deliveryAddress = $state('');
	let deliveryNotes = $state('');
	let paymentMethod = $state('cash');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Success state
	let orderSuccess = $state(false);
	let successData = $state<{
		orderNumber: string;
		trackingToken: string;
		estimatedPrepTime: number;
	} | null>(null);

	// Steps: details -> confirm
	let step = $state<'details' | 'confirm'>('details');

	function validatePhone(phone: string): boolean {
		return /^\+?[\d\s-]{7,20}$/.test(phone.trim());
	}

	function validateEmail(email: string): boolean {
		if (!email.trim()) return true; // optional
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
	}

	function handleContinue() {
		if (!customerName.trim()) {
			errorMessage = 'Please enter your name';
			return;
		}
		if (!validatePhone(customerPhone)) {
			errorMessage = 'Please enter a valid phone number';
			return;
		}
		if (!validateEmail(customerEmail)) {
			errorMessage = 'Please enter a valid email address';
			return;
		}
		if (orderType === 'delivery' && !deliveryAddress.trim()) {
			errorMessage = 'Please enter a delivery address';
			return;
		}
		errorMessage = '';
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
			const payload: OnlineCheckoutPayload = {
				orderType,
				customerName: customerName.trim(),
				customerPhone: customerPhone.trim(),
				customerEmail: customerEmail.trim() || undefined,
				paymentMethod,
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
				})),
				...(orderType === 'delivery' && {
					deliveryAddress: deliveryAddress.trim(),
					deliveryNotes: deliveryNotes.trim() || undefined
				})
			};

			const result = await onlineCheckout(slug, payload);

			// Clear cart
			if (typeof window !== 'undefined') {
				sessionStorage.removeItem(`online-cart:${slug}`);
				sessionStorage.removeItem(`online-order-type:${slug}`);
			}

			// Show success
			orderSuccess = true;
			successData = {
				orderNumber: result.order.orderNumber,
				trackingToken: result.trackingToken,
				estimatedPrepTime: result.estimatedPrepTime
			};
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to place order. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function goBack() {
		if (step === 'confirm') {
			step = 'details';
		} else {
			goto(`/${slug}`);
		}
	}

	const paymentMethodLabels: Record<string, { label: string; icon: any }> = {
		cash: { label: 'Cash on Pickup/Delivery', icon: BanknoteIcon },
		online: { label: 'Pay Online', icon: CreditCardIcon },
		upi: { label: 'UPI', icon: WalletIcon },
		card: { label: 'Card', icon: CreditCardIcon }
	};

	// Auto-select first available payment method
	$effect(() => {
		if (acceptedPaymentMethods.length > 0 && !acceptedPaymentMethods.includes(paymentMethod)) {
			paymentMethod = acceptedPaymentMethods[0];
		}
	});
</script>

{#if orderSuccess && successData}
	<!-- Success Page -->
	<div class="flex min-h-svh flex-col items-center justify-center bg-gray-50 px-6 dark:bg-background">
		<div class="w-full max-w-md text-center">
			<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
				<CircleCheckBigIcon class="h-10 w-10 text-green-600 dark:text-green-400" />
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-foreground">Order Placed!</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Your order <span class="font-semibold text-foreground">{successData.orderNumber}</span> has been received.
			</p>

			<div class="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
				<div class="space-y-3">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Order Type</span>
						<span class="flex items-center gap-1.5 font-medium capitalize">
							{#if orderType === 'delivery'}
								<TruckIcon class="h-3.5 w-3.5" />
							{:else}
								<PackageIcon class="h-3.5 w-3.5" />
							{/if}
							{orderType}
						</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Estimated Time</span>
						<span class="flex items-center gap-1.5 font-medium">
							<ClockIcon class="h-3.5 w-3.5" />
							~{successData.estimatedPrepTime} min
						</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Payment</span>
						<span class="font-medium capitalize">{paymentMethod}</span>
					</div>
				</div>
			</div>

			<div class="mt-6 space-y-3">
				<a
					href="/order/track/{successData.trackingToken}"
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98]"
				>
					Track Your Order
				</a>
				<button
					class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-border dark:bg-card dark:text-foreground"
					onclick={() => goto(`/${slug}`)}
				>
					Order More
				</button>
			</div>

			<p class="mt-6 text-xs text-muted-foreground">
				You can track your order status using the link above.
			</p>
		</div>
	</div>
{:else}
	<!-- Checkout Flow -->
	<div class="flex min-h-svh flex-col bg-gray-50 dark:bg-background">
		<!-- Header -->
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
				<div class="min-w-0 flex-1">
					<h1 class="text-base font-bold">
						{#if step === 'details'}Checkout{:else}Confirm Order{/if}
					</h1>
					{#if business}
						<p class="truncate text-xs text-muted-foreground">{business.name}</p>
					{/if}
				</div>
			</div>

			<!-- Step indicator -->
			<div class="flex items-center gap-2 px-4 pb-3">
				{#each ['Details', 'Confirm'] as label, i}
					{@const active = i <= (step === 'details' ? 0 : 1)}
					{@const isLast = i === 1}
					<div class="flex items-center gap-2 {isLast ? '' : 'flex-1'}">
						<div class="flex items-center gap-1.5">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors {active
									? 'bg-primary text-primary-foreground'
									: 'bg-gray-200 text-gray-500 dark:bg-muted dark:text-muted-foreground'}"
							>
								{#if i < (step === 'details' ? 0 : 1)}
									<CheckCircle2Icon class="h-3.5 w-3.5" />
								{:else}
									{i + 1}
								{/if}
							</div>
							<span class="text-xs font-medium {active ? 'text-primary' : 'text-gray-400'}">{label}</span>
						</div>
						{#if !isLast}
							<div class="h-0.5 flex-1 rounded-full {step === 'confirm' ? 'bg-primary' : 'bg-gray-200 dark:bg-muted'}"></div>
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

			<!-- Step 1: Details -->
			{#if step === 'details'}
				<!-- Order Type Badge -->
				<div class="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-border dark:bg-card">
					{#if orderType === 'delivery'}
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
							<TruckIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<p class="text-sm font-semibold">Delivery Order</p>
							<p class="text-xs text-muted-foreground">We'll deliver to your address</p>
						</div>
					{:else}
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
							<PackageIcon class="h-4 w-4 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<p class="text-sm font-semibold">Takeaway Order</p>
							<p class="text-xs text-muted-foreground">Pick up from the store</p>
						</div>
					{/if}
				</div>

				<!-- Customer Details -->
				<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
					<div class="mb-4 flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<UserIcon class="h-4 w-4 text-primary" />
						</div>
						<div>
							<h2 class="text-sm font-bold">Your Details</h2>
							<p class="text-xs text-muted-foreground">So we can reach you about your order</p>
						</div>
					</div>
					<div class="space-y-4">
						<div class="space-y-1.5">
							<label for="name" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Name *</label>
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
							<label for="phone" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Phone *</label>
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
						<div class="space-y-1.5">
							<label for="email" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Email (optional)</label>
							<div class="relative">
								<MailIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								<input
									id="email"
									type="email"
									bind:value={customerEmail}
									placeholder="your@email.com"
									class="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:border-border dark:bg-muted"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Delivery Address (if delivery) -->
				{#if orderType === 'delivery'}
					<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
						<div class="mb-4 flex items-center gap-2">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
								<MapPinIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<h2 class="text-sm font-bold">Delivery Address</h2>
								<p class="text-xs text-muted-foreground">Where should we deliver your order?</p>
							</div>
						</div>
						<div class="space-y-4">
							<div class="space-y-1.5">
								<label for="address" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Full Address *</label>
								<textarea
									id="address"
									bind:value={deliveryAddress}
									placeholder="House/flat number, street, area, landmark..."
									rows="3"
									class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:border-border dark:bg-muted"
								></textarea>
							</div>
							<div class="space-y-1.5">
								<label for="notes" class="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Delivery Notes (optional)</label>
								<div class="relative">
									<NotepadTextIcon class="absolute left-3 top-3 h-4 w-4 text-gray-400" />
									<input
										id="notes"
										type="text"
										bind:value={deliveryNotes}
										placeholder="Ring the bell, call on arrival..."
										class="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary dark:border-border dark:bg-muted"
									/>
								</div>
							</div>

							<!-- Delivery zones info -->
							{#if deliveryZones.length > 0}
								<div class="rounded-xl bg-blue-50/50 p-3 dark:bg-blue-900/10">
									<p class="mb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">Delivery Zones</p>
									<div class="space-y-1">
										{#each deliveryZones as zone}
											<div class="flex items-center justify-between text-xs">
												<span class="text-blue-700 dark:text-blue-400">{zone.name}</span>
												<div class="flex items-center gap-2 text-blue-600 dark:text-blue-300">
													{#if zone.deliveryFee > 0}
														<span>Fee: {formatPrice(zone.deliveryFee)}</span>
													{:else}
														<span class="text-green-600">Free</span>
													{/if}
													{#if zone.estimatedMinutes}
														<span>~{zone.estimatedMinutes} min</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
									<p class="mt-1.5 text-[10px] text-blue-500 dark:text-blue-400">
										Delivery fee will be confirmed after order placement based on your zone.
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Payment Method -->
				{#if acceptedPaymentMethods.length > 1}
					<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
						<div class="mb-4 flex items-center gap-2">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
								<WalletIcon class="h-4 w-4 text-primary" />
							</div>
							<div>
								<h2 class="text-sm font-bold">Payment Method</h2>
								<p class="text-xs text-muted-foreground">How would you like to pay?</p>
							</div>
						</div>
						<div class="space-y-2">
							{#each acceptedPaymentMethods as method}
								{@const info = paymentMethodLabels[method] || { label: method, icon: WalletIcon }}
								<button
									class="flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all {paymentMethod === method
										? 'border-primary bg-primary/5'
										: 'border-gray-100 hover:border-gray-200 dark:border-border'}"
									onclick={() => (paymentMethod = method)}
								>
									<div
										class="flex h-5 w-5 items-center justify-center rounded-full border-2 {paymentMethod === method
											? 'border-primary'
											: 'border-gray-300 dark:border-muted-foreground'}"
									>
										{#if paymentMethod === method}
											<div class="h-2.5 w-2.5 rounded-full bg-primary"></div>
										{/if}
									</div>
									<info.icon class="h-4 w-4 text-gray-500" />
									<span class="text-sm font-medium">{info.label}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Order Summary -->
				<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
					<div class="mb-3 flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<ReceiptIcon class="h-4 w-4 text-primary" />
						</div>
						<div>
							<h2 class="text-sm font-bold">Order Summary</h2>
							<p class="text-xs text-muted-foreground">{cartItemCount} items</p>
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
							<span class="text-sm font-bold">Subtotal</span>
							<span class="text-sm font-bold text-primary">{formatPrice(cartTotal)}</span>
						</div>
						<p class="text-[11px] text-muted-foreground">Taxes will be calculated and added to the final total.</p>
					</div>
				</div>

				<button
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98]"
					onclick={handleContinue}
				>
					Continue
				</button>

			<!-- Step 2: Confirm -->
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
							{#if customerEmail}
								<div class="flex items-center justify-between">
									<span class="flex items-center gap-1.5 text-muted-foreground">
										<MailIcon class="h-3.5 w-3.5" />
										Email
									</span>
									<span class="font-medium">{customerEmail}</span>
								</div>
							{/if}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Order Type</span>
								<span class="flex items-center gap-1 font-medium capitalize">
									{#if orderType === 'delivery'}
										<TruckIcon class="h-3 w-3" />
									{:else}
										<PackageIcon class="h-3 w-3" />
									{/if}
									{orderType}
								</span>
							</div>
							{#if orderType === 'delivery' && deliveryAddress}
								<div class="flex items-start justify-between gap-4">
									<span class="flex shrink-0 items-center gap-1.5 text-muted-foreground">
										<MapPinIcon class="h-3.5 w-3.5" />
										Address
									</span>
									<span class="text-right text-xs font-medium">{deliveryAddress}</span>
								</div>
							{/if}
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-1.5 text-muted-foreground">
									<WalletIcon class="h-3.5 w-3.5" />
									Payment
								</span>
								<span class="font-medium capitalize">{paymentMethodLabels[paymentMethod]?.label || paymentMethod}</span>
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
						<span class="font-bold">Subtotal</span>
						<span class="text-lg font-bold text-primary">{formatPrice(cartTotal)}</span>
					</div>
					<p class="mt-1 text-[11px] text-muted-foreground">Taxes will be added to the final total.</p>
				</div>

				{#if onlineOrdering?.estimatedPrepTime}
					<div class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-border dark:bg-card">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<ClockIcon class="h-5 w-5 text-primary" />
						</div>
						<div>
							<p class="text-sm font-semibold">Estimated preparation time</p>
							<p class="text-xs text-muted-foreground">
								Your order will be ready in approximately {onlineOrdering.estimatedPrepTime} minutes.
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
						Placing Order...
					{:else}
						<CheckCircle2Icon class="h-4 w-4" />
						Place Order
					{/if}
				</button>
			{/if}
		</div>

		<!-- Footer -->
		<footer class="border-t bg-white px-4 py-3 text-center dark:bg-card">
			<p class="text-[11px] text-muted-foreground">
				Powered by RestaurantPro
			</p>
		</footer>
	</div>
{/if}
