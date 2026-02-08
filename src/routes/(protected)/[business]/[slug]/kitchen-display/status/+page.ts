import type { PageLoad } from './$types';
import { getActiveOrders, getOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:orders');

	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [activeResult, completedResult] = await Promise.all([
			getActiveOrders(businessId, { fetch }),
			getOrders(businessId, { status: 'completed', limit: 20 }, { fetch })
		]);

		return {
			...parentData,
			activeOrders: activeResult.orders,
			completedOrders: completedResult.orders,
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch hall display orders:', error);
		return {
			...parentData,
			activeOrders: [],
			completedOrders: [],
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
