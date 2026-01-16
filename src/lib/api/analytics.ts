import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type AnalyticsPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardAnalytics {
  today: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    topPaymentMethod: string;
  };
  comparison: {
    revenueChange: number;
    ordersChange: number;
    aovChange: number;
  };
  recentOrders: number;
  pendingOrders: number;
  activeTableCount: number;
  lowStockItems: number;
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  totalDiscount: number;
  netRevenue: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface TopSellingItemAnalytics {
  itemId: string;
  itemName: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

export interface HourlyBreakdown {
  hour: number;
  orders: number;
  revenue: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  ordersProcessed: number;
  revenue: number;
  averageOrderValue: number;
}

export interface DailyTrend {
  date: string;
  revenue: number;
  orders: number;
}

export interface FullReport {
  startDate: string;
  endDate: string;
  salesSummary: SalesSummary;
  paymentMethods: PaymentMethodBreakdown[];
  topItems: TopSellingItemAnalytics[];
  dailyTrend: DailyTrend[];
  staffPerformance: StaffPerformance[];
}

export interface AnalyticsDaily {
  id: string;
  restaurantId: string;
  date: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: { itemId: string; name: string; quantity: number }[];
  peakHours: { hour: number; orders: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  createdAt: string;
}

export interface AnalyticsPeriodParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== HELPER ====================

function buildPeriodQuery(params?: AnalyticsPeriodParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set('period', params.period);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  return searchParams.toString();
}

// ==================== ANALYTICS ENDPOINTS ====================

export async function getAnalyticsDashboard(
  businessId: string,
  options?: FetchOption
): Promise<{ stats: DashboardAnalytics }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/analytics/dashboard`);
}

export async function getSalesSummary(
  businessId: string,
  params?: AnalyticsPeriodParams,
  options?: FetchOption
): Promise<{ summary: SalesSummary; period: { startDate: string; endDate: string } }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = buildPeriodQuery(params);
  const url = query
    ? `/business/${businessId}/analytics/sales?${query}`
    : `/business/${businessId}/analytics/sales`;
  return api.get(url);
}

export async function getPaymentMethodBreakdown(
  businessId: string,
  params?: AnalyticsPeriodParams,
  options?: FetchOption
): Promise<{ breakdown: PaymentMethodBreakdown[]; period: { startDate: string; endDate: string } }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = buildPeriodQuery(params);
  const url = query
    ? `/business/${businessId}/analytics/payments?${query}`
    : `/business/${businessId}/analytics/payments`;
  return api.get(url);
}

export async function getTopSellingItemsAnalytics(
  businessId: string,
  params?: AnalyticsPeriodParams & { limit?: number },
  options?: FetchOption
): Promise<{ items: TopSellingItemAnalytics[]; period: { startDate: string; endDate: string } }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.period) searchParams.set('period', params.period);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = query
    ? `/business/${businessId}/analytics/top-items?${query}`
    : `/business/${businessId}/analytics/top-items`;
  return api.get(url);
}

export async function getHourlyBreakdown(
  businessId: string,
  date?: string,
  options?: FetchOption
): Promise<{ breakdown: HourlyBreakdown[]; date: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const url = date
    ? `/business/${businessId}/analytics/hourly?date=${date}`
    : `/business/${businessId}/analytics/hourly`;
  return api.get(url);
}

export async function getStaffPerformance(
  businessId: string,
  params?: AnalyticsPeriodParams,
  options?: FetchOption
): Promise<{ performance: StaffPerformance[]; period: { startDate: string; endDate: string } }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = buildPeriodQuery(params);
  const url = query
    ? `/business/${businessId}/analytics/staff?${query}`
    : `/business/${businessId}/analytics/staff`;
  return api.get(url);
}

export async function getFullReport(
  businessId: string,
  params?: AnalyticsPeriodParams,
  options?: FetchOption
): Promise<{ report: FullReport }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = buildPeriodQuery(params);
  const url = query
    ? `/business/${businessId}/analytics/report?${query}`
    : `/business/${businessId}/analytics/report`;
  return api.get(url);
}

export async function getDailyAnalytics(
  businessId: string,
  date: string,
  options?: FetchOption
): Promise<{ analytics: AnalyticsDaily }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/analytics/daily/${date}`);
}

export async function generateDailyAnalytics(
  businessId: string,
  date: string,
  options?: FetchOption
): Promise<{ message: string; analytics: AnalyticsDaily }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/analytics/daily/generate`, { date });
}
