import type { PageLoad } from './$types';
import { getTaxSettings } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const result = await getTaxSettings(businessId, { fetch });
		return {
			...parentData,
			taxSettings: result.settings
		};
	} catch (err) {
		console.error('Failed to load tax settings:', err);
		return {
			...parentData,
			taxSettings: null,
			error: err instanceof Error ? err.message : 'Failed to load tax settings'
		};
	}
};
