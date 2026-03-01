import type { PageLoad } from './$types';
import { getTaxSettings, getTaxRegimes } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:tax-settings');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [settingsResult, regimesResult] = await Promise.all([
			getTaxSettings(businessId, { fetch }),
			getTaxRegimes(businessId, { fetch })
		]);
		return {
			...parentData,
			taxSettings: settingsResult.settings,
			taxRegimes: regimesResult.regimes
		};
	} catch (err) {
		console.error('Failed to load tax settings:', err);
		return {
			...parentData,
			taxSettings: null,
			taxRegimes: [],
			error: err instanceof Error ? err.message : 'Failed to load tax settings'
		};
	}
};
