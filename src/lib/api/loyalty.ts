import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface LoyaltySettings {
	enabled: boolean;
	pointsPerUnit: number;
	redemptionRate: number;
	minimumRedemption: number;
	tiers: {
		silver: number;
		gold: number;
		platinum: number;
	};
	tierMultipliers: {
		bronze: number;
		silver: number;
		gold: number;
		platinum: number;
	};
}

export interface LoyaltyAccount {
	id: string;
	customerId: string;
	restaurantId: string;
	points: number;
	lifetimePoints: number;
	tier: 'bronze' | 'silver' | 'gold' | 'platinum';
	createdAt: string;
	updatedAt: string;
}

export interface LoyaltyTransaction {
	id: string;
	loyaltyAccountId: string;
	type: 'earn' | 'redeem' | 'adjust' | 'expire';
	points: number;
	balance: number;
	orderId?: string;
	description: string;
	createdBy?: string;
	createdAt: string;
}

export interface LoyaltyLeaderboardEntry {
	customerId: string;
	customerName: string;
	customerPhone: string;
	points: number;
	lifetimePoints: number;
	tier: string;
}

export interface LoyaltyTier {
	id: string;
	restaurantId: string;
	name: string;
	minPoints: number;
	multiplier: number;
	perks: string[] | null;
	color: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface LoyaltyTierInput {
	id?: string;
	name: string;
	minPoints: number;
	multiplier: number;
	perks?: string[];
	color?: string;
	sortOrder?: number;
}

export interface LoyaltyTierProgress {
	account: LoyaltyAccount;
	currentTier: LoyaltyTier | null;
	nextTier: LoyaltyTier | null;
	pointsToNextTier: number;
}

export interface LoyaltyReferral {
	id: string;
	restaurantId: string;
	referrerId: string;
	referredCustomerId: string | null;
	referralCode: string;
	rewardPoints: number | null;
	status: 'pending' | 'completed' | 'expired';
	completedAt: string | null;
	createdAt: string;
}

export interface LoyaltyPromotion {
	id: string;
	restaurantId: string;
	name: string;
	type: string;
	conditions: Record<string, unknown> | null;
	bonusPoints: number | null;
	multiplier: number | null;
	startDate: string;
	endDate: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateLoyaltyPromotionPayload {
	name: string;
	type: string;
	conditions?: Record<string, unknown>;
	bonusPoints?: number;
	multiplier?: number;
	startDate: string;
	endDate: string;
	active?: boolean;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== LOYALTY API ====================

export async function getLoyaltySettings(
	businessId: string,
	options?: FetchOption
): Promise<{ settings: LoyaltySettings }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/loyalty/settings`);
}

export async function updateLoyaltySettings(
	businessId: string,
	data: Partial<LoyaltySettings>,
	options?: FetchOption
): Promise<{ settings: LoyaltySettings }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.put(`/business/${businessId}/loyalty/settings`, data);
}

export async function getLoyaltyAccount(
	businessId: string,
	customerId: string,
	options?: FetchOption
): Promise<{ account: LoyaltyAccount }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/loyalty/customers/${customerId}`);
}

export async function getLoyaltyTransactions(
	businessId: string,
	customerId: string,
	params?: { limit?: number; offset?: number },
	options?: FetchOption
): Promise<{ account: LoyaltyAccount; transactions: LoyaltyTransaction[]; total: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
	if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/loyalty/customers/${customerId}/transactions?${query}`
		: `/business/${businessId}/loyalty/customers/${customerId}/transactions`;
	return api.get(url);
}

export async function redeemLoyaltyPoints(
	businessId: string,
	customerId: string,
	points: number,
	options?: FetchOption
): Promise<{ discountAmount: number; newBalance: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/loyalty/customers/${customerId}/redeem`, { points });
}

export async function adjustLoyaltyPoints(
	businessId: string,
	customerId: string,
	points: number,
	reason: string,
	options?: FetchOption
): Promise<{ account: LoyaltyAccount }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/loyalty/customers/${customerId}/adjust`, {
		points,
		reason
	});
}

export async function getLoyaltyLeaderboard(
	businessId: string,
	options?: FetchOption
): Promise<{ leaderboard: LoyaltyLeaderboardEntry[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/loyalty/leaderboard`);
}

// ==================== TIER API ====================

export async function getLoyaltyTiers(
	businessId: string,
	options?: FetchOption
): Promise<{ tiers: LoyaltyTier[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/loyalty/tiers`);
}

export async function configureLoyaltyTiers(
	businessId: string,
	tiers: LoyaltyTierInput[],
	options?: FetchOption
): Promise<{ tiers: LoyaltyTier[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/loyalty/tiers`, { tiers });
}

export async function getLoyaltyTierProgress(
	businessId: string,
	customerId: string,
	options?: FetchOption
): Promise<LoyaltyTierProgress> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/loyalty/accounts/${customerId}/tier`);
}

// ==================== REFERRAL API ====================

export async function generateReferralCode(
	businessId: string,
	customerId: string,
	options?: FetchOption
): Promise<{ referral: LoyaltyReferral }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/loyalty/referrals`, { customerId });
}

export async function processReferral(
	businessId: string,
	code: string,
	customerId: string,
	options?: FetchOption
): Promise<{ referral: LoyaltyReferral }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/loyalty/referrals/${code}/complete`, { customerId });
}

// ==================== PROMOTION API ====================

export async function getLoyaltyPromotions(
	businessId: string,
	params?: { all?: boolean },
	options?: FetchOption
): Promise<{ promotions: LoyaltyPromotion[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const query = params?.all ? '?all=true' : '';
	return api.get(`/business/${businessId}/loyalty/promotions${query}`);
}

export async function createLoyaltyPromotion(
	businessId: string,
	data: CreateLoyaltyPromotionPayload,
	options?: FetchOption
): Promise<{ promotion: LoyaltyPromotion }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/loyalty/promotions`, data);
}
