import type { PageLoad } from './$types';
import { getOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:pending-approval-orders');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		// Fetch all pending_approval orders. These only originate from customer flows
		// (online/QR), so no additional filter is needed. Note: orderType is
		// 'dine_in' | 'takeaway' | 'delivery' — never literally 'online' — so
		// filtering by orderType here would yield zero results.
		const { orders, total } = await getOrders(
			businessId,
			{ status: 'pending_approval' },
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
