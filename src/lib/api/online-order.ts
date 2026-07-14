import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface OnlineBusinessConfig {
	business: {
		id: string;
		name: string;
		slug: string;
		type: string;
		logo: string | null;
		description: string | null;
		currency: string;
	};
	onlineOrdering: {
		acceptsDelivery: boolean;
		acceptsTakeaway: boolean;
		minOrderAmount: number;
		acceptedPaymentMethods: string[];
		estimatedPrepTime: number;
		authEnabled?: boolean;
	};
	deliveryZones: Array<{
		id: string;
		name: string;
		deliveryFee: number;
		minOrderAmount: number;
		estimatedMinutes: number;
	}>;
	businessHours: any | null;
	paymentMethods: {
		dodo: boolean;
	};
	paymentGateways?: {
		stripe: { enabled: boolean; publishableKey: string | null; mode: 'test' | 'live' };
		razorpay: { enabled: boolean; keyId: string | null; mode: 'test' | 'live' };
		dodo: { enabled: boolean };
	};
}

export interface OnlineMenuItem {
	id: string;
	name: string;
	description?: string;
	price: number;
	image?: string;
	isVeg?: boolean;
	modifiers?: {
		sizes?: Array<{ id: string; name: string; price: number; isDefault?: boolean }>;
		spiceLevels?: Array<{ id: string; name: string; price: number; isDefault?: boolean }>;
		addOns?: Array<{ id: string; name: string; price: number }>;
	};
	tags?: string[];
}

export interface OnlineMenuCategory {
	id: string;
	name: string;
	description?: string;
	image?: string;
	items: OnlineMenuItem[];
}

export interface OnlineCheckoutPayload {
	items: Array<{
		menuItemId: string;
		name: string;
		quantity: number;
		basePrice: number;
		modifiers?: {
			size?: { id: string; name: string; price: number };
			spiceLevel?: { id: string; name: string; price: number };
			addOns?: Array<{ id: string; name: string; price: number }>;
			specialInstructions?: string;
		};
	}>;
	orderType: 'takeaway' | 'delivery';
	customerName: string;
	customerPhone: string;
	customerEmail?: string;
	deliveryAddress?: string;
	deliveryNotes?: string;
	paymentMethod: string;
	couponCode?: string;
}

export interface OnlineCheckoutResult {
	order: {
		id: string;
		orderNumber: string;
		status: string;
		paymentStatus: string;
		items: any[];
		pricing: any;
		discountsApplied?: any[];
		orderType: string;
		orderChannel: string;
		deliveryAddress: string | null;
		deliveryNotes: string | null;
		createdAt: string;
	};
	trackingToken: string;
	estimatedPrepTime: number;
	coupon?: {
		code: string;
		discountAmount: number;
		freeDelivery: boolean;
	};
}

export interface CouponPreview {
	code: string;
	description: string | null;
	discountType: 'flat' | 'percent' | 'free_delivery';
	discountAmount: number;
	freeDelivery: boolean;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== PUBLIC ONLINE ORDERING API ====================

export async function getOnlineMenu(
	slug: string,
	options?: FetchOption
): Promise<{ categories: OnlineMenuCategory[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/order-online/${slug}/menu`);
}

export async function getOnlineConfig(
	slug: string,
	options?: FetchOption
): Promise<OnlineBusinessConfig> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/order-online/${slug}/config`);
}

export async function onlineCheckout(
	slug: string,
	data: OnlineCheckoutPayload,
	options?: FetchOption
): Promise<OnlineCheckoutResult> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/order-online/${slug}/checkout`, data);
}

export async function previewOnlineCoupon(
	slug: string,
	data: { code: string; subtotal: number; orderType: 'takeaway' | 'delivery' },
	options?: FetchOption
): Promise<CouponPreview> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/order-online/${slug}/coupon/preview`, data);
}

export async function createOnlineOrderPaymentIntent(
	slug: string,
	data: { orderId: string; amount: number; currency: string; customerEmail?: string },
	options?: FetchOption
): Promise<{ clientSecret: string; intentId: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/order-online/${slug}/create-payment-intent`, data);
}

export async function createOnlineOrderRazorpayOrder(
	slug: string,
	data: { orderId: string; amount: number; currency: string },
	options?: FetchOption
): Promise<{ orderId: string; amount: number; currency: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/order-online/${slug}/create-razorpay-order`, data);
}

export async function verifyOnlineOrderRazorpayPayment(
	slug: string,
	data: {
		orderId: string;
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
	},
	options?: FetchOption
): Promise<{ verified: boolean; orderId: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/order-online/${slug}/verify-razorpay-payment`, data);
}
