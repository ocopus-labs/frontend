import type { PageLoad } from './$types';
import { getBusinessFeatures } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:business-features');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const features = await getBusinessFeatures(businessId, { fetch });
		return {
			...parentData,
			features
		};
	} catch (err) {
		console.error('Failed to load business features:', err);
		return {
			...parentData,
			features: null,
			error: err instanceof Error ? err.message : 'Failed to load features'
		};
	}
};
