import type { PageLoad } from './$types';
import { getOrderById, getPaymentsByOrder, getEinvoiceStatus } from '$lib/api';

export const load: PageLoad = async ({ parent, params, fetch, depends }) => {
	depends('app:order');
	const parentData = await parent();
	const businessId = parentData.businessId;
	const orderId = params.orderId;

	try {
		const [orderResult, paymentsResult, einvoiceResult] = await Promise.all([
			getOrderById(businessId, orderId, { fetch }),
			getPaymentsByOrder(businessId, orderId, { fetch }),
			getEinvoiceStatus(businessId, orderId, { fetch }).catch(() => ({
				einvoice: null
			}))
		]);

		return {
			...parentData,
			order: orderResult.order,
			payments: paymentsResult.payments,
			totalPaid: paymentsResult.totalPaid,
			einvoice: einvoiceResult.einvoice,
			error: null
		};
	} catch (error) {
		console.warn('Failed to fetch order details:', error);
		return {
			...parentData,
			order: null,
			payments: [],
			totalPaid: 0,
			einvoice: null,
			error: error instanceof Error ? error.message : 'Failed to load order details'
		};
	}
};
