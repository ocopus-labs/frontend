import type {
  Business,
  CreateBusinessPayload,
  UpdateBusinessPayload,
  BusinessTypeConfig
} from './types';
import { createApiClient, getApiClient } from './client';

// ==================== BUSINESS API ====================

export async function createBusiness(
  data: CreateBusinessPayload,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; business: Business }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/business', data);
}

export async function getUserBusinesses(
  options?: { fetch?: typeof fetch }
): Promise<{ businesses: Business[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/business');
}

export async function getBusinessTypes(
  options?: { fetch?: typeof fetch }
): Promise<{ types: BusinessTypeConfig[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/business/types');
}

export async function getBusinessById(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ business: Business; userRole: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${id}`);
}

export interface BusinessContext {
  business: Business;
  userRole: string;
  subscription: import('./subscription').Subscription | null;
}

export async function getBusinessContext(
  slug: string,
  options?: { fetch?: typeof fetch }
): Promise<BusinessContext> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/slug/${slug}/context`);
}

export async function updateBusiness(
  id: string,
  data: UpdateBusinessPayload,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; business: Business }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${id}`, data);
}

export async function updateBusinessLogo(
  id: string,
  logo: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; business: Business }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${id}/logo`, { logo });
}

export async function updateBusinessSettings(
  id: string,
  settings: Partial<Business['settings']>,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string; business: Business }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${id}/settings`, settings);
}

export async function deleteBusiness(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${id}`);
}
