import type { PageLoad } from './$types';
import { getApiKeys } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const keys = await getApiKeys(businessId, { fetch });
		return {
			...parentData,
			apiKeys: keys
		};
	} catch (err) {
		console.error('Failed to load API keys:', err);
		return {
			...parentData,
			apiKeys: [],
			error: err instanceof Error ? err.message : 'Failed to load API keys'
		};
	}
};
