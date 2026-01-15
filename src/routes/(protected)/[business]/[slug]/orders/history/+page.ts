import type { PageLoad } from './$types';
import { getOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get filters from URL
	const statusFilter = url.searchParams.get('status') || undefined;
	const typeFilter = url.searchParams.get('type') || undefined;
	const fromDate = url.searchParams.get('from') || undefined;
	const toDate = url.searchParams.get('to') || undefined;
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);

	try {
		const { orders, total } = await getOrders(
			businessId,
			{
				status: statusFilter,
				orderType: typeFilter,
				fromDate,
				toDate,
				limit,
				offset
			},
			{ fetch }
		);

		return {
			...parentData,
			orders,
			total,
			pagination: { limit, offset },
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch order history:', error);
		return {
			...parentData,
			orders: [],
			total: 0,
			pagination: { limit, offset },
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
