import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface CashTransaction {
	id: string;
	type: 'payment' | 'refund' | 'payout' | 'adjustment';
	amount: number;
	orderId?: string;
	orderNumber?: string;
	paymentId?: string;
	description?: string;
	performedBy: string;
	performedAt: string;
}

export interface CashDrawerSession {
	id: string;
	restaurantId: string;
	status: 'open' | 'closed';
	openingAmount: number;
	expectedAmount?: number;
	actualAmount?: number;
	difference?: number;
	denominations?: Record<string, number>;
	cashIn: CashTransaction[];
	cashOut: CashTransaction[];
	notes?: string;
	openedAt: string;
	closedAt?: string;
	openedBy: { id: string; name: string; email: string };
	closedBy?: { id: string; name: string; email: string };
}

type FetchOption = { fetch?: typeof fetch };

// ==================== CASH DRAWER ====================

export async function openDrawer(
	businessId: string,
	openingAmount: number,
	options?: FetchOption
): Promise<{ message: string; session: CashDrawerSession }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/cash-drawer/open`, { openingAmount });
}

export async function getCurrentSession(
	businessId: string,
	options?: FetchOption
): Promise<{ session: CashDrawerSession | null }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/cash-drawer/current`);
}

export async function closeDrawer(
	businessId: string,
	data: {
		actualAmount: number;
		denominations?: Record<string, number>;
		notes?: string;
	},
	options?: FetchOption
): Promise<{ message: string; session: CashDrawerSession }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/cash-drawer/close`, data);
}

export async function getDrawerHistory(
	businessId: string,
	params?: { limit?: number; offset?: number },
	options?: FetchOption
): Promise<{ sessions: CashDrawerSession[]; total: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.offset) searchParams.set('offset', params.offset.toString());
	const query = searchParams.toString();
	return api.get(`/business/${businessId}/cash-drawer/history${query ? `?${query}` : ''}`);
}

export async function getDrawerSession(
	businessId: string,
	sessionId: string,
	options?: FetchOption
): Promise<{ session: CashDrawerSession }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/cash-drawer/${sessionId}`);
}
