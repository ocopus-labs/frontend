import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type TaxRegime = 'gst_india' | 'vat_eu' | 'vat_uk' | 'sales_tax_us' | 'custom';

export interface GstConfig {
  compositionScheme: boolean;
  placeOfSupply: string;
  eInvoiceEnabled: boolean;
  autoGenerateEinvoice?: boolean;
}

export interface VatConfig {
  reverseChargeApplicable: boolean;
  ossRegistered: boolean;
}

export interface SalesTaxConfig {
  nexusStates: string[];
  taxExemptionId?: string;
}

export interface TaxSettings {
  enabled: boolean;
  regime: TaxRegime;
  registrationNumber: string;
  legalName: string;
  regionCode: string;
  regionName: string;
  defaultTaxRate: number;
  invoicePrefix: string;
  financialYearStart: number;
  gstConfig?: GstConfig;
  vatConfig?: VatConfig;
  salesTaxConfig?: SalesTaxConfig;
}

export interface TaxCategoryConfig {
  id: string;
  label: string;
  rate: number;
}

export interface RegimeInfo {
  id: TaxRegime;
  name: string;
  registrationLabel: string;
  componentNames: string[];
  standardRates: number[];
  taxCodeLabel: string;
  regions: Record<string, string>;
  categories: TaxCategoryConfig[];
}

export interface TaxComponent {
  name: string;
  rate: number;
  amount: number;
}

export interface ItemTaxBreakdown {
  itemId: string;
  itemName: string;
  taxCode?: string;
  taxableValue: number;
  taxRate: number;
  components: TaxComponent[];
  totalTax: number;
}

export interface TaxBreakdown {
  regime: TaxRegime;
  items: ItemTaxBreakdown[];
  componentTotals: Record<string, number>;
  rateSummary: Array<{
    rate: number;
    taxableValue: number;
    components: Record<string, number>;
    total: number;
  }>;
  totalTax: number;
  metadata?: Record<string, unknown>;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== TAX API ====================

export async function getTaxSettings(
  businessId: string,
  options?: FetchOption
): Promise<{ settings: TaxSettings }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/tax/settings`);
}

export async function updateTaxSettings(
  businessId: string,
  data: Partial<TaxSettings>,
  options?: FetchOption
): Promise<{ settings: TaxSettings }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.put(`/business/${businessId}/tax/settings`, data);
}

export async function validateTaxNumber(
  businessId: string,
  regime: TaxRegime,
  registrationNumber: string,
  options?: FetchOption
): Promise<{ valid: boolean; error?: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/tax/validate`, { regime, registrationNumber });
}

export async function getTaxRegimes(
  businessId: string,
  options?: FetchOption
): Promise<{ regimes: RegimeInfo[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/tax/regimes`);
}

// ==================== GST SUMMARY ====================

export interface GstHsnSummaryEntry {
  hsnCode: string;
  description: string;
  quantity: number;
  taxableValue: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GstSummary {
  period: { startDate: string; endDate: string };
  orderCount: number;
  totalTaxableValue: number;
  cgstCollected: number;
  sgstCollected: number;
  igstCollected: number;
  totalTaxCollected: number;
  rateSummary: Array<{
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    orderCount: number;
  }>;
  hsnSummary: GstHsnSummaryEntry[];
}

export async function getGstSummary(
  businessId: string,
  params: { startDate: string; endDate: string },
  options?: FetchOption
): Promise<{ summary: GstSummary }> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/tax/gst-summary?${searchParams.toString()}`);
}

// ==================== E-INVOICE API ====================

export type EinvoiceStatus = 'pending' | 'generated' | 'registered' | 'failed';

export interface EinvoiceStatusResponse {
	id: string;
	irn: string | null;
	irnGeneratedAt: string | null;
	ewayBillNumber: string | null;
	einvoiceStatus: EinvoiceStatus | null;
}

export async function generateEinvoice(
	businessId: string,
	orderId: string,
	options?: FetchOption
): Promise<{ einvoice: EinvoiceStatusResponse }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tax/einvoice/generate/${orderId}`);
}

export async function generateEwayBill(
	businessId: string,
	orderId: string,
	options?: FetchOption
): Promise<{ einvoice: EinvoiceStatusResponse }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tax/einvoice/eway-bill/${orderId}`);
}

export async function getEinvoiceStatus(
	businessId: string,
	orderId: string,
	options?: FetchOption
): Promise<{ einvoice: EinvoiceStatusResponse }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/tax/einvoice/status/${orderId}`);
}

// ==================== TAX EXPORT ====================

export async function exportTaxReport(
  businessId: string,
  params: { from: string; to: string; format?: 'json' | 'csv' }
): Promise<Blob | Record<string, unknown>> {
  const searchParams = new URLSearchParams();
  searchParams.set('from', params.from);
  searchParams.set('to', params.to);
  if (params.format) searchParams.set('format', params.format);

  if (params.format === 'csv') {
    const url = `/api/business/${businessId}/tax/export?${searchParams.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  const api = getApiClient();
  return api.get(`/business/${businessId}/tax/export?${searchParams.toString()}`);
}
