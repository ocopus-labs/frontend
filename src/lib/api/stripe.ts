import { createApiClient, getApiClient } from './client';
type FetchOption = { fetch?: typeof fetch };

export async function createStripeIntent(
  businessId: string,
  data: { amount: number; currency: string; orderId: string; customerEmail?: string },
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post<{ clientSecret: string; intentId: string }>(
    `/business/${businessId}/payments/stripe/create-intent`,
    data,
  );
}

export async function confirmStripePayment(
  businessId: string,
  data: { intentId: string },
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post<{ status: string }>(
    `/business/${businessId}/payments/stripe/confirm`,
    data,
  );
}
