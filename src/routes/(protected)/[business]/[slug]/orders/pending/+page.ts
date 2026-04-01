import type { PageLoad } from './$types';
import { getActiveOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		// Fetch all active orders (active, preparing, ready, serving)
		const { orders } = await getActiveOrders(businessId, { fetch });

		return {
			...parentData,
			orders,
			total: orders.length,
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch orders:', error);
		return {
			...parentData,
			orders: [],
			total: 0,
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
