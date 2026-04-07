import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface Customer {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
  tags: string[];
  taxId?: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

export interface CustomerOrderStats {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export interface CustomerInsightsTopCustomer {
  id: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export interface CustomerInsights {
  totalCustomers: number;
  newThisMonth: number;
  avgClv: number;
  maxClv: number;
  retentionRate: number;
  repeatCustomers: number;
  topCustomers: CustomerInsightsTopCustomer[];
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
  tags?: string[];
  taxId?: string;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  status?: 'active' | 'inactive';
}

type FetchOption = { fetch?: typeof fetch };

// ==================== CUSTOMERS CRUD ====================

export async function getCustomers(
  businessId: string,
  params?: {
    search?: string;
    status?: string;
    tags?: string;
    limit?: number;
    offset?: number;
  },
  options?: FetchOption
): Promise<{ customers: Customer[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.tags) searchParams.set('tags', params.tags);
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = query
    ? `/business/${businessId}/customers?${query}`
    : `/business/${businessId}/customers`;
  return api.get(url);
}

export async function getCustomerStats(
  businessId: string,
  options?: FetchOption
): Promise<{ stats: CustomerStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/customers/stats`);
}

export async function getCustomerById(
  businessId: string,
  customerId: string,
  options?: FetchOption
): Promise<{ customer: Customer }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/customers/${customerId}`);
}

export async function getCustomerWithOrders(
  businessId: string,
  customerId: string,
  options?: FetchOption
): Promise<{ customer: Customer & { orders: any[] }; orderStats: CustomerOrderStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/customers/${customerId}/orders`);
}

export async function findCustomerByPhone(
  businessId: string,
  phone: string,
  options?: FetchOption
): Promise<{ customer: Customer }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/customers/search/phone/${encodeURIComponent(phone)}`);
}

export async function createCustomer(
  businessId: string,
  data: CreateCustomerPayload,
  options?: FetchOption
): Promise<{ message: string; customer: Customer }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/customers`, data);
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  data: UpdateCustomerPayload,
  options?: FetchOption
): Promise<{ message: string; customer: Customer }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/customers/${customerId}`, data);
}

export async function deleteCustomer(
  businessId: string,
  customerId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/customers/${customerId}`);
}

export async function getCustomerInsights(
  businessId: string,
  options?: FetchOption
): Promise<CustomerInsights> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/customers/insights`);
}

export async function exportCustomers(
  businessId: string,
  params?: { status?: string; search?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  const url = `/api/business/${businessId}/customers/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
