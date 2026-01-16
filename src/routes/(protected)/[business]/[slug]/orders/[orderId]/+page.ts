import type { PageLoad } from './$types';
import { getOrderById, getPaymentsByOrder } from '$lib/api';

export const load: PageLoad = async ({ parent, params, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;
	const orderId = params.orderId;

	try {
		const [orderResult, paymentsResult] = await Promise.all([
			getOrderById(businessId, orderId, { fetch }),
			getPaymentsByOrder(businessId, orderId, { fetch })
		]);

		return {
			...parentData,
			order: orderResult.order,
			payments: paymentsResult.payments,
			totalPaid: paymentsResult.totalPaid,
			error: null
		};
	} catch (error) {
		console.warn('Failed to fetch order details:', error);
		return {
			...parentData,
			order: null,
			payments: [],
			totalPaid: 0,
			error: error instanceof Error ? error.message : 'Failed to load order details'
		};
	}
};
