import type { PageLoad } from './$types';
import { getDrivers } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const driversData = await getDrivers(businessId, undefined, { fetch });

		return {
			...parentData,
			drivers: driversData.drivers
		};
	} catch (err) {
		console.error('Failed to load drivers:', err);
		return {
			...parentData,
			drivers: [],
			error: err instanceof Error ? err.message : 'Failed to load drivers'
		};
	}
};
