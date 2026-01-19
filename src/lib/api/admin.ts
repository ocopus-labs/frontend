import { createApiClient, getApiClient } from './client';

// ==================== ADMIN API TYPES ====================

export interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  businessesByType: Record<string, number>;
  businessesByStatus: Record<string, number>;
  recentBusinesses: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  }>;
  subscriptionStats: {
    total: number;
    active: number;
    canceled: number;
    byPlan: Record<string, number>;
  };
  growthMetrics: {
    businessesThisMonth: number;
    usersThisMonth: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo: string | null;
  description: string | null;
  address: Record<string, unknown>;
  contact: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    orders: number;
    businessUsers: number;
    tables: number;
  };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    businessUsers: number;
    ownedRestaurants: number;
    orders: number;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface PlatformAnalytics {
  period: {
    start: string;
    end: string;
  };
  dailyStats: Array<{
    date: string;
    orders_count: number;
    revenue: number;
  }>;
  userGrowth: Array<{
    date: string;
    new_users: number;
  }>;
  businessGrowth: Array<{
    date: string;
    new_businesses: number;
  }>;
  topBusinesses: Array<{
    id: string;
    name: string;
    type: string;
    order_count: number;
    total_revenue: number;
  }>;
}

export interface AdminSubscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  plan: {
    id: string;
    name: string;
    displayName: string;
    priceMonthly: string;
  };
}

// ==================== ADMIN API FUNCTIONS ====================

export async function getAdminStats(
  options?: { fetch?: typeof fetch }
): Promise<{ stats: PlatformStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/admin/stats');
}

export async function getAdminBusinesses(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
  options?: { fetch?: typeof fetch }
): Promise<PaginatedResult<AdminBusiness>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  const query = searchParams.toString();
  return api.get(`/admin/businesses${query ? `?${query}` : ''}`);
}

export async function getAdminBusinessDetails(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ business: AdminBusiness & { recentOrders: unknown[]; totalRevenue: number } }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/admin/businesses/${id}`);
}

export async function updateAdminBusinessStatus(
  id: string,
  status: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; business: AdminBusiness }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/businesses/${id}/status`, { status });
}

export async function getAdminUsers(
  params?: {
    page?: number;
    limit?: number;
    banned?: boolean;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
  options?: { fetch?: typeof fetch }
): Promise<PaginatedResult<AdminUser>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.banned !== undefined) searchParams.set('banned', String(params.banned));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.role) searchParams.set('role', params.role);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  const query = searchParams.toString();
  return api.get(`/admin/users${query ? `?${query}` : ''}`);
}

export async function getAdminUserDetails(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ user: AdminUser }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/admin/users/${id}`);
}

export async function updateAdminUserRole(
  id: string,
  role: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; user: AdminUser }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/users/${id}/role`, { role });
}

export async function getAdminAuditLogs(
  params?: {
    page?: number;
    limit?: number;
    userId?: string;
    resource?: string;
    action?: string;
  },
  options?: { fetch?: typeof fetch }
): Promise<PaginatedResult<AuditLog>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.userId) searchParams.set('userId', params.userId);
  if (params?.resource) searchParams.set('resource', params.resource);
  if (params?.action) searchParams.set('action', params.action);
  const query = searchParams.toString();
  return api.get(`/admin/audit-logs${query ? `?${query}` : ''}`);
}

export async function getAdminAnalytics(
  params?: {
    startDate?: string;
    endDate?: string;
  },
  options?: { fetch?: typeof fetch }
): Promise<{ analytics: PlatformAnalytics }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString();
  return api.get(`/admin/analytics${query ? `?${query}` : ''}`);
}

export async function getAdminSubscriptions(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    planId?: string;
  },
  options?: { fetch?: typeof fetch }
): Promise<PaginatedResult<AdminSubscription>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.planId) searchParams.set('planId', params.planId);
  const query = searchParams.toString();
  return api.get(`/admin/subscriptions${query ? `?${query}` : ''}`);
}
