import type {
  Franchise,
  FranchiseUser,
  FranchiseAnalytics,
  Business,
  CreateBusinessPayload,
} from './types';
import { createApiClient, getApiClient } from './client';

// ==================== FRANCHISE API ====================

export async function createFranchise(
  data: { name: string; description?: string; logo?: string; settings?: Record<string, unknown>; branding?: Record<string, unknown> },
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; franchise: Franchise }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/franchise', data);
}

export async function getUserFranchises(
  options?: { fetch?: typeof fetch },
): Promise<{ franchises: Franchise[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/franchise');
}

export async function getFranchiseById(
  id: string,
  options?: { fetch?: typeof fetch },
): Promise<{ franchise: Franchise; userRole: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/franchise/${id}`);
}

export async function getFranchiseBySlug(
  slug: string,
  options?: { fetch?: typeof fetch },
): Promise<{ franchise: Franchise; userRole: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/franchise/slug/${slug}`);
}

export async function updateFranchise(
  id: string,
  data: Partial<{ name: string; description: string; logo: string; status: string; settings: Record<string, unknown>; branding: Record<string, unknown> }>,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; franchise: Franchise }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/franchise/${id}`, data);
}

export async function deleteFranchise(
  id: string,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/franchise/${id}`);
}

// ==================== BUSINESS MANAGEMENT ====================

export async function getFranchiseBusinesses(
  franchiseId: string,
  options?: { fetch?: typeof fetch },
): Promise<{ businesses: Business[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/franchise/${franchiseId}/businesses`);
}

export async function addBusinessToFranchise(
  franchiseId: string,
  data: { businessId: string; configSource?: string },
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; business: Business }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/franchise/${franchiseId}/businesses`, data);
}

/**
 * Creates a location directly under a franchise.
 *
 * Takes the same payload as `createBusiness` -- the endpoint now validates
 * against `CreateBusinessDto` and applies the franchise link inside the
 * business-creation transaction, so `logo`/`subType` are supported and a
 * failure can no longer leave an orphaned standalone business the way
 * create-then-attach could.
 */
export async function createBusinessUnderFranchise(
  franchiseId: string,
  data: CreateBusinessPayload,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; business: Business }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/franchise/${franchiseId}/businesses/create`, data);
}

export async function removeBusinessFromFranchise(
  franchiseId: string,
  businessId: string,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/franchise/${franchiseId}/businesses/${businessId}`);
}

// ==================== STAFF MANAGEMENT ====================

export async function getFranchiseStaff(
  franchiseId: string,
  options?: { fetch?: typeof fetch },
): Promise<{ staff: FranchiseUser[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/franchise/${franchiseId}/staff`);
}

export async function inviteFranchiseStaff(
  franchiseId: string,
  data: { email: string; role: string; permissions?: string[] },
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; member: FranchiseUser }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/franchise/${franchiseId}/staff`, data);
}

export async function updateFranchiseStaff(
  franchiseId: string,
  userId: string,
  data: { role?: string; permissions?: string[]; status?: string },
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; member: FranchiseUser }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/franchise/${franchiseId}/staff/${userId}`, data);
}

export async function removeFranchiseStaff(
  franchiseId: string,
  userId: string,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/franchise/${franchiseId}/staff/${userId}`);
}

// ==================== ANALYTICS ====================

export async function getFranchiseAnalytics(
  franchiseId: string,
  params?: { startDate?: string; endDate?: string },
  options?: { fetch?: typeof fetch },
): Promise<{ analytics: FranchiseAnalytics }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  const qs = query.toString();
  return api.get(`/franchise/${franchiseId}/analytics${qs ? `?${qs}` : ''}`);
}

// ==================== SETTINGS ====================

export async function updateFranchiseSettings(
  franchiseId: string,
  settings: Record<string, unknown>,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; franchise: Franchise }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/franchise/${franchiseId}/settings`, settings);
}

/**
 * Stores the shared menu template on the franchise. New locations inherit it;
 * `pushMenuToLocations` applies it to existing ones.
 */
export async function updateFranchiseMenuTemplate(
  franchiseId: string,
  template: Record<string, unknown>,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; franchise: Franchise }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/franchise/${franchiseId}/menu-template`, template);
}

export async function syncFranchiseSettings(
  franchiseId: string,
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; synced: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/franchise/${franchiseId}/sync-settings`);
}

// ==================== AUDIT TRAIL ====================

export async function getFranchiseAuditTrail(
  franchiseId: string,
  params?: { limit?: number; offset?: number },
  options?: { fetch?: typeof fetch },
): Promise<{ logs: import('./types').FranchiseAuditLog[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  const qs = query.toString();
  return api.get(`/franchise/${franchiseId}/audit-trail${qs ? `?${qs}` : ''}`);
}

// ==================== MENU SYNC ====================

export async function pushMenuToLocations(
  franchiseId: string,
  locationIds?: string[],
  options?: { fetch?: typeof fetch },
): Promise<{ message: string; synced: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/franchise/${franchiseId}/sync-menu`, { locationIds });
}
