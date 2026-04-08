import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface ReportDimension {
  key: string;
  label: string;
  description: string;
}

export interface ReportMetric {
  key: string;
  label: string;
  description: string;
  format: 'number' | 'currency' | 'percentage';
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  category?: string;
  staffId?: string;
  paymentMethod?: string;
  orderStatus?: string;
}

export interface ReportQueryConfig {
  metrics: string[];
  dimensions: string[];
  filters?: ReportFilter;
  sortBy?: string[];
}

export interface ReportColumn {
  key: string;
  label: string;
  format?: string;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals: Record<string, number>;
  meta: {
    dimensions: string[];
    metrics: string[];
    rowCount: number;
    executedAt: string;
  };
}

export interface SavedReport {
  id: string;
  restaurantId: string;
  name: string;
  config: ReportQueryConfig;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveReportPayload {
  name: string;
  config: ReportQueryConfig;
  isShared?: boolean;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== REPORT BUILDER ENDPOINTS ====================

export async function getReportDimensions(
  businessId: string,
  options?: FetchOption
): Promise<{ dimensions: ReportDimension[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/analytics/reports/dimensions`);
}

export async function getReportMetrics(
  businessId: string,
  options?: FetchOption
): Promise<{ metrics: ReportMetric[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/analytics/reports/metrics`);
}

export async function executeReportQuery(
  businessId: string,
  config: ReportQueryConfig,
  options?: FetchOption
): Promise<{ result: ReportResult }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/analytics/reports/query`, config);
}

export async function saveReport(
  businessId: string,
  payload: SaveReportPayload,
  options?: FetchOption
): Promise<{ report: SavedReport }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/analytics/reports/saved`, payload);
}

export async function getSavedReports(
  businessId: string,
  options?: FetchOption
): Promise<{ reports: SavedReport[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/analytics/reports/saved`);
}

export async function runSavedReport(
  businessId: string,
  reportId: string,
  options?: FetchOption
): Promise<{ report: { id: string; name: string }; result: ReportResult }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/analytics/reports/saved/${reportId}/run`);
}

export async function deleteSavedReport(
  businessId: string,
  reportId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/analytics/reports/saved/${reportId}`);
}
