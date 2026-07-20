import type { PageLoad } from './$types';
import { getOnlineOrderingSettings, type OnlineOrderingConfig } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
  depends('app:online-ordering-settings');
  const parentData = await parent();

  try {
    const { settings } = await getOnlineOrderingSettings(parentData.businessId, { fetch });
    return { ...parentData, onlineOrderingSettings: settings };
  } catch (err) {
    const fallback: OnlineOrderingConfig = {
      enabled: false,
      acceptsDelivery: false,
      acceptsTakeaway: true,
      minOrderAmount: 0,
      acceptedPaymentMethods: ['cash', 'online'],
      estimatedPrepTime: 30,
      authEnabled: false,
      requirePhoneVerification: false,
    };
    return {
      ...parentData,
      onlineOrderingSettings: fallback,
      onlineOrderingError: (err as Error).message,
    };
  }
};
