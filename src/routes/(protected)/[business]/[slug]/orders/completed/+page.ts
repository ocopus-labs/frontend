import type { PageLoad } from './$types';
import { getOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get date filter from URL or default to today
	const dateFilter = url.searchParams.get('date') || 'today';

	// Calculate date range
	let fromDate: string | undefined;
	let toDate: string | undefined;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (dateFilter === 'today') {
		fromDate = today.toISOString();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		toDate = tomorrow.toISOString();
	} else if (dateFilter === 'yesterday') {
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		fromDate = yesterday.toISOString();
		toDate = today.toISOString();
	}
	// 'all' - no date filter

	try {
		const { orders, total } = await getOrders(
			businessId,
			{
				status: 'completed',
				fromDate,
				toDate
			},
			{ fetch }
		);

		return {
			...parentData,
			orders,
			total,
			dateFilter,
			ordersError: null
		};
	} catch (error) {
		console.warn('Failed to fetch completed orders:', error);
		return {
			...parentData,
			orders: [],
			total: 0,
			dateFilter,
			ordersError: error instanceof Error ? error.message : 'Failed to load orders'
		};
	}
};
