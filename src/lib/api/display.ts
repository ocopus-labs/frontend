import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface DisplayOrder {
	id: string;
	orderNumber: string;
	status: 'preparing' | 'ready';
	orderType: string;
	updatedAt: string;
}

export interface DisplayQueueResponse {
	businessName: string;
	businessLogo: string | null;
	businessId: string;
	orders: DisplayOrder[];
}

type FetchOption = { fetch?: typeof fetch };

// ==================== PUBLIC ENDPOINTS ====================

export async function getDisplayQueue(
	slug: string,
	options?: FetchOption
): Promise<DisplayQueueResponse> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/display/${slug}/queue`);
}
