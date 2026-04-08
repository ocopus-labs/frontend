import type { PageLoad } from './$types';
import { getPurchaseOrders } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:purchase-orders');
	const parentData = await parent();
	const businessId = parentData.businessId;

	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 25));
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const offset = (page - 1) * limit;
	const status = url.searchParams.get('status') || undefined;

	try {
		const data = await getPurchaseOrders(
			businessId,
			{ status: status as any, limit, offset },
			{ fetch }
		);

		const total = data.total ?? data.orders.length;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			...parentData,
			orders: data.orders,
			page,
			limit,
			total,
			totalPages
		};
	} catch (err) {
		console.error('Failed to load purchase orders:', err);
		return {
			...parentData,
			orders: [],
			page: 1,
			limit,
			total: 0,
			totalPages: 1,
			error: err instanceof Error ? err.message : 'Failed to load purchase orders'
		};
	}
};
