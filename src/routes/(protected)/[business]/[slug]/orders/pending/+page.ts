import type { PageLoad } from './$types';
import { getOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		// Fetch active orders (pending, preparing status)
		const { orders, total } = await getOrders(
			businessId,
			{ status: 'active' },
			{ fetch }
		);

		return {
			...parentData,
			orders,
			total,
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
