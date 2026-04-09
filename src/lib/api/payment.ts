import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'upi'
  | 'net_banking'
  | 'wallet'
  | 'razorpay'
  | 'stripe'
  | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

export interface RefundEntry {
  id: string;
  amount: number;
  reason?: string;
  refundedBy: string;
  refundedAt: string;
  method: PaymentMethod;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  restaurantId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  customerInfo: {
    name?: string;
    phone?: string;
    email?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  taxDetails: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  };
  refunds: RefundEntry[];
  receipt?: {
    receiptNumber: string;
    generatedAt: string;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    change?: number;
    tipAmount?: number;
    transactionReference?: string;
  };
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  byMethod: Record<PaymentMethod, { count: number; amount: number }>;
  pendingAmount: number;
  refundedAmount: number;
}

export interface Receipt {
  receiptNumber: string;
  generatedAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change?: number;
}

export interface CreatePaymentPayload {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  idempotencyKey?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  transactionReference?: string;
  tipAmount?: number;
  cashReceived?: number;
}

export interface SplitPaymentItem {
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  cashReceived?: number;
}

export interface CreateSplitPaymentPayload {
  orderId: string;
  payments: SplitPaymentItem[];
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface RefundPayload {
  amount: number;
  reason?: string;
  refundMethod: PaymentMethod;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== PAYMENTS ====================

export async function createPayment(
  businessId: string,
  data: CreatePaymentPayload,
  options?: FetchOption
): Promise<{
  message: string;
  payment: Payment;
  change?: number;
  orderPaymentStatus: string;
  remainingBalance: number;
}> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const payload = {
    ...data,
    idempotencyKey: data.idempotencyKey || crypto.randomUUID(),
  };
  return api.post(`/business/${businessId}/payments`, payload);
}

export async function createSplitPayment(
  businessId: string,
  data: CreateSplitPaymentPayload,
  options?: FetchOption
): Promise<{
  message: string;
  payments: Payment[];
  orderPaymentStatus: string;
  remainingBalance: number;
}> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/payments/split`, data);
}

export async function getPayments(
  businessId: string,
  params?: {
    method?: PaymentMethod;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  },
  options?: FetchOption
): Promise<{ payments: Payment[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.method) searchParams.set('method', params.method);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  const query = searchParams.toString();
  return api.get(`/business/${businessId}/payments${query ? `?${query}` : ''}`);
}

export async function getPaymentSummary(
  businessId: string,
  date?: string,
  options?: FetchOption
): Promise<{ summary: PaymentSummary }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = date ? `?date=${date}` : '';
  return api.get(`/business/${businessId}/payments/summary${query}`);
}

export async function getPaymentsByOrder(
  businessId: string,
  orderId: string,
  options?: FetchOption
): Promise<{ payments: Payment[]; totalPaid: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/payments/order/${orderId}`);
}

export async function getPaymentById(
  businessId: string,
  paymentId: string,
  options?: FetchOption
): Promise<{ payment: Payment }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/payments/${paymentId}`);
}

export async function generateReceipt(
  businessId: string,
  paymentId: string,
  options?: FetchOption
): Promise<{
  receipt: Receipt;
  business: { name: string; address: object; contact: object };
  orderNumber: string;
  paymentNumber: string;
}> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/payments/${paymentId}/receipt`);
}

export async function processRefund(
  businessId: string,
  paymentId: string,
  data: RefundPayload,
  options?: FetchOption
): Promise<{
  message: string;
  payment: Payment;
  refundAmount: number;
}> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/payments/${paymentId}/refund`, data);
}

export interface Refund {
  id: string;
  paymentId: string;
  restaurantId: string;
  amount: number;
  reason: string;
  method: string;
  refundedBy: string;
  refundedAt: string;
  createdAt: string;
}

export async function getRefunds(
  businessId: string,
  paymentId: string,
  params?: { limit?: number; offset?: number },
  options?: FetchOption
): Promise<{ refunds: Refund[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  return api.get(`/business/${businessId}/payments/${paymentId}/refunds${query ? `?${query}` : ''}`);
}

export async function deletePayment(
  businessId: string,
  paymentId: string,
  options?: FetchOption
): Promise<{ message: string; payment: Payment }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/payments/${paymentId}`);
}

// ==================== EXPORT ====================

export async function exportPayments(
  businessId: string,
  params?: { status?: string; method?: string; startDate?: string; endDate?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.method) searchParams.set('method', params.method);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString();
  const url = `/api/business/${businessId}/payments/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
