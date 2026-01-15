import { createApiClient, getApiClient } from './client';
import type { OrderStats } from './order';
import type { PaymentSummary } from './payment';

// ==================== TYPES ====================

export interface DashboardStats {
  orders: OrderStats;
  payments: PaymentSummary;
}

export interface TopSellingItem {
  id: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

export interface PeakHour {
  hour: string;
  orderCount: number;
  revenue: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  orders: number;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== DASHBOARD ====================

/**
 * Get dashboard stats by fetching order stats and payment summary in parallel
 */
export async function getDashboardStats(
  businessId: string,
  date?: string,
  options?: FetchOption
): Promise<DashboardStats> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = date ? `?date=${date}` : '';

  const [orderStatsRes, paymentSummaryRes] = await Promise.all([
    api.get<{ stats: OrderStats }>(`/business/${businessId}/orders/stats${query}`),
    api.get<{ summary: PaymentSummary }>(`/business/${businessId}/payments/summary${query}`)
  ]);

  return {
    orders: orderStatsRes.stats,
    payments: paymentSummaryRes.summary
  };
}

/**
 * Get order statistics for a specific date
 */
export async function getOrderStats(
  businessId: string,
  date?: string,
  options?: FetchOption
): Promise<OrderStats> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = date ? `?date=${date}` : '';
  const response = await api.get<{ stats: OrderStats }>(`/business/${businessId}/orders/stats${query}`);
  return response.stats;
}

/**
 * Get payment summary for a specific date
 */
export async function getPaymentSummary(
  businessId: string,
  date?: string,
  options?: FetchOption
): Promise<PaymentSummary> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = date ? `?date=${date}` : '';
  const response = await api.get<{ summary: PaymentSummary }>(`/business/${businessId}/payments/summary${query}`);
  return response.summary;
}

/**
 * Get top selling items for analytics
 */
export async function getTopSellingItems(
  businessId: string,
  params?: { limit?: number; days?: number },
  options?: FetchOption
): Promise<TopSellingItem[]> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.days) searchParams.set('days', params.days.toString());
  const query = searchParams.toString();
  const response = await api.get<{ items: TopSellingItem[] }>(
    `/business/${businessId}/orders/analytics/top-items${query ? `?${query}` : ''}`
  );
  return response.items;
}

/**
 * Get peak hours for analytics
 */
export async function getPeakHours(
  businessId: string,
  days?: number,
  options?: FetchOption
): Promise<PeakHour[]> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = days ? `?days=${days}` : '';
  const response = await api.get<{ hours: PeakHour[] }>(
    `/business/${businessId}/orders/analytics/peak-hours${query}`
  );
  return response.hours;
}

/**
 * Get revenue trends for analytics charts
 */
export async function getRevenueTrends(
  businessId: string,
  days?: number,
  options?: FetchOption
): Promise<RevenueTrend[]> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = days ? `?days=${days}` : '';
  const response = await api.get<{ trends: RevenueTrend[] }>(
    `/business/${businessId}/orders/analytics/revenue-trends${query}`
  );
  return response.trends;
}
