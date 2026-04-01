import type { PageLoad } from './$types';
import { getKitchenStations, getUnassignedCategories } from '$lib/api/kitchen-station';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const [stationsResult, unassignedResult] = await Promise.all([
		getKitchenStations(businessId, { fetch }).catch(() => ({ stations: [] })),
		getUnassignedCategories(businessId, { fetch }).catch(() => ({ categories: [] }))
	]);

	return {
		...parentData,
		stations: stationsResult.stations,
		unassignedCategories: unassignedResult.categories
	};
};
