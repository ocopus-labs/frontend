import type { PageLoad } from './$types';
import { getActiveDeliveries, getDrivers } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [deliveriesData, driversData] = await Promise.all([
			getActiveDeliveries(businessId, { fetch }),
			getDrivers(businessId, 'available', { fetch }).catch(() => ({ drivers: [] }))
		]);

		return {
			...parentData,
			deliveries: deliveriesData.deliveries,
			availableDrivers: driversData.drivers
		};
	} catch (err) {
		console.error('Failed to load active deliveries:', err);
		return {
			...parentData,
			deliveries: [],
			availableDrivers: [],
			error: err instanceof Error ? err.message : 'Failed to load active deliveries'
		};
	}
};
