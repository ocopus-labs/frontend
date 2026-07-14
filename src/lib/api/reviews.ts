import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface MenuItemReview {
	id: string;
	menuItemId: string;
	rating: number;
	comment: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PublicReview {
	id: string;
	rating: number;
	comment: string | null;
	createdAt: string;
	authorName: string;
}

export interface ItemReviewsResult {
	avgRating: number | null;
	reviewCount: number;
	reviews: PublicReview[];
}

export interface AdminReview {
	id: string;
	menuItemId: string;
	menuItemName: string;
	rating: number;
	comment: string | null;
	createdAt: string;
	authorName: string;
}

export interface SubmitReviewInput {
	menuItemId: string;
	orderId: string;
	rating: number;
	comment?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== CUSTOMER ====================

export async function submitReview(
	slug: string,
	data: SubmitReviewInput,
	options?: FetchOption
): Promise<MenuItemReview> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/order-online/${slug}/reviews`, data);
}

export async function getMyReviews(
	slug: string,
	options?: FetchOption
): Promise<{ reviews: MenuItemReview[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/order-online/${slug}/me/reviews`);
}

// ==================== PUBLIC ====================

export async function getItemReviews(
	slug: string,
	menuItemId: string,
	options?: FetchOption
): Promise<ItemReviewsResult> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/order-online/${slug}/items/${menuItemId}/reviews`);
}

// ==================== ADMIN ====================

export async function adminListReviews(
	businessId: string,
	params?: { skip?: number; take?: number },
	options?: FetchOption
): Promise<{ total: number; reviews: AdminReview[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const qs = new URLSearchParams();
	if (params?.skip != null) qs.set('skip', String(params.skip));
	if (params?.take != null) qs.set('take', String(params.take));
	const suffix = qs.toString() ? `?${qs.toString()}` : '';
	return api.get(`/business/${businessId}/reviews${suffix}`);
}

export async function adminDeleteReview(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<{ deleted: boolean }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/reviews/${id}`);
}
