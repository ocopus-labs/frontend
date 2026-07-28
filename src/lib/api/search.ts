import { createApiClient, getApiClient } from './client';

export interface SearchResult {
	type: 'order' | 'menu_item' | 'team_member' | 'table' | 'expense' | 'inventory';
	id: string;
	title: string;
	subtitle?: string;
	status?: string;
	url: string;
}

export interface SearchResponse {
	query: string;
	results: SearchResult[];
	totalCount: number;
}

type FetchOption = { fetch?: typeof fetch };

export async function globalSearch(
	businessId: string,
	query: string,
	types?: string[],
	limit?: number,
	options?: FetchOption
): Promise<SearchResponse> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const params = new URLSearchParams();
	params.set('q', query);
	if (types?.length) params.set('types', types.join(','));
	if (limit) params.set('limit', String(limit));
	return api.get(`/business/${businessId}/search?${params.toString()}`);
}
