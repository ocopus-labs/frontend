import type { PageLoad } from './$types';
import { getActiveOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const { orders } = await getActiveOrders(businessId, { fetch });

		return {
			...parentData,
			orders,
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch kitchen orders:', error);
		return {
			...parentData,
			orders: [],
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
