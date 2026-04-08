import type { PageLoad } from './$types';
import { getUpiSettings, getOrderingSettings } from '$lib/api';
import { createApiClient } from '$lib/api/client';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;
	const api = createApiClient({ fetch });

	try {
		const [upiResult, orderingResult, stripeResult] = await Promise.all([
			getUpiSettings(businessId, { fetch }),
			getOrderingSettings(businessId, { fetch }).catch(() => ({
				settings: { selfOrderEnabled: false, requirePrepayment: false }
			})),
			api.get<{ settings: { enabled: boolean; publishableKey: string } }>(
				`/business/${businessId}/payments/stripe/settings`
			).catch(() => ({
				settings: { enabled: false, publishableKey: '' }
			}))
		]);

		return {
			...parentData,
			upiSettings: upiResult.settings,
			orderingSettings: orderingResult.settings,
			stripeSettings: stripeResult.settings
		};
	} catch (err) {
		console.error('Failed to load settings:', err);
		return {
			...parentData,
			upiSettings: null,
			orderingSettings: null,
			stripeSettings: null,
			error: err instanceof Error ? err.message : 'Failed to load settings'
		};
	}
};
