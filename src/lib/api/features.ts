import { createApiClient, getApiClient } from './client';

export interface FeatureInfo {
  slug: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  minimumTier: 'FREE' | 'PRO' | 'ENTERPRISE';
  dependsOn: string[];
  isCore: boolean;
  isEnabled: boolean;
}

export interface BusinessFeatures {
  enabledFeatures: string[];
  coreFeatures: string[];
  availableFeatures: FeatureInfo[];
  extraSlots: number;
  extraSlotsUsed: number;
  extraSlotsRemaining: number;
  tier: string;
  businessType: string;
}

type FetchOption = { fetch?: typeof fetch };

export async function getBusinessFeatures(
  businessId: string,
  options?: FetchOption
): Promise<BusinessFeatures> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/features`);
}

export async function enableFeature(
  businessId: string,
  featureKey: string,
  options?: FetchOption
): Promise<{ message: string; enabledFeatures: string[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/features/enable`, { featureKey });
}

export async function disableFeature(
  businessId: string,
  featureKey: string,
  options?: FetchOption
): Promise<{ message: string; enabledFeatures: string[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/features/disable`, { featureKey });
}
