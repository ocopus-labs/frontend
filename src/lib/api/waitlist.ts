import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no_show';

export interface WaitlistEntry {
  id: string;
  restaurantId: string;
  customerName: string;
  customerPhone?: string;
  partySize: number;
  status: WaitlistStatus;
  position: number;
  estimatedWaitMinutes: number | null;
  trackingToken: string;
  notes?: string;
  notifiedAt?: string;
  seatedAt?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistTrackingEntry {
  id: string;
  customerName: string;
  partySize: number;
  status: WaitlistStatus;
  position: number;
  estimatedWaitMinutes: number | null;
  notes?: string;
  joinedAt: string;
  notifiedAt?: string;
  seatedAt?: string;
}

export interface AddToWaitlistPayload {
  customerName: string;
  customerPhone?: string;
  partySize: number;
  notes?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== STAFF ENDPOINTS ====================

export async function addToWaitlist(
  businessId: string,
  data: AddToWaitlistPayload,
  options?: FetchOption
): Promise<{ message: string; entry: WaitlistEntry }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/waitlist`, data);
}

export async function getActiveWaitlist(
  businessId: string,
  options?: FetchOption
): Promise<{ queue: WaitlistEntry[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/waitlist/active`);
}

export async function notifyWaitlistEntry(
  businessId: string,
  entryId: string,
  options?: FetchOption
): Promise<{ message: string; entry: WaitlistEntry }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/waitlist/${entryId}/notify`);
}

export async function seatWaitlistEntry(
  businessId: string,
  entryId: string,
  options?: FetchOption
): Promise<{ message: string; entry: WaitlistEntry }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/waitlist/${entryId}/seat`);
}

export async function cancelWaitlistEntry(
  businessId: string,
  entryId: string,
  options?: FetchOption
): Promise<{ message: string; entry: WaitlistEntry }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/waitlist/${entryId}/cancel`);
}

export async function markWaitlistNoShow(
  businessId: string,
  entryId: string,
  options?: FetchOption
): Promise<{ message: string; entry: WaitlistEntry }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/waitlist/${entryId}/no-show`);
}

// ==================== PUBLIC TRACKING ====================

export async function trackWaitlistPosition(
  token: string,
  options?: FetchOption
): Promise<{ entry: WaitlistTrackingEntry }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/waitlist/track/${token}`);
}
