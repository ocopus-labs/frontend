import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type CouponDiscountType = 'flat' | 'percent' | 'free_delivery';

export interface Coupon {
	id: string;
	restaurantId: string;
	code: string;
	description: string | null;
	discountType: CouponDiscountType;
	discountValue: number;
	maxDiscount: number | null;
	minOrderValue: number;
	firstOrderOnly: boolean;
	totalRedemptionLimit: number | null;
	perCustomerLimit: number | null;
	redemptionCount: number;
	validFrom: string | null;
	validUntil: string | null;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CouponInput {
	code: string;
	description?: string;
	discountType: CouponDiscountType;
	discountValue?: number;
	maxDiscount?: number;
	minOrderValue?: number;
	firstOrderOnly?: boolean;
	totalRedemptionLimit?: number;
	perCustomerLimit?: number;
	validFrom?: string;
	validUntil?: string;
	active?: boolean;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== ADMIN COUPON API ====================

export async function listCoupons(businessId: string, options?: FetchOption): Promise<Coupon[]> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/coupons`);
}

export async function createCoupon(
	businessId: string,
	data: CouponInput,
	options?: FetchOption
): Promise<Coupon> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/coupons`, data);
}

export async function updateCoupon(
	businessId: string,
	id: string,
	data: Partial<CouponInput>,
	options?: FetchOption
): Promise<Coupon> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/coupons/${id}`, data);
}

export async function deleteCoupon(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<{ deleted: boolean }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/coupons/${id}`);
}
