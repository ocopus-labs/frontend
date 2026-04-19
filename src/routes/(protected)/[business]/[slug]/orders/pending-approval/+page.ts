import type { PageLoad } from './$types';
import { getOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:pending-approval-orders');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		// Fetch online orders in pending_approval status.
		// The backend supports ?status and ?orderType query params.
		const { orders, total } = await getOrders(
			businessId,
			{ status: 'pending_approval', orderType: 'online' },
			{ fetch }
		);

		return {
			...parentData,
			orders,
			total,
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch pending-approval orders:', error);
		return {
			...parentData,
			orders: [],
			total: 0,
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
