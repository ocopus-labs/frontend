import { getApiClient, createApiClient } from './client';

export interface NotificationPreferences {
  emailNotifications: boolean;
  orderAlerts: boolean;
  paymentAlerts: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  pushNotifications: boolean;
}

type FetchOption = { fetch?: typeof fetch };

export async function getPreferences(
  options?: FetchOption
): Promise<{ preferences: NotificationPreferences }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/users/me/preferences');
}

export async function updatePreferences(
  preferences: Partial<NotificationPreferences>,
  options?: FetchOption
): Promise<{ preferences: NotificationPreferences }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch('/users/me/preferences', preferences);
}
