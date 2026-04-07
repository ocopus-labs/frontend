import { createApiClient, getApiClient } from './client';
type FetchOption = { fetch?: typeof fetch };

export async function registerDeviceToken(
  businessId: string,
  data: { token: string; platform: string },
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/notifications/device-token`, data);
}

export async function removeDeviceToken(
  businessId: string,
  token: string,
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/notifications/device-token/${encodeURIComponent(token)}`);
}

export async function getNotificationHistory(
  businessId: string,
  params?: { type?: string; status?: string; limit?: number; offset?: number },
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `/business/${businessId}/notifications/history?${query}`
    : `/business/${businessId}/notifications/history`;
  return api.get(url);
}
