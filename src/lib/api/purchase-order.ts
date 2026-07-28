import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type PurchaseOrderStatus =
	'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
	id: string;
	purchaseOrderId: string;
	inventoryItemId: string;
	quantity: number;
	unitPrice: number;
	receivedQuantity: number;
	inventoryItem: {
		id: string;
		name: string;
		sku: string;
		unit: string;
	};
}

export interface PurchaseOrder {
	id: string;
	restaurantId: string;
	supplierId: string;
	orderNumber: string;
	status: PurchaseOrderStatus;
	orderDate: string;
	expectedDate?: string | null;
	totalAmount: number;
	notes?: string | null;
	createdBy: string;
	items: PurchaseOrderItem[];
	createdAt: string;
	updatedAt: string;
}

export interface CreatePurchaseOrderItemPayload {
	inventoryItemId: string;
	quantity: number;
	unitPrice: number;
}

export interface CreatePurchaseOrderPayload {
	supplierId: string;
	orderDate: string;
	expectedDate?: string;
	notes?: string;
	items: CreatePurchaseOrderItemPayload[];
}

export interface ReceiveItemPayload {
	purchaseOrderItemId: string;
	receivedQuantity: number;
}

export interface ReceiveItemsPayload {
	items: ReceiveItemPayload[];
}

export interface AutoReorderRule {
	id: string;
	restaurantId: string;
	inventoryItemId: string;
	reorderPoint: number;
	reorderQuantity: number;
	enabled: boolean;
	inventoryItem: {
		id: string;
		name: string;
		sku: string;
		unit: string;
	};
	createdAt: string;
	updatedAt: string;
}

export interface CreateAutoReorderRulePayload {
	inventoryItemId: string;
	reorderPoint: number;
	reorderQuantity: number;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== PURCHASE ORDER CRUD ====================

export async function getPurchaseOrders(
	businessId: string,
	params?: {
		status?: PurchaseOrderStatus;
		limit?: number;
		offset?: number;
	},
	options?: FetchOption
): Promise<{ orders: PurchaseOrder[]; total: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
	if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/purchase-orders?${query}`
		: `/business/${businessId}/purchase-orders`;
	return api.get(url);
}

export async function getPurchaseOrder(
	businessId: string,
	poId: string,
	options?: FetchOption
): Promise<{ purchaseOrder: PurchaseOrder }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/purchase-orders/${poId}`);
}

export async function createPurchaseOrder(
	businessId: string,
	data: CreatePurchaseOrderPayload,
	options?: FetchOption
): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/purchase-orders`, data);
}

export async function markPurchaseOrderSent(
	businessId: string,
	poId: string,
	options?: FetchOption
): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/purchase-orders/${poId}/send`);
}

export async function receivePurchaseOrderItems(
	businessId: string,
	poId: string,
	data: ReceiveItemsPayload,
	options?: FetchOption
): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/purchase-orders/${poId}/receive`, data);
}

export async function cancelPurchaseOrder(
	businessId: string,
	poId: string,
	options?: FetchOption
): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/purchase-orders/${poId}/cancel`);
}

// ==================== AUTO-REORDER RULES ====================

export async function getAutoReorderRules(
	businessId: string,
	options?: FetchOption
): Promise<{ rules: AutoReorderRule[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/purchase-orders/auto-reorder/rules`);
}

export async function upsertAutoReorderRule(
	businessId: string,
	data: CreateAutoReorderRulePayload,
	options?: FetchOption
): Promise<{ message: string; rule: AutoReorderRule }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/purchase-orders/auto-reorder/rules`, data);
}
