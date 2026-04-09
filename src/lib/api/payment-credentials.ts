import { createApiClient, getApiClient } from './client';

type FetchOption = { fetch?: typeof fetch };

export type PaymentProvider = 'stripe' | 'razorpay' | 'dodo';
export type PaymentMode = 'test' | 'live';
export type CredentialSource = 'business' | 'platform' | 'none';

export interface MaskedPaymentCredential {
  provider: PaymentProvider;
  enabled: boolean;
  mode: PaymentMode;
  publishableKey?: string;
  keyId?: string;
  secretKeyLastFour?: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  lastVerifiedAt?: string;
  source: CredentialSource;
}

export interface UpdateCredentialPayload {
  enabled?: boolean;
  mode?: PaymentMode;
  publishableKey?: string;
  keyId?: string;
  secretKey?: string;
  webhookSecret?: string;
}

export async function getPaymentCredentials(
  businessId: string,
  options?: FetchOption,
): Promise<{ credentials: MaskedPaymentCredential[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/payment-credentials`);
}

export async function updatePaymentCredential(
  businessId: string,
  provider: PaymentProvider,
  data: UpdateCredentialPayload,
  options?: FetchOption,
): Promise<{ message: string; credential: MaskedPaymentCredential }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.put(`/business/${businessId}/payment-credentials/${provider}`, data);
}

export async function deletePaymentCredential(
  businessId: string,
  provider: PaymentProvider,
  options?: FetchOption,
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/payment-credentials/${provider}`);
}

export async function verifyPaymentCredential(
  businessId: string,
  provider: PaymentProvider,
  options?: FetchOption,
): Promise<{ success: boolean; error?: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/payment-credentials/${provider}/verify`, {});
}
