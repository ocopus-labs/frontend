import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type InventoryCategory =
  | 'raw_materials'
  | 'beverages'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'vegetables'
  | 'fruits'
  | 'spices'
  | 'condiments'
  | 'packaging'
  | 'cleaning'
  | 'equipment'
  | 'other';

export type InventoryUnit =
  | 'kg'
  | 'g'
  | 'mg'
  | 'l'
  | 'ml'
  | 'piece'
  | 'dozen'
  | 'box'
  | 'pack'
  | 'bottle'
  | 'can'
  | 'bag';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';

export type StockTransactionType = 'add' | 'remove' | 'adjust' | 'waste' | 'transfer';

export interface InventoryTransaction {
  id: string;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  createdAt: string;
  userId?: string;
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  sku: string;
  barcode?: string;
  barcodeFormat?: string;
  category: InventoryCategory;
  currentStock: number;
  minimumStock: number;
  unit: InventoryUnit;
  costPerUnit: number;
  status: InventoryStatus;
  isActive: boolean;
  trackExpiry: boolean;
  expiryDate?: string;
  lastRestocked?: string;
  transactions?: InventoryTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStats {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export interface CreateInventoryItemPayload {
  name: string;
  sku: string;
  barcode?: string;
  barcodeFormat?: string;
  category: InventoryCategory;
  currentStock: number;
  minimumStock: number;
  unit: InventoryUnit;
  costPerUnit: number;
  trackExpiry?: boolean;
  expiryDate?: string;
}

export interface UpdateInventoryItemPayload extends Partial<CreateInventoryItemPayload> {
  status?: InventoryStatus;
  isActive?: boolean;
}

export interface StockTransactionPayload {
  type: StockTransactionType;
  quantity: number;
  reason?: string;
  reference?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== INVENTORY CRUD ====================

export async function getInventoryItems(
  businessId: string,
  params?: {
    category?: InventoryCategory;
    status?: InventoryStatus;
    active?: boolean;
    lowStock?: boolean;
    limit?: number;
    offset?: number;
  },
  options?: FetchOption
): Promise<{ items: InventoryItem[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.active !== undefined) searchParams.set('active', String(params.active));
  if (params?.lowStock) searchParams.set('lowStock', 'true');
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = query
    ? `/business/${businessId}/inventory?${query}`
    : `/business/${businessId}/inventory`;
  return api.get(url);
}

export async function getInventoryStats(
  businessId: string,
  options?: FetchOption
): Promise<{ stats: InventoryStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/inventory/stats`);
}

export async function getLowStockItems(
  businessId: string,
  options?: FetchOption
): Promise<{ items: InventoryItem[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/inventory/low-stock`);
}

export async function getExpiringItems(
  businessId: string,
  days?: number,
  options?: FetchOption
): Promise<{ items: InventoryItem[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const url = days
    ? `/business/${businessId}/inventory/expiring?days=${days}`
    : `/business/${businessId}/inventory/expiring`;
  return api.get(url);
}

export async function getInventoryItemById(
  businessId: string,
  itemId: string,
  options?: FetchOption
): Promise<{ item: InventoryItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/inventory/${itemId}`);
}

export async function getInventoryItemBySku(
  businessId: string,
  sku: string,
  options?: FetchOption
): Promise<{ item: InventoryItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/inventory/sku/${sku}`);
}

export async function createInventoryItem(
  businessId: string,
  data: CreateInventoryItemPayload,
  options?: FetchOption
): Promise<{ message: string; item: InventoryItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/inventory`, data);
}

export async function updateInventoryItem(
  businessId: string,
  itemId: string,
  data: UpdateInventoryItemPayload,
  options?: FetchOption
): Promise<{ message: string; item: InventoryItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/inventory/${itemId}`, data);
}

export async function processStockTransaction(
  businessId: string,
  itemId: string,
  data: StockTransactionPayload,
  options?: FetchOption
): Promise<{ message: string; item: InventoryItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/inventory/${itemId}/transaction`, data);
}

export async function deleteInventoryItem(
  businessId: string,
  itemId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/inventory/${itemId}`);
}

export async function getStockTransactions(
  businessId: string,
  itemId: string,
  params?: { limit?: number; offset?: number },
  options?: FetchOption
): Promise<{ transactions: InventoryTransaction[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  return api.get(`/business/${businessId}/inventory/${itemId}/transactions${query ? `?${query}` : ''}`);
}

// ==================== BARCODE ====================

export async function lookupInventoryByBarcode(
  businessId: string,
  barcode: string,
  options?: FetchOption
): Promise<{ item: InventoryItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/inventory/lookup?barcode=${encodeURIComponent(barcode)}`);
}

export interface ScanReceiveItem {
  barcode: string;
  quantity: number;
}

export async function scanReceiveInventory(
  businessId: string,
  items: ScanReceiveItem[],
  options?: FetchOption
): Promise<{ message: string; received: number; errors: string[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/inventory/scan-receive`, { items });
}

// ==================== SUPPLIER TYPES ====================

export type SupplierStatus = 'active' | 'inactive' | 'pending' | 'blacklisted';

export interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  categories: string[];
  status: SupplierStatus;
  rating?: number;
  totalOrders: number;
  lastOrderDate?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  totalOrders: number;
}

export interface CreateSupplierPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  categories?: string[];
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {
  status?: SupplierStatus;
}

// ==================== SUPPLIER CRUD ====================

export async function getSuppliers(
  businessId: string,
  params?: { status?: SupplierStatus; limit?: number; offset?: number },
  options?: FetchOption
): Promise<{ suppliers: Supplier[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `/business/${businessId}/suppliers?${query}`
    : `/business/${businessId}/suppliers`;
  return api.get(url);
}

export async function getSupplierStats(
  businessId: string,
  options?: FetchOption
): Promise<{ stats: SupplierStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/suppliers/stats`);
}

export async function getSupplierById(
  businessId: string,
  supplierId: string,
  options?: FetchOption
): Promise<{ supplier: Supplier }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/suppliers/${supplierId}`);
}

export async function createSupplier(
  businessId: string,
  data: CreateSupplierPayload,
  options?: FetchOption
): Promise<{ message: string; supplier: Supplier }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/suppliers`, data);
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  data: UpdateSupplierPayload,
  options?: FetchOption
): Promise<{ message: string; supplier: Supplier }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/suppliers/${supplierId}`, data);
}

export async function deleteSupplier(
  businessId: string,
  supplierId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/suppliers/${supplierId}`);
}

// ==================== EXPORT ====================

export async function exportInventory(
  businessId: string,
  params?: { category?: string; status?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  const query = searchParams.toString();
  const url = `/api/business/${businessId}/inventory/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
