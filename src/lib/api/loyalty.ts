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
    reason,
  });
}

export async function getLoyaltyLeaderboard(
  businessId: string,
  options?: FetchOption
): Promise<{ leaderboard: LoyaltyLeaderboardEntry[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/loyalty/leaderboard`);
}
