import type { PageLoad } from './$types';
import { getActiveOrders } from '$lib/api';
import type { KitchenStation } from '$lib/api/kitchen-station';

export const load: PageLoad = async ({ parent, fetch, depends, url }) => {
	// Register dependency for invalidation
	depends('app:orders');

	const parentData = await parent();
	const businessId = parentData.businessId;
	const stationId = url.searchParams.get('stationId') || undefined;

	// Load stations list for the selector
	let stations: KitchenStation[] = [];
	try {
		const mod = await import('$lib/api/kitchen-station');
		const result = await mod.getKitchenStations(businessId, { fetch });
		stations = result.stations;
	} catch {
		// kitchen-station API may not exist yet or no stations configured
	}

	try {
		const { orders } = await getActiveOrders(businessId, { fetch, stationId });

		return {
			...parentData,
			orders,
			stations,
			currentStationId: stationId || null,
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch kitchen orders:', error);
		return {
			...parentData,
			orders: [],
			stations,
			currentStationId: stationId || null,
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
