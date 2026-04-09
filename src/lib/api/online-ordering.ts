import { createApiClient, getApiClient } from './client';

type FetchOption = { fetch?: typeof fetch };

export interface OnlineOrderingConfig {
  enabled: boolean;
  acceptsDelivery: boolean;
  acceptsTakeaway: boolean;
  minOrderAmount: number;
  acceptedPaymentMethods: string[];
  estimatedPrepTime: number;
}

export async function getOnlineOrderingSettings(
  businessId: string,
  options?: FetchOption,
): Promise<{ settings: OnlineOrderingConfig }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/online-ordering/settings`);
}

export async function updateOnlineOrderingSettings(
  businessId: string,
  data: Partial<OnlineOrderingConfig>,
  options?: FetchOption,
): Promise<{ settings: OnlineOrderingConfig }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.put(`/business/${businessId}/online-ordering/settings`, data);
}
