import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  basePrice: number;
  totalPrice: number;
  modifiers?: {
    size?: OrderItemModifier;
    spiceLevel?: OrderItemModifier;
    preparation?: string[];
    addOns?: OrderItemModifier[];
    removals?: string[];
    specialInstructions?: string;
  };
  taxCode?: string;
  taxCategory?: string;
  taxRate?: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  cancellationReason?: 'customer_changed_mind' | 'out_of_stock' | 'wrong_item' | 'kitchen_error' | 'other';
  cancellationNote?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  categoryId?: string;
}

export interface OrderPricing {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  serviceCharge?: number;
  total: number;
  taxBreakdown?: import('./tax').TaxBreakdown;
}

export interface OrderDiscount {
  id: string;
  code?: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  reason?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  tableId?: string;
  tableNumber?: string;
  staffId?: string;
  staffName?: string;
  orderSource?: 'pos' | 'customer_qr';
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'online';
  customerInfo: {
    name?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  };
  items: OrderItem[];
  pricing: OrderPricing;
  discountsApplied: OrderDiscount[];
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  balanceDue: number;
  status: 'active' | 'pending_approval' | 'preparing' | 'ready' | 'serving' | 'completed' | 'cancelled' | 'refunded';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCompletionTime?: string;
  actualCompletionTime?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
  auditTrail?: Array<{
    action: string;
    performedBy: string;
    performedAt: string;
    details?: Record<string, unknown>;
  }>;
  table?: {
    id: string;
    tableNumber: string;
    displayName: string;
  };
  staff?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateOrderItemPayload {
  menuItemId: string;
  name: string;
  quantity: number;
  basePrice: number;
  modifiers?: {
    size?: OrderItemModifier;
    spiceLevel?: OrderItemModifier;
    preparation?: string[];
    addOns?: OrderItemModifier[];
    removals?: string[];
    specialInstructions?: string;
  };
}

export interface CreateOrderPayload {
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'online';
  customerId?: string;
  tableId?: string;
  tableNumber?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  };
  items: CreateOrderItemPayload[];
  taxRate?: number;
  discount?: {
    code?: string;
    type: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  };
  serviceCharge?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  estimatedMinutes?: number;
}

export interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== ORDERS ====================

export async function createOrder(
  businessId: string,
  data: CreateOrderPayload,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders`, data);
}

export async function getOrders(
  businessId: string,
  params?: {
    status?: string;
    paymentStatus?: string;
    orderType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  },
  options?: FetchOption
): Promise<{ orders: Order[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
  if (params?.orderType) searchParams.set('orderType', params.orderType);
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  const query = searchParams.toString();
  return api.get(`/business/${businessId}/orders${query ? `?${query}` : ''}`);
}

export async function getActiveOrders(
  businessId: string,
  options?: FetchOption
): Promise<{ orders: Order[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/orders/active`);
}

export async function getOrderStats(
  businessId: string,
  date?: string,
  options?: FetchOption
): Promise<{ stats: OrderStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = date ? `?date=${date}` : '';
  return api.get(`/business/${businessId}/orders/stats${query}`);
}

export async function getOrderById(
  businessId: string,
  orderId: string,
  options?: FetchOption
): Promise<{ order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/orders/${orderId}`);
}

export async function getOrderByNumber(
  businessId: string,
  orderNumber: string,
  options?: FetchOption
): Promise<{ order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/orders/by-number/${orderNumber}`);
}

export async function getOrdersByTable(
  businessId: string,
  tableId: string,
  options?: FetchOption
): Promise<{ orders: Order[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/orders/by-table/${tableId}`);
}

export async function updateOrderStatus(
  businessId: string,
  orderId: string,
  status: 'active' | 'completed' | 'cancelled' | 'refunded',
  reason?: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/orders/${orderId}/status`, { status, reason });
}

export async function addItemsToOrder(
  businessId: string,
  orderId: string,
  items: CreateOrderItemPayload[],
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/items`, { items });
}

export async function updateItemQuantity(
  businessId: string,
  orderId: string,
  itemId: string,
  quantity: number,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/orders/${orderId}/items/quantity`, { itemId, quantity });
}

export async function removeItemFromOrder(
  businessId: string,
  orderId: string,
  itemId: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/orders/${orderId}/items/${itemId}`);
}

export async function updateItemStatus(
  businessId: string,
  orderId: string,
  itemId: string,
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled',
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/orders/${orderId}/items/${itemId}/status`, { status });
}

export async function bulkUpdateItemStatuses(
  businessId: string,
  orderId: string,
  itemIds: string[],
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled',
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/orders/${orderId}/items/bulk-status`, { itemIds, status });
}

export async function applyDiscount(
  businessId: string,
  orderId: string,
  discount: {
    code?: string;
    type: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  },
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/discount`, discount);
}

export async function deleteOrder(
  businessId: string,
  orderId: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/orders/${orderId}`);
}

// ==================== TABLE OPERATIONS ====================

export type CancellationReason = 'customer_changed_mind' | 'out_of_stock' | 'wrong_item' | 'kitchen_error' | 'other';

export async function cancelItem(
  businessId: string,
  orderId: string,
  itemId: string,
  data: { reason: CancellationReason; note?: string },
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/orders/${orderId}/items/${itemId}/cancel`, data);
}

export async function transferOrder(
  businessId: string,
  orderId: string,
  targetTableId: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/transfer`, { targetTableId });
}

export async function mergeOrders(
  businessId: string,
  targetOrderId: string,
  sourceOrderId: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${targetOrderId}/merge`, { sourceOrderId });
}

export async function splitOrder(
  businessId: string,
  orderId: string,
  data: { itemIds: string[]; targetTableId: string },
  options?: FetchOption
): Promise<{ message: string; sourceOrder: Order; newOrder: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/split`, data);
}

export async function reprintKot(
  businessId: string,
  orderId: string,
  options?: FetchOption
): Promise<{ message: string; kot: any }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/reprint-kot`);
}

export async function acceptQrOrder(
  businessId: string,
  orderId: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/accept`);
}

export async function rejectQrOrder(
  businessId: string,
  orderId: string,
  reason?: string,
  options?: FetchOption
): Promise<{ message: string; order: Order }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/orders/${orderId}/reject`, { reason });
}

// ==================== EXPORT ====================

export async function exportOrders(
  businessId: string,
  params?: { status?: string; startDate?: string; endDate?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString();
  const url = `/api/business/${businessId}/orders/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
