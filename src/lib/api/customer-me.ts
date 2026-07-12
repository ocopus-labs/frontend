import { getApiClient, createApiClient } from './client';

// ==================== TYPES ====================

export type CustomerProfile = {
	id: string;
	email: string | null;
	name: string | null;
	image: string | null;
	phoneNumber: string | null;
	phoneNumberVerified: boolean;
	createdAt: string;
};

export type LoyaltyEntry = {
	customerId: string;
	restaurantId: string;
	restaurantName: string;
	restaurantSlug: string;
	points: number;
	tier: string | null;
};

export type CustomerOrder = {
	id: string;
	orderNumber: string;
	status: string;
	paymentStatus: string;
	orderChannel: string | null;
	items: unknown;
	pricing: unknown;
	createdAt: string;
	restaurantId: string;
	restaurant?: { slug: string; name: string };
};

export type CustomerSession = {
	id: string;
	createdAt: string;
	updatedAt: string;
	expiresAt: string;
	ipAddress: string | null;
	userAgent: string | null;
	current: boolean;
};

type FetchOption = { fetch?: typeof fetch };

// ==================== API ====================

export async function getProfile(options?: FetchOption): Promise<CustomerProfile> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get('/customer-auth/me');
}

export async function getLoyalty(options?: FetchOption): Promise<{ loyalty: LoyaltyEntry[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get('/customer-auth/me/loyalty');
}

export async function getOrders(
	opts: { slug?: string; cursor?: string; limit?: number } = {},
	options?: FetchOption
): Promise<{ orders: CustomerOrder[]; nextCursor: string | null }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const params = new URLSearchParams();
	if (opts.slug) params.set('slug', opts.slug);
	if (opts.cursor) params.set('cursor', opts.cursor);
	if (opts.limit) params.set('limit', String(opts.limit));
	const qs = params.toString();
	return api.get(`/customer-auth/me/orders${qs ? '?' + qs : ''}`);
}

export async function getSessions(options?: FetchOption): Promise<{ sessions: CustomerSession[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get('/customer-auth/me/sessions');
}

export async function revokeSession(id: string, options?: FetchOption): Promise<{ revoked: true }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/customer-auth/me/sessions/${encodeURIComponent(id)}/revoke`);
}
