import { createApiClient, getApiClient } from './client';
import type { OrderItem, OrderPricing } from './order';

// ==================== TYPES ====================

export interface PublicBusiness {
	id: string;
	name: string;
	slug: string;
	type: string;
	logo: string | null;
	description: string | null;
	currency: string;
	ordering: {
		requirePrepayment: boolean;
	};
	paymentMethods?: {
		dodo: boolean;
	};
}

export interface PublicMenuItem {
	id: string;
	name: string;
	description?: string;
	price: number;
	image?: string;
	isAvailable: boolean;
	isVegetarian?: boolean;
	isVegan?: boolean;
	isGlutenFree?: boolean;
	preparationTime?: number;
	modifiers?: {
		sizes?: Array<{ id: string; name: string; price: number; isDefault?: boolean }>;
		spiceLevels?: Array<{ id: string; name: string; price: number; isDefault?: boolean }>;
		addOns?: Array<{ id: string; name: string; price: number }>;
	};
}

export interface PublicMenuCategory {
	id: string;
	name: string;
	description?: string;
	image?: string;
	items: PublicMenuItem[];
}

export interface CustomerOrderResult {
	order: {
		id: string;
		orderNumber: string;
		status: string;
		paymentStatus: string;
		items: OrderItem[];
		pricing: OrderPricing;
		tableNumber: string;
		createdAt: string;
	};
	trackingToken: string;
}

export interface OrderTracking {
	order: {
		id: string;
		orderNumber: string;
		status: string;
		paymentStatus: string;
		items: OrderItem[];
		pricing: OrderPricing;
		tableNumber: string;
		createdAt: string;
		updatedAt: string;
		estimatedCompletionTime?: string;
	};
}

export interface CustomerPlaceOrderPayload {
	tableNumber: string;
	customerName: string;
	customerPhone: string;
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
	specialInstructions?: string;
}

export interface OrderingSettings {
	selfOrderEnabled: boolean;
	requirePrepayment: boolean;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== PUBLIC CUSTOMER API ====================

export async function getPublicBusinessInfo(
	slug: string,
	options?: FetchOption
): Promise<{ business: PublicBusiness }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/public/order/${slug}`);
}

export async function getPublicMenu(
	slug: string,
	options?: FetchOption
): Promise<{ categories: PublicMenuCategory[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/public/order/${slug}/menu`);
}

export async function placeCustomerOrder(
	slug: string,
	data: CustomerPlaceOrderPayload,
	options?: FetchOption
): Promise<CustomerOrderResult> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/public/order/${slug}/place`, data);
}

export async function getOrderTracking(
	trackingToken: string,
	options?: FetchOption
): Promise<OrderTracking> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/public/order/track/${trackingToken}`);
}

export async function createCustomerPayment(
	trackingToken: string,
	data: { amount: number; method: string; transactionReference?: string },
	options?: FetchOption
): Promise<{ payment: unknown; message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/public/order/track/${trackingToken}/payment`, data);
}

export async function generateCustomerPaymentQr(
	slug: string,
	amount: number,
	note?: string,
	options?: FetchOption
): Promise<{ dataUrl: string; upiString: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/public/order/${slug}/payment-qr`, { amount, note });
}

export async function createDodoPaymentCheckout(
	trackingToken: string,
	returnUrl: string,
	options?: FetchOption
): Promise<{ checkoutUrl: string | null; sessionId?: string; message?: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/public/order/pay/${trackingToken}/checkout`, { returnUrl });
}

// ==================== PROTECTED ORDERING SETTINGS API ====================

export async function getOrderingSettings(
	businessId: string,
	options?: FetchOption
): Promise<{ settings: OrderingSettings }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/ordering/settings`);
}

export async function updateOrderingSettings(
	businessId: string,
	data: Partial<OrderingSettings>,
	options?: FetchOption
): Promise<{ settings: OrderingSettings }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.put(`/business/${businessId}/ordering/settings`, data);
}

export async function submitOrderFeedback(
	trackingToken: string,
	feedback: { rating: number; comment?: string },
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/public/order/track/${trackingToken}/feedback`, feedback);
}
