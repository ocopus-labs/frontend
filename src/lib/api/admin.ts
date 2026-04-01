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
    currency?: string;
  };
}

export interface AdminWebhook {
  id: string;
  provider: string;
  eventType: string;
  eventId: string;
  status: string;
  retryCount: number;
  processedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWebhookDetail extends AdminWebhook {
  payload: Record<string, unknown>;
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

export interface AdminBusinessDetail extends AdminBusiness {
  recentOrders: Array<{
    id: string;
    orderNumber: string | null;
    status: string;
    paymentStatus: string;
    pricing: Record<string, unknown> | null;
    createdAt: string;
  }>;
  totalRevenue: number;
  businessUsers: Array<{
    role: string;
    user: { id: string; name: string | null; email: string };
  }>;
}

export async function getAdminBusinessDetails(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ business: AdminBusinessDetail }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/admin/businesses/${id}`);
}

export async function adminUpdateBusiness(
  id: string,
  data: { name?: string; description?: string; address?: any; contact?: any; settings?: any }
): Promise<{ message: string; business: AdminBusiness }> {
  const api = getApiClient();
  return api.patch(`/admin/businesses/${id}`, data);
}

export async function adminDeleteBusiness(id: string): Promise<{ message: string }> {
  const api = getApiClient();
  return api.delete(`/admin/businesses/${id}`);
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

export interface AdminUserDetail extends AdminUser {
  subscriptions?: Array<{
    id: string;
    status: string;
    currentPeriodEnd: string;
    plan: {
      id: string;
      name: string;
      displayName: string;
    };
  }>;
  businessUsers?: Array<{
    role: string;
    restaurant: {
      id: string;
      name: string;
      slug: string;
      type: string;
      status: string;
    };
  }>;
  ownedRestaurants?: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
}

export async function getAdminUserDetails(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ user: AdminUserDetail }> {
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

export async function banAdminUser(
  id: string,
  data: { reason?: string; expiresIn?: number },
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/users/${id}/ban`, data);
}

export async function unbanAdminUser(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/users/${id}/unban`, {});
}

export async function getAdminAuditLogs(
  params?: {
    page?: number;
    limit?: number;
    userId?: string;
    resource?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
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
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString();
  return api.get(`/admin/audit-logs${query ? `?${query}` : ''}`);
}

// ==================== LIVE STATS ====================

export interface LiveStats {
  ordersToday: { count: number; revenue: number };
  paymentsToday: { count: number; amount: number };
  activeBusinesses: number;
  newUsersToday: number;
  webhookHealth: { processed: number; failed: number; pending: number };
  recentErrors: { message: string; timestamp: string; source: string }[];
  ordersPerHour: { hour: string; count: number }[];
  revenuePerHour: { hour: string; amount: number }[];
}

export async function getAdminLiveStats(
  options?: { fetch?: typeof fetch }
): Promise<LiveStats> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/admin/live-stats');
}

// ==================== ACTIVITY FEED ====================

export interface ActivityFeedItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  userName: string;
  userEmail: string | null;
  userImage: string | null;
  businessName: string | null;
  timestamp: string;
  details?: Record<string, unknown> | null;
}

export async function getAdminActivityFeed(
  limit?: number,
  since?: string,
  options?: { fetch?: typeof fetch }
): Promise<{ activities: ActivityFeedItem[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (limit) searchParams.set('limit', String(limit));
  if (since) searchParams.set('since', since);
  const query = searchParams.toString();
  return api.get(`/admin/activity-feed${query ? `?${query}` : ''}`);
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

export async function cancelAdminSubscription(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/subscriptions/${id}/cancel`, {});
}

export async function extendAdminTrial(
  id: string,
  days: number,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/subscriptions/${id}/extend-trial`, { days });
}

export interface FetchOption {
  fetch?: typeof fetch;
}

export async function changeSubscriptionPlan(
  subscriptionId: string,
  planId: string,
  reason?: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/subscriptions/${subscriptionId}/change-plan`, { planId, reason });
}

export async function getAdminWebhooks(
  params?: {
    page?: number;
    limit?: number;
    provider?: string;
    status?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: { fetch?: typeof fetch }
): Promise<PaginatedResult<AdminWebhook>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.provider) searchParams.set('provider', params.provider);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.eventType) searchParams.set('eventType', params.eventType);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString();
  return api.get(`/admin/webhooks${query ? `?${query}` : ''}`);
}

export async function getAdminWebhookDetail(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ event: AdminWebhookDetail }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/admin/webhooks/${id}`);
}

export async function retryAdminWebhook(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; event: AdminWebhook }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/admin/webhooks/${id}/retry`);
}

// ==================== BULK ACTIONS ====================

export async function bulkUserAction(
  data: { ids: string[]; action: string; reason?: string }
): Promise<{ processed: number; failed: number }> {
  const api = getApiClient();
  return api.post('/admin/users/bulk-action', data);
}

export async function bulkBusinessAction(
  data: { ids: string[]; action: string }
): Promise<{ processed: number; failed: number }> {
  const api = getApiClient();
  return api.post('/admin/businesses/bulk-action', data);
}

export async function bulkSubscriptionAction(
  data: { ids: string[]; action: string }
): Promise<{ processed: number; failed: number }> {
  const api = getApiClient();
  return api.post('/admin/subscriptions/bulk-action', data);
}

// ==================== PLAN MANAGEMENT ====================

export interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string | null;
  currency: string;
  dodoProductId: string | null;
  maxLocations: number;
  maxTeamMembers: number;
  maxOrdersPerMonth: number;
  features: Record<string, boolean>;
  isPublic: boolean;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    subscriptions: number;
  };
}

export interface AdminPlanDetail extends AdminPlan {
  activeSubscribers: number;
  totalSubscribers: number;
}

export interface CreatePlanData {
  name: string;
  slug: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  currency?: string;
  maxLocations: number;
  maxTeamMembers: number;
  maxOrdersPerMonth: number;
  features: Record<string, boolean>;
  dodoProductId?: string;
  isPublic?: boolean;
  sortOrder?: number;
}

export async function getAdminPlans(
  options?: { fetch?: typeof fetch }
): Promise<{ plans: AdminPlan[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/admin/plans');
}

export async function getAdminPlanDetail(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ plan: AdminPlanDetail }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/admin/plans/${id}`);
}

export async function createAdminPlan(
  data: CreatePlanData,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; plan: AdminPlan }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/admin/plans', data);
}

export async function updateAdminPlan(
  id: string,
  data: Partial<CreatePlanData>,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; plan: AdminPlan }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/plans/${id}`, data);
}

export async function archiveAdminPlan(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; plan: AdminPlan }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/plans/${id}/archive`, {});
}

// ==================== EXPORT ====================

export async function exportAdminUsers(
  params?: { banned?: string; search?: string; role?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.banned) searchParams.set('banned', params.banned);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.role) searchParams.set('role', params.role);
  const query = searchParams.toString();
  const url = `/api/admin/users/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function exportAdminBusinesses(
  params?: { status?: string; type?: string; search?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  const url = `/api/admin/businesses/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function exportAdminSubscriptions(
  params?: { status?: string; planId?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.planId) searchParams.set('planId', params.planId);
  const query = searchParams.toString();
  const url = `/api/admin/subscriptions/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function exportAdminAuditLogs(
  params?: { userId?: string; resource?: string; action?: string; startDate?: string; endDate?: string }
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.userId) searchParams.set('userId', params.userId);
  if (params?.resource) searchParams.set('resource', params.resource);
  if (params?.action) searchParams.set('action', params.action);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const query = searchParams.toString();
  const url = `/api/admin/audit-logs/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

// ==================== ANNOUNCEMENT MANAGEMENT ====================

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  target: string;
  targetMeta: Record<string, unknown> | null;
  isActive: boolean;
  isPinned: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    dismissals: number;
  };
}

export async function getAdminAnnouncements(
  params?: {
    page?: number;
    limit?: number;
  },
  options?: { fetch?: typeof fetch }
): Promise<PaginatedResult<AdminAnnouncement>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return api.get(`/admin/announcements${query ? `?${query}` : ''}`);
}

export async function createAdminAnnouncement(
  data: {
    title: string;
    content: string;
    type?: string;
    target?: string;
    targetMeta?: Record<string, unknown>;
    isPinned?: boolean;
    publishAt?: string;
    expiresAt?: string;
  },
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; announcement: AdminAnnouncement }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/admin/announcements', data);
}

export async function updateAdminAnnouncement(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    type: string;
    target: string;
    targetMeta: Record<string, unknown>;
    isPinned: boolean;
    publishAt: string;
    expiresAt: string;
  }>,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; announcement: AdminAnnouncement }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/announcements/${id}`, data);
}

export async function deleteAdminAnnouncement(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/admin/announcements/${id}`);
}

export async function toggleAdminAnnouncementPublish(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; announcement: AdminAnnouncement }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/admin/announcements/${id}/publish`, {});
}

// ==================== IMPERSONATION ====================

export async function impersonateUser(
  userId: string,
): Promise<{ success: boolean; targetUser: { id: string; name: string | null; email: string } }> {
  const api = getApiClient();
  return api.post(`/admin/users/${userId}/impersonate`);
}

export async function stopImpersonation(): Promise<{ success: boolean }> {
  const api = getApiClient();
  return api.post('/admin/impersonate/stop');
}

// ==================== SYSTEM HEALTH & REVENUE ====================

export async function getAdminSystemHealth(
  options?: { fetch?: typeof fetch }
): Promise<{
  status: string;
  uptime: number;
  memory: { used: number; total: number; percentage: number };
  database: { connected: boolean; latencyMs: number };
  pendingWebhooks: number;
  failedWebhooks: number;
}> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/admin/health');
}

export async function getAdminRevenueBreakdown(
  startDate?: string,
  endDate?: string,
  options?: { fetch?: typeof fetch }
): Promise<{
  byMethod: Record<string, { count: number; amount: number }>;
  refundRate: { totalPayments: number; totalRefunds: number; rate: number };
  byPlan: Array<{ planName: string; revenue: number; subscribers: number }>;
}> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const query = params.toString();
  return api.get(`/admin/revenue-breakdown${query ? `?${query}` : ''}`);
}

// ==================== PLATFORM SETTINGS ====================

export async function getAdminSettings(
  options?: { fetch?: typeof fetch }
): Promise<Record<string, string>> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/admin/settings');
}

export async function updateAdminSettings(
  settings: Record<string, string>
): Promise<Record<string, string>> {
  const api = getApiClient();
  return api.patch('/admin/settings', settings);
}

// ==================== DEEP USER MANAGEMENT ====================

export async function adminUpdateUserProfile(
  userId: string,
  data: { name?: string; email?: string }
): Promise<{ message: string; user: any }> {
  const api = getApiClient();
  return api.patch(`/admin/users/${userId}/profile`, data);
}

export async function adminResetPassword(userId: string): Promise<{ temporaryPassword: string }> {
  const api = getApiClient();
  return api.post(`/admin/users/${userId}/reset-password`);
}

export async function adminForceVerifyEmail(userId: string): Promise<any> {
  const api = getApiClient();
  return api.post(`/admin/users/${userId}/verify-email`);
}

export async function adminDisable2FA(userId: string): Promise<{ message: string }> {
  const api = getApiClient();
  return api.post(`/admin/users/${userId}/disable-2fa`);
}

export interface UserSessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export async function adminGetUserSessions(userId: string): Promise<UserSessionInfo[]> {
  const api = getApiClient();
  return api.get(`/admin/users/${userId}/sessions`);
}

export async function adminRevokeSession(userId: string, sessionId: string): Promise<void> {
  const api = getApiClient();
  return api.delete(`/admin/users/${userId}/sessions/${sessionId}`);
}

export async function adminRevokeAllSessions(userId: string): Promise<{ count: number }> {
  const api = getApiClient();
  return api.delete(`/admin/users/${userId}/sessions`);
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const api = getApiClient();
  return api.delete(`/admin/users/${userId}`);
}

// ==================== DEEP BUSINESS MANAGEMENT ====================

export async function adminTransferOwnership(
  businessId: string,
  newOwnerId: string
): Promise<{ message: string }> {
  const api = getApiClient();
  return api.post(`/admin/businesses/${businessId}/transfer-ownership`, { newOwnerId });
}

export async function adminGetBusinessOrders(
  businessId: string,
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
  const api = getApiClient();
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  return api.get(`/admin/businesses/${businessId}/orders?${params}`);
}

export async function adminGetBusinessPayments(
  businessId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
  const api = getApiClient();
  return api.get(`/admin/businesses/${businessId}/payments?page=${page}&limit=${limit}`);
}

export async function adminGetBusinessAuditLogs(
  businessId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
  const api = getApiClient();
  return api.get(`/admin/businesses/${businessId}/audit-logs?page=${page}&limit=${limit}`);
}
