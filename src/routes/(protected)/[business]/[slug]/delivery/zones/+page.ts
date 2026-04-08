import type { PageLoad } from './$types';
import { getZones } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const zonesData = await getZones(businessId, { fetch });

		return {
			...parentData,
			zones: zonesData.zones
		};
	} catch (err) {
		console.error('Failed to load delivery zones:', err);
		return {
			...parentData,
			zones: [],
			error: err instanceof Error ? err.message : 'Failed to load delivery zones'
		};
	}
};
