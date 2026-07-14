<script lang="ts">
	import type { PageData } from './$types';
	import { APP_NAME } from '$lib/constants/config';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import {
		onlineCheckout,
		createOnlineOrderPaymentIntent,
		createOnlineOrderRazorpayOrder,
		verifyOnlineOrderRazorpayPayment,
		type OnlineBusinessConfig,
		type OnlineCheckoutPayload
	} from '$lib/api';
	import { useCustomerSession } from '$lib/customer-auth';
	import { listAddresses, type CustomerAddress } from '$lib/api/customer-me';
	import { AuthModal, PhoneVerifyGate } from '$lib/components/customer-auth';
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
	import LockIcon from '@lucide/svelte/icons/lock';

	let { data }: { data: PageData } = $props();

	// ── Customer auth ──
	const customerSession = useCustomerSession();
	let showAuthModal = $state(false);

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
	// Server-loaded config is authoritative; sessionStorage is a cache fallback for PWA/offline.
	let config = $state<OnlineBusinessConfig | null>(
		(data.config as unknown as OnlineBusinessConfig) ?? null
	);
	// Derive authEnabled from server config first; fall back to sessionStorage-loaded value below.
	let authEnabled = $state(
		!!(data.config as unknown as OnlineBusinessConfig | null)?.onlineOrdering?.authEnabled
	);
	let orderType = $state<'takeaway' | 'delivery'>('takeaway');
	let loaded = $state(false);

	// Load cart and config from storage
	$effect(() => {
		if (typeof window !== 'undefined' && !loaded) {
			loaded = true;

			// If the page was loaded via a Stripe 3DS return, skip the cart-missing
			// redirect — the dedicated 3DS handler will restore state from
			// sessionStorage and drive the success flow.
			const urlParams = new URLSearchParams(window.location.search);
			const isStripeReturn =
				urlParams.has('payment_intent') &&
				urlParams.has('payment_intent_client_secret') &&
				urlParams.has('redirect_status');

			// Cart is stored in localStorage so it survives auth redirects
			const cartKey = `online-cart:${slug}`;
			const saved = localStorage.getItem(cartKey);
			if (saved) {
				try {
					cart = JSON.parse(saved);
				} catch {
					/* ignore */
				}
			}

			// Use server-loaded config if available; fall back to sessionStorage for PWA/offline.
			if (!config) {
				const configKey = `online-config:${slug}`;
				const savedConfig = sessionStorage.getItem(configKey);
				if (savedConfig) {
					try {
						config = JSON.parse(savedConfig);
						authEnabled = !!(config as OnlineBusinessConfig)?.onlineOrdering?.authEnabled;
					} catch {
						/* ignore */
					}
				}
			}

			const savedType = localStorage.getItem(`online-order-type:${slug}`);
			if (savedType === 'takeaway' || savedType === 'delivery') {
				orderType = savedType;
			}

			// If no cart, go back to menu (unless we're resuming from 3DS).
			if (!isStripeReturn && (!saved || cart.length === 0)) {
				goto(`/${slug}`, { replaceState: true });
			}
		}
	});

	const business = $derived(config?.business);
	const onlineOrdering = $derived(config?.onlineOrdering);
	const deliveryZones = $derived(config?.deliveryZones || []);
	const acceptedPaymentMethods = $derived(onlineOrdering?.acceptedPaymentMethods || ['cash']);
	const paymentGateways = $derived(config?.paymentGateways);
	const stripeEnabled = $derived(
		!!paymentGateways?.stripe?.enabled && !!paymentGateways?.stripe?.publishableKey
	);
	const razorpayEnabled = $derived(
		!!paymentGateways?.razorpay?.enabled && !!paymentGateways?.razorpay?.keyId
	);
	const cashEnabled = $derived(acceptedPaymentMethods.includes('cash'));
	const hasAnyPaymentMethod = $derived(stripeEnabled || razorpayEnabled || cashEnabled);

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

	// Prefill from the signed-in customer's profile. Only fills blank fields so
	// a manual edit isn't overwritten if the session refreshes later.
	$effect(() => {
		const user = $customerSession?.data?.user as
			| {
					name?: string | null;
					email?: string | null;
					phoneNumber?: string | null;
					phone?: string | null;
			  }
			| undefined;
		if (!user) return;
		if (!customerName && user.name) customerName = user.name;
		if (!customerEmail && user.email) customerEmail = user.email;
		const sessionPhone = user.phoneNumber ?? user.phone;
		if (!customerPhone && sessionPhone) customerPhone = sessionPhone;
	});
	let deliveryAddress = $state('');
	let deliveryNotes = $state('');

	// ── Saved addresses (logged-in customers) ──
	let savedAddresses = $state<CustomerAddress[]>([]);
	let selectedAddressId = $state<string | null>(null);
	let addressesLoaded = $state(false);

	function formatSavedAddress(a: CustomerAddress): string {
		return [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');
	}

	function pickSavedAddress(a: CustomerAddress) {
		selectedAddressId = a.id;
		deliveryAddress = formatSavedAddress(a);
	}

	// Load saved addresses once the customer is authenticated; prefill with default.
	$effect(() => {
		const user = $customerSession?.data?.user;
		if (!user || addressesLoaded) return;
		addressesLoaded = true;
		listAddresses()
			.then((res) => {
				savedAddresses = res.addresses;
				const def = res.addresses.find((a) => a.isDefault) ?? res.addresses[0];
				if (def && !deliveryAddress.trim()) pickSavedAddress(def);
			})
			.catch(() => {
				/* non-blocking — customer can still type a new address */
			});
	});
	// Legacy acceptedPaymentMethods value (cash/online/upi/card) — kept for backward-compat payload
	let paymentMethod = $state('cash');
	// New gateway selector for the checkout UI
	let selectedPaymentMethod = $state<'stripe' | 'razorpay' | 'cash' | null>(null);
	let isSubmitting = $state(false);
	let isProcessingPayment = $state(false);
	let isVerifyingPayment = $state(false);
	let errorMessage = $state('');

	// Success state
	let orderSuccess = $state(false);
	let successData = $state<{
		orderNumber: string;
		trackingToken: string;
		estimatedPrepTime: number;
	} | null>(null);

	// Steps: details -> confirm -> payment (only used for stripe card-entry)
	let step = $state<'details' | 'confirm' | 'payment'>('details');
	const stepIndex = $derived(step === 'details' ? 0 : step === 'confirm' ? 1 : 2);

	// Stripe refs (not reactive)
	let stripeInstance: any = null;
	let stripeElementsInstance: any = null;
	// Reactive state that the template reads
	let stripeMountEl = $state<HTMLDivElement | null>(null);
	let pendingOrderId = $state<string | null>(null);
	let pendingTrackingToken = $state<string | null>(null);
	let pendingEstimatedPrepTime = $state(0);
	let pendingOrderNumber = $state<string | null>(null);

	function validatePhone(phone: string): boolean {
		return /^\+?[\d\s-]{7,20}$/.test(phone.trim());
	}

	function validateEmail(email: string): boolean {
		if (!email.trim()) return true; // optional
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
	}

	function handleContinue() {
		// If auth is required and user is not signed in, show the auth modal
		if (authEnabled && !$customerSession?.data?.user) {
			showAuthModal = true;
			return;
		}
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

		if (!selectedPaymentMethod) {
			errorMessage = 'Please select a payment method';
			return;
		}

		// Auth gate: if authEnabled and no session, open the modal
		if (authEnabled && !$customerSession?.data?.user) {
			showAuthModal = true;
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const result = await createOrderOnServer();
			const amount = result.order?.pricing?.total ?? cartTotal;
			const currency = business?.currency || 'INR';

			if (selectedPaymentMethod === 'cash') {
				showSuccess();
				return;
			}

			if (selectedPaymentMethod === 'stripe') {
				// Moves to payment step so Stripe Elements can be mounted
				await handleStripePayment(result.order.id, amount, currency);
				return;
			}

			if (selectedPaymentMethod === 'razorpay') {
				try {
					await handleRazorpayPayment(result.order.id, amount, currency);
					showSuccess();
				} catch (err: any) {
					errorMessage = err?.message || 'Razorpay payment was not completed.';
				}
				return;
			}
		} catch (err: any) {
			// Handle backend 401: session expired or not present
			if (err?.status === 401 || err?.statusCode === 401) {
				showAuthModal = true;
				errorMessage = '';
				return;
			}
			// Handle backend 403 with PHONE_VERIFICATION_REQUIRED:
			// PhoneVerifyGate renders automatically when session.data.user.phoneNumberVerified===false
			if (
				(err?.status === 403 || err?.statusCode === 403) &&
				err?.body?.code === 'PHONE_VERIFICATION_REQUIRED'
			) {
				errorMessage =
					'Please verify your phone number to place an order. Complete the verification in the dialog above.';
				return;
			}
			errorMessage = err?.message || 'Failed to place order. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function goBack() {
		if (step === 'payment') {
			step = 'confirm';
		} else if (step === 'confirm') {
			step = 'details';
		} else {
			goto(`/${slug}`);
		}
	}

	const paymentMethodLabels: Record<string, { label: string; icon: any }> = {
		cash: { label: 'Cash on Pickup/Delivery', icon: BanknoteIcon },
		online: { label: 'Pay Online', icon: CreditCardIcon },
		upi: { label: 'UPI', icon: WalletIcon },
		card: { label: 'Card', icon: CreditCardIcon },
		stripe: { label: 'Credit / Debit Card', icon: CreditCardIcon },
		razorpay: { label: 'UPI / Card / Wallet', icon: CreditCardIcon }
	};

	// Auto-select first available gateway when config loads
	$effect(() => {
		if (selectedPaymentMethod !== null) return;
		if (stripeEnabled) {
			selectedPaymentMethod = 'stripe';
		} else if (razorpayEnabled) {
			selectedPaymentMethod = 'razorpay';
		} else if (cashEnabled) {
			selectedPaymentMethod = 'cash';
		}
	});

	// Keep legacy paymentMethod in sync with gateway selection for the checkout payload
	$effect(() => {
		if (selectedPaymentMethod === 'cash') {
			paymentMethod = 'cash';
		} else if (selectedPaymentMethod === 'stripe' || selectedPaymentMethod === 'razorpay') {
			// Prefer 'online' if it's in acceptedPaymentMethods, else fallback to first
			if (acceptedPaymentMethods.includes('online')) {
				paymentMethod = 'online';
			} else if (acceptedPaymentMethods.includes('card')) {
				paymentMethod = 'card';
			} else {
				paymentMethod = acceptedPaymentMethods[0] ?? 'online';
			}
		}
	});

	// ── Stripe Elements mount ──
	$effect(() => {
		if (step !== 'payment' || selectedPaymentMethod !== 'stripe') return;
		if (!stripeMountEl || !stripeElementsInstance) return;
		try {
			const paymentElement = stripeElementsInstance.create('payment');
			paymentElement.mount(stripeMountEl);
		} catch (err) {
			console.error('Failed to mount Stripe element', err);
		}
	});

	// ── Stripe 3DS redirect return handling ──
	// When a customer returns from a 3D Secure challenge, Stripe appends
	// `payment_intent`, `payment_intent_client_secret`, and `redirect_status`
	// query params to the return URL. Resume the success flow when we see them.
	let has3dsReturnBeenHandled = false;
	$effect(() => {
		if (!browser || has3dsReturnBeenHandled) return;
		const urlParams = new URLSearchParams(window.location.search);
		const paymentIntentId = urlParams.get('payment_intent');
		const clientSecret = urlParams.get('payment_intent_client_secret');
		const redirectStatus = urlParams.get('redirect_status');
		if (paymentIntentId && clientSecret && redirectStatus) {
			has3dsReturnBeenHandled = true;
			void handleStripeReturn(paymentIntentId, clientSecret, redirectStatus);
		}
	});

	async function handleStripeReturn(_intentId: string, clientSecret: string, status: string) {
		// Clean up the URL FIRST so a refresh doesn't retrigger the handler.
		const cleanUrl = window.location.pathname;
		window.history.replaceState({}, '', cleanUrl);

		if (status === 'failed') {
			toast.error('Payment failed. Please try again.');
			clearPendingOrderStorage();
			return;
		}

		if (status !== 'succeeded') {
			// Any other status (e.g. `canceled`, `requires_payment_method`) — surface it
			// but don't clobber the user's cart so they can retry.
			toast.error('Payment was not completed. Please try again.');
			clearPendingOrderStorage();
			return;
		}

		isVerifyingPayment = true;
		try {
			const stripePubKey = paymentGateways?.stripe?.publishableKey;
			if (!stripePubKey) {
				toast.error('Unable to verify payment — Stripe is not configured');
				return;
			}

			const { loadStripe } = await import('@stripe/stripe-js');
			const stripe = await loadStripe(stripePubKey);
			if (!stripe) {
				toast.error('Unable to verify payment status');
				return;
			}

			const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
			if (error || !paymentIntent) {
				toast.error('Unable to verify payment status');
				clearPendingOrderStorage();
				return;
			}

			if (paymentIntent.status === 'succeeded') {
				// Restore context from sessionStorage
				const storedOrderId = sessionStorage.getItem(pendingOrderIdKey);
				const storedTrackingToken = sessionStorage.getItem(pendingTrackingTokenKey);
				const storedOrderNumber = sessionStorage.getItem(pendingOrderNumberKey);
				const storedPrepTime = sessionStorage.getItem(pendingPrepTimeKey);
				const storedCart = sessionStorage.getItem(pendingOrderCartKey);
				const storedOrderType = sessionStorage.getItem(pendingOrderTypeKey);
				const storedPaymentMethod = sessionStorage.getItem(pendingPaymentMethodKey);

				if (storedOrderId && storedTrackingToken) {
					pendingOrderId = storedOrderId;
					pendingTrackingToken = storedTrackingToken;
					pendingOrderNumber = storedOrderNumber ?? '';
					pendingEstimatedPrepTime = storedPrepTime ? Number(storedPrepTime) : 0;

					// Restore cart so the success page renders the correct line items
					if (storedCart) {
						try {
							cart = JSON.parse(storedCart);
						} catch {
							/* ignore — not critical for the success page */
						}
					}
					if (storedOrderType === 'takeaway' || storedOrderType === 'delivery') {
						orderType = storedOrderType;
					}
					if (
						storedPaymentMethod === 'stripe' ||
						storedPaymentMethod === 'razorpay' ||
						storedPaymentMethod === 'cash'
					) {
						selectedPaymentMethod = storedPaymentMethod;
					}

					// Mark loaded so the cart-missing effect doesn't redirect us to the menu
					loaded = true;

					showSuccess();
					toast.success('Payment successful!');
				} else {
					// Fallback — sessionStorage was cleared mid-flow.
					toast.success(
						'Payment succeeded, but we lost your session. Please check your email for the order confirmation or contact support.',
						{ duration: 10000 }
					);
					// Ensure we don't redirect to the menu while showing this message
					loaded = true;
				}
			} else if (paymentIntent.status === 'requires_payment_method') {
				toast.error('Payment failed. Please try a different payment method.');
				clearPendingOrderStorage();
			} else if (paymentIntent.status === 'processing') {
				toast.info('Your payment is still processing. We will email you once it is confirmed.');
			} else {
				toast.error('Payment was not completed.');
				clearPendingOrderStorage();
			}
		} finally {
			isVerifyingPayment = false;
		}
	}

	async function createOrderOnServer() {
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
		pendingOrderId = result.order.id;
		pendingOrderNumber = result.order.orderNumber;
		pendingTrackingToken = result.trackingToken;
		pendingEstimatedPrepTime = result.estimatedPrepTime;
		return result;
	}

	// SessionStorage keys used to resume the success flow after a Stripe 3DS redirect.
	const pendingOrderIdKey = $derived(`online-pending-order-id:${slug}`);
	const pendingTrackingTokenKey = $derived(`online-pending-tracking-token:${slug}`);
	const pendingOrderNumberKey = $derived(`online-pending-order-number:${slug}`);
	const pendingPrepTimeKey = $derived(`online-pending-prep-time:${slug}`);
	const pendingOrderCartKey = $derived(`online-pending-order-cart:${slug}`);
	const pendingOrderTypeKey = $derived(`online-pending-order-type:${slug}`);
	const pendingPaymentMethodKey = $derived(`online-pending-payment-method:${slug}`);

	function clearPendingOrderStorage() {
		if (typeof window === 'undefined') return;
		sessionStorage.removeItem(pendingOrderIdKey);
		sessionStorage.removeItem(pendingTrackingTokenKey);
		sessionStorage.removeItem(pendingOrderNumberKey);
		sessionStorage.removeItem(pendingPrepTimeKey);
		sessionStorage.removeItem(pendingOrderCartKey);
		sessionStorage.removeItem(pendingOrderTypeKey);
		sessionStorage.removeItem(pendingPaymentMethodKey);
	}

	function clearCartStorage() {
		if (typeof window !== 'undefined') {
			// Cart lives in localStorage (survives auth redirects)
			localStorage.removeItem(`online-cart:${slug}`);
			localStorage.removeItem(`online-order-type:${slug}`);
			sessionStorage.removeItem(`online-cart:${slug}`);
			sessionStorage.removeItem(`online-order-type:${slug}`);
		}
		// Also clear any lingering 3DS resume context so we never double-handle
		clearPendingOrderStorage();
	}

	function showSuccess() {
		clearCartStorage();
		orderSuccess = true;
		successData = {
			orderNumber: pendingOrderNumber ?? '',
			trackingToken: pendingTrackingToken ?? '',
			estimatedPrepTime: pendingEstimatedPrepTime
		};
	}

	async function handleStripePayment(orderId: string, amount: number, currency: string) {
		const stripePubKey = paymentGateways?.stripe?.publishableKey;
		if (!stripePubKey) throw new Error('Stripe is not configured');

		const { loadStripe } = await import('@stripe/stripe-js');
		const stripe = await loadStripe(stripePubKey);
		if (!stripe) throw new Error('Failed to load Stripe');

		const { clientSecret } = await createOnlineOrderPaymentIntent(slug, {
			orderId,
			amount,
			currency,
			customerEmail: customerEmail.trim() || undefined
		});

		stripeInstance = stripe;
		stripeElementsInstance = stripe.elements({ clientSecret });
		// Move to payment step so the mount element is rendered; $effect handles create+mount
		step = 'payment';
	}

	async function confirmStripeCardPayment() {
		if (!stripeInstance || !stripeElementsInstance) {
			errorMessage = 'Stripe is not ready yet';
			return;
		}
		isProcessingPayment = true;
		errorMessage = '';
		try {
			// Persist context so we can resume the success flow if Stripe redirects
			// the customer away for 3D Secure authentication.
			if (typeof window !== 'undefined' && pendingOrderId && pendingTrackingToken) {
				sessionStorage.setItem(pendingOrderIdKey, pendingOrderId);
				sessionStorage.setItem(pendingTrackingTokenKey, pendingTrackingToken);
				if (pendingOrderNumber) {
					sessionStorage.setItem(pendingOrderNumberKey, pendingOrderNumber);
				}
				sessionStorage.setItem(pendingPrepTimeKey, String(pendingEstimatedPrepTime));
				sessionStorage.setItem(pendingOrderCartKey, JSON.stringify(cart));
				sessionStorage.setItem(pendingOrderTypeKey, orderType);
				sessionStorage.setItem(pendingPaymentMethodKey, 'stripe');
			}

			// Use a clean return URL (strip any existing query params) so the 3DS
			// handler receives only Stripe's return params.
			const returnUrl = `${window.location.origin}${window.location.pathname}`;

			const { error, paymentIntent } = await stripeInstance.confirmPayment({
				elements: stripeElementsInstance,
				confirmParams: { return_url: returnUrl },
				redirect: 'if_required'
			});
			if (error) {
				// No redirect happened — clean up the pending context we just stored
				clearPendingOrderStorage();
				throw new Error(error.message || 'Payment failed');
			}
			if (paymentIntent && paymentIntent.status === 'succeeded') {
				showSuccess();
			} else {
				clearPendingOrderStorage();
				throw new Error('Payment was not completed');
			}
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to process payment';
		} finally {
			isProcessingPayment = false;
		}
	}

	async function handleRazorpayPayment(orderId: string, amount: number, currency: string) {
		const razorpayKeyId = paymentGateways?.razorpay?.keyId;
		if (!razorpayKeyId) throw new Error('Razorpay is not configured');

		// Create a Razorpay order on the server first. This binds the Razorpay
		// order to our server-validated amount and enables strong signature
		// verification on success.
		const rzpOrder = await createOnlineOrderRazorpayOrder(slug, {
			orderId,
			amount,
			currency
		});

		if (!(window as any).Razorpay) {
			await new Promise<void>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = 'https://checkout.razorpay.com/v1/checkout.js';
				script.onload = () => resolve();
				script.onerror = () => reject(new Error('Failed to load Razorpay'));
				document.head.appendChild(script);
			});
		}

		const response = await new Promise<{
			razorpay_order_id: string;
			razorpay_payment_id: string;
			razorpay_signature: string;
		}>((resolve, reject) => {
			const rzp = new (window as any).Razorpay({
				key: razorpayKeyId,
				order_id: rzpOrder.orderId,
				amount: rzpOrder.amount,
				currency: rzpOrder.currency,
				name: business?.name || 'Order',
				description: `Order ${pendingOrderNumber ?? orderId}`,
				prefill: {
					name: customerName.trim(),
					email: customerEmail.trim(),
					contact: customerPhone.trim()
				},
				theme: { color: '#6366f1' },
				handler: (resp: any) => resolve(resp),
				modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
			});
			rzp.open();
		});

		// Verify signature on the server before considering the payment done.
		const verification = await verifyOnlineOrderRazorpayPayment(slug, {
			orderId,
			razorpay_order_id: response.razorpay_order_id,
			razorpay_payment_id: response.razorpay_payment_id,
			razorpay_signature: response.razorpay_signature
		});

		if (!verification.verified) {
			throw new Error('Payment signature verification failed');
		}

		return response;
	}
</script>

<!-- AuthModal: opens when authEnabled and user is not signed in -->
{#if authEnabled}
	<AuthModal
		bind:open={showAuthModal}
		onSuccess={() => {
			showAuthModal = false;
		}}
	/>
{/if}

<!-- PhoneVerifyGate: passthrough wrapper; shows blocking dialog when a Google-signed-in
     user hasn't verified their phone yet. Only active when authEnabled. -->
<PhoneVerifyGate {authEnabled}>
	{#if isVerifyingPayment && !orderSuccess}
		<!-- Verifying payment (returning from Stripe 3DS) -->
		<div class="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-6">
			<div class="w-full max-w-sm text-center">
				<div
					class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
				>
					<Loader2Icon class="h-8 w-8 animate-spin text-primary" />
				</div>
				<h1 class="text-xl font-bold text-foreground">Verifying payment...</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Please wait while we confirm your payment. Do not close or refresh this page.
				</p>
			</div>
		</div>
	{:else if orderSuccess && successData}
		<!-- Success Page -->
		<div class="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-6">
			<div class="w-full max-w-md text-center">
				<div
					class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15"
				>
					<CircleCheckBigIcon class="h-10 w-10 text-success" />
				</div>
				<h1 class="text-2xl font-bold text-foreground">Order Placed!</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Your order <span class="font-semibold text-foreground">{successData.orderNumber}</span> has
					been received.
				</p>

				<div class="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
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
							<span class="font-medium">
								{#if selectedPaymentMethod}
									{paymentMethodLabels[selectedPaymentMethod]?.label || selectedPaymentMethod}
								{:else}
									{paymentMethod}
								{/if}
							</span>
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
						class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
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
		<div class="flex min-h-svh flex-col bg-muted/40">
			<!-- Header -->
			<header class="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
				<div class="flex items-center gap-3 px-4 py-3">
					<button
						onclick={goBack}
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-muted transition-colors hover:bg-muted"
						aria-label="Go back"
					>
						<ArrowLeftIcon class="h-4 w-4" />
					</button>
					<div class="min-w-0 flex-1">
						<h1 class="text-base font-bold">
							{#if step === 'details'}Checkout{:else if step === 'confirm'}Confirm Order{:else}Payment{/if}
						</h1>
						{#if business}
							<p class="truncate text-xs text-muted-foreground">{business.name}</p>
						{/if}
					</div>
				</div>

				<!-- Step indicator -->
				<div class="flex items-center gap-2 px-4 pb-3">
					{#each ['Details', 'Confirm', 'Payment'] as label, i}
						{@const active = i <= stepIndex}
						{@const isLast = i === 2}
						<div class="flex items-center gap-2 {isLast ? '' : 'flex-1'}">
							<div class="flex items-center gap-1.5">
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors {active
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'}"
								>
									{#if i < stepIndex}
										<CheckCircle2Icon class="h-3.5 w-3.5" />
									{:else}
										{i + 1}
									{/if}
								</div>
								<span
									class="text-xs font-medium {active ? 'text-primary' : 'text-muted-foreground'}"
									>{label}</span
								>
							</div>
							{#if !isLast}
								<div
									class="h-0.5 flex-1 rounded-full {i < stepIndex ? 'bg-primary' : 'bg-muted'}"
								></div>
							{/if}
						</div>
					{/each}
				</div>
			</header>

			<div class="flex-1 space-y-4 px-4 py-4">
				{#if errorMessage}
					<div
						class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					>
						<span class="shrink-0 text-lg">!</span>
						{errorMessage}
					</div>
				{/if}

				<!-- Step 1: Details -->
				{#if step === 'details'}
					<!-- Order Type Badge -->
					<div class="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
						{#if orderType === 'delivery'}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
							>
								<TruckIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p class="text-sm font-semibold">Delivery Order</p>
								<p class="text-xs text-muted-foreground">We'll deliver to your address</p>
							</div>
						{:else}
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
								<PackageIcon class="h-4 w-4 text-success" />
							</div>
							<div>
								<p class="text-sm font-semibold">Takeaway Order</p>
								<p class="text-xs text-muted-foreground">Pick up from the store</p>
							</div>
						{/if}
					</div>

					<!-- Customer Details -->
					<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
								<label for="name" class="text-xs font-semibold text-muted-foreground">Name *</label>
								<div class="relative">
									<UserIcon
										class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
									/>
									<input
										id="name"
										type="text"
										bind:value={customerName}
										placeholder="Enter your name"
										class="h-11 w-full rounded-xl border border-border bg-muted/40 pr-4 pl-10 text-sm transition-colors outline-none focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>
							<div class="space-y-1.5">
								<label for="phone" class="text-xs font-semibold text-muted-foreground"
									>Phone *</label
								>
								<div class="relative">
									<PhoneIcon
										class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
									/>
									<input
										id="phone"
										type="tel"
										bind:value={customerPhone}
										placeholder="+91 XXXXX XXXXX"
										class="h-11 w-full rounded-xl border border-border bg-muted/40 pr-4 pl-10 text-sm transition-colors outline-none focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>
							<div class="space-y-1.5">
								<label for="email" class="text-xs font-semibold text-muted-foreground"
									>Email (optional)</label
								>
								<div class="relative">
									<MailIcon
										class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
									/>
									<input
										id="email"
										type="email"
										bind:value={customerEmail}
										placeholder="your@email.com"
										class="h-11 w-full rounded-xl border border-border bg-muted/40 pr-4 pl-10 text-sm transition-colors outline-none focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Delivery Address (if delivery) -->
					{#if orderType === 'delivery'}
						<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
							<div class="mb-4 flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
								>
									<MapPinIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<h2 class="text-sm font-bold">Delivery Address</h2>
									<p class="text-xs text-muted-foreground">Where should we deliver your order?</p>
								</div>
							</div>
							<div class="space-y-4">
								{#if savedAddresses.length > 0}
									<div class="space-y-2">
										<span class="text-xs font-semibold text-muted-foreground">Saved addresses</span>
										<div class="grid gap-2">
											{#each savedAddresses as a (a.id)}
												<button
													type="button"
													class="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors {selectedAddressId ===
													a.id
														? 'border-primary bg-primary/5'
														: 'border-border bg-muted/40 hover:border-primary/40'}"
													onclick={() => pickSavedAddress(a)}
												>
													<MapPinIcon
														class="mt-0.5 h-4 w-4 shrink-0 {selectedAddressId === a.id
															? 'text-primary'
															: 'text-muted-foreground'}"
													/>
													<span class="min-w-0">
														<span class="flex items-center gap-1.5">
															<span class="text-sm font-semibold">{a.label}</span>
															{#if a.isDefault}
																<span
																	class="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success"
																	>Default</span
																>
															{/if}
														</span>
														<span class="mt-0.5 block text-xs text-muted-foreground"
															>{formatSavedAddress(a)}</span
														>
													</span>
												</button>
											{/each}
											<button
												type="button"
												class="rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary {selectedAddressId ===
												null
													? 'border-primary text-primary'
													: ''}"
												onclick={() => {
													selectedAddressId = null;
													deliveryAddress = '';
												}}
											>
												+ Use a new address
											</button>
										</div>
									</div>
								{/if}
								<div class="space-y-1.5">
									<label for="address" class="text-xs font-semibold text-muted-foreground"
										>Full Address *</label
									>
									<textarea
										id="address"
										bind:value={deliveryAddress}
										oninput={() => (selectedAddressId = null)}
										placeholder="House/flat number, street, area, landmark..."
										rows="3"
										class="w-full resize-none rounded-xl border border-border bg-muted/40 p-3 text-sm transition-colors outline-none focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
									></textarea>
								</div>
								<div class="space-y-1.5">
									<label for="notes" class="text-xs font-semibold text-muted-foreground"
										>Delivery Notes (optional)</label
									>
									<div class="relative">
										<NotepadTextIcon class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
										<input
											id="notes"
											type="text"
											bind:value={deliveryNotes}
											placeholder="Ring the bell, call on arrival..."
											class="h-11 w-full rounded-xl border border-border bg-muted/40 pr-4 pl-10 text-sm transition-colors outline-none focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
										/>
									</div>
								</div>

								<!-- Delivery zones info -->
								{#if deliveryZones.length > 0}
									<div class="rounded-xl bg-blue-50/50 p-3 dark:bg-blue-900/10">
										<p class="mb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
											Delivery Zones
										</p>
										<div class="space-y-1">
											{#each deliveryZones as zone}
												<div class="flex items-center justify-between text-xs">
													<span class="text-blue-700 dark:text-blue-400">{zone.name}</span>
													<div class="flex items-center gap-2 text-blue-600 dark:text-blue-300">
														{#if zone.deliveryFee > 0}
															<span>Fee: {formatPrice(zone.deliveryFee)}</span>
														{:else}
															<span class="text-success">Free</span>
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
					<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
							{#if stripeEnabled}
								<button
									type="button"
									class="flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all {selectedPaymentMethod ===
									'stripe'
										? 'border-primary bg-primary/5'
										: 'border-border hover:border-border'}"
									onclick={() => (selectedPaymentMethod = 'stripe')}
								>
									<div
										class="flex h-5 w-5 items-center justify-center rounded-full border-2 {selectedPaymentMethod ===
										'stripe'
											? 'border-primary'
											: 'border-input'}"
									>
										{#if selectedPaymentMethod === 'stripe'}
											<div class="h-2.5 w-2.5 rounded-full bg-primary"></div>
										{/if}
									</div>
									<CreditCardIcon class="h-4 w-4 text-muted-foreground" />
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium">Credit / Debit Card</div>
										<div class="text-[11px] text-muted-foreground">Secured by Stripe</div>
									</div>
									{#if paymentGateways?.stripe?.mode === 'test'}
										<span
											class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>TEST</span
										>
									{/if}
								</button>
							{/if}

							{#if razorpayEnabled}
								<button
									type="button"
									class="flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all {selectedPaymentMethod ===
									'razorpay'
										? 'border-primary bg-primary/5'
										: 'border-border hover:border-border'}"
									onclick={() => (selectedPaymentMethod = 'razorpay')}
								>
									<div
										class="flex h-5 w-5 items-center justify-center rounded-full border-2 {selectedPaymentMethod ===
										'razorpay'
											? 'border-primary'
											: 'border-input'}"
									>
										{#if selectedPaymentMethod === 'razorpay'}
											<div class="h-2.5 w-2.5 rounded-full bg-primary"></div>
										{/if}
									</div>
									<WalletIcon class="h-4 w-4 text-muted-foreground" />
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium">UPI / Card / Wallet</div>
										<div class="text-[11px] text-muted-foreground">Secured by Razorpay</div>
									</div>
									{#if paymentGateways?.razorpay?.mode === 'test'}
										<span
											class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>TEST</span
										>
									{/if}
								</button>
							{/if}

							{#if cashEnabled}
								<button
									type="button"
									class="flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all {selectedPaymentMethod ===
									'cash'
										? 'border-primary bg-primary/5'
										: 'border-border hover:border-border'}"
									onclick={() => (selectedPaymentMethod = 'cash')}
								>
									<div
										class="flex h-5 w-5 items-center justify-center rounded-full border-2 {selectedPaymentMethod ===
										'cash'
											? 'border-primary'
											: 'border-input'}"
									>
										{#if selectedPaymentMethod === 'cash'}
											<div class="h-2.5 w-2.5 rounded-full bg-primary"></div>
										{/if}
									</div>
									<BanknoteIcon class="h-4 w-4 text-muted-foreground" />
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium">Pay at Pickup / Delivery</div>
										<div class="text-[11px] text-muted-foreground">Cash on arrival</div>
									</div>
								</button>
							{/if}

							{#if !hasAnyPaymentMethod}
								<p class="text-xs text-muted-foreground">
									No payment methods are configured for this business.
								</p>
							{/if}
						</div>
					</div>

					<!-- Order Summary -->
					<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
													<span
														class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
													>
														{item.modifiers.size.name}
													</span>
												{/if}
												{#if item.modifiers.spiceLevel}
													<span
														class="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
													>
														{item.modifiers.spiceLevel.name}
													</span>
												{/if}
												{#if item.modifiers.addOns?.length}
													{#each item.modifiers.addOns as addOn}
														<span
															class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
														>
															+{addOn.name}
														</span>
													{/each}
												{/if}
											</div>
											{#if item.modifiers.specialInstructions}
												<p class="mt-0.5 text-[10px] text-muted-foreground italic">
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
							<div class="mt-2 flex justify-between border-t border-dashed pt-2.5">
								<span class="text-sm font-bold">Subtotal</span>
								<span class="text-sm font-bold text-primary">{formatPrice(cartTotal)}</span>
							</div>
							<p class="text-[11px] text-muted-foreground">
								Taxes will be calculated and added to the final total.
							</p>
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
					<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
						<div class="mb-4 flex items-center gap-2">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
								<ShieldCheckIcon class="h-4 w-4 text-success" />
							</div>
							<h2 class="text-sm font-bold">Review your order</h2>
						</div>

						<!-- Customer details -->
						<div class="mb-4 rounded-xl bg-muted/40 p-3">
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
									<span class="font-medium">
										{#if selectedPaymentMethod}
											{paymentMethodLabels[selectedPaymentMethod]?.label || selectedPaymentMethod}
										{:else}
											Not selected
										{/if}
									</span>
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
													<span
														class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
													>
														{item.modifiers.size.name}
													</span>
												{/if}
												{#if item.modifiers.spiceLevel}
													<span
														class="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
													>
														{item.modifiers.spiceLevel.name}
													</span>
												{/if}
												{#if item.modifiers.addOns?.length}
													{#each item.modifiers.addOns as addOn}
														<span
															class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
														>
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

						<div class="mt-3 flex justify-between border-t border-dashed pt-3">
							<span class="font-bold">Subtotal</span>
							<span class="text-lg font-bold text-primary">{formatPrice(cartTotal)}</span>
						</div>
						<p class="mt-1 text-[11px] text-muted-foreground">
							Taxes will be added to the final total.
						</p>
					</div>

					{#if onlineOrdering?.estimatedPrepTime}
						<div class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
							>
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
						disabled={isSubmitting || !selectedPaymentMethod}
					>
						{#if isSubmitting}
							<Loader2Icon class="h-4 w-4 animate-spin" />
							Placing Order...
						{:else if selectedPaymentMethod === 'cash'}
							<CheckCircle2Icon class="h-4 w-4" />
							Place Order
						{:else}
							<LockIcon class="h-4 w-4" />
							Pay {formatPrice(cartTotal)}
						{/if}
					</button>

					<!-- Step 3: Payment (Stripe Elements) -->
				{:else if step === 'payment'}
					<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
						<div class="mb-4 flex items-center gap-2">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
								<LockIcon class="h-4 w-4 text-primary" />
							</div>
							<div>
								<h2 class="text-sm font-bold">Secure Payment</h2>
								<p class="text-xs text-muted-foreground">
									{#if pendingOrderNumber}
										Order {pendingOrderNumber} ·
									{/if}
									{formatPrice(cartTotal)}
								</p>
							</div>
						</div>

						<div id="stripe-payment-element" bind:this={stripeMountEl} class="min-h-[200px]"></div>

						<p class="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
							<ShieldCheckIcon class="h-3 w-3" />
							Your payment information is encrypted and processed securely by Stripe.
						</p>
					</div>

					<button
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
						onclick={confirmStripeCardPayment}
						disabled={isProcessingPayment}
					>
						{#if isProcessingPayment}
							<Loader2Icon class="h-4 w-4 animate-spin" />
							Processing Payment...
						{:else}
							<LockIcon class="h-4 w-4" />
							Pay {formatPrice(cartTotal)}
						{/if}
					</button>

					<p class="text-center text-[11px] text-muted-foreground">
						Your order has been reserved. Complete the payment above to confirm.
					</p>
				{/if}
			</div>

			<!-- Footer -->
			<footer class="border-t bg-card px-4 py-3 text-center">
				<p class="text-[11px] text-muted-foreground">Powered by {APP_NAME}</p>
			</footer>
		</div>
	{/if}
</PhoneVerifyGate>
