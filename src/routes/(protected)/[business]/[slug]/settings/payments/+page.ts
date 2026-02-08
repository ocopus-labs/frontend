import type { PageLoad } from './$types';
import { getUpiSettings, getOrderingSettings } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [upiResult, orderingResult] = await Promise.all([
			getUpiSettings(businessId, { fetch }),
			getOrderingSettings(businessId, { fetch }).catch(() => ({
				settings: { selfOrderEnabled: false, requirePrepayment: false }
			}))
		]);

		return {
			...parentData,
			upiSettings: upiResult.settings,
			orderingSettings: orderingResult.settings
		};
	} catch (err) {
		console.error('Failed to load settings:', err);
		return {
			...parentData,
			upiSettings: null,
			orderingSettings: null,
			error: err instanceof Error ? err.message : 'Failed to load settings'
		};
	}
};
