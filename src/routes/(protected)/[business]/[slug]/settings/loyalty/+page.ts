import type { PageLoad } from './$types';
import { getLoyaltySettings } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const result = await getLoyaltySettings(businessId, { fetch });
		return {
			...parentData,
			loyaltySettings: result.settings
		};
	} catch (err) {
		console.error('Failed to load loyalty settings:', err);
		return {
			...parentData,
			loyaltySettings: null,
			error: err instanceof Error ? err.message : 'Failed to load loyalty settings'
		};
	}
};
