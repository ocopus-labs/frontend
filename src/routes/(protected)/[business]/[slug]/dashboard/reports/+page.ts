import type { PageLoad } from './$types';
import {
	getFullReport,
	getSalesSummary,
	getTopSellingItemsAnalytics,
	getPaymentMethodBreakdown
} from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get period from URL or default to 'month'
	const period = url.searchParams.get('period') || 'month';
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');

	try {
		const params = {
			period: period as any,
			startDate: startDate || undefined,
			endDate: endDate || undefined
		};

		const [reportData, salesData, topItemsData, paymentsData] = await Promise.all([
			getFullReport(businessId, params, { fetch }),
			getSalesSummary(businessId, params, { fetch }),
			getTopSellingItemsAnalytics(businessId, { ...params, limit: 10 }, { fetch }),
			getPaymentMethodBreakdown(businessId, params, { fetch })
		]);

		return {
			...parentData,
			report: reportData.report,
			salesSummary: salesData.summary,
			topItems: topItemsData.items,
			paymentBreakdown: paymentsData.breakdown,
			period
		};
	} catch (err) {
		console.error('Failed to load reports:', err);
		return {
			...parentData,
			report: null,
			salesSummary: {
				totalRevenue: 0,
				totalOrders: 0,
				averageOrderValue: 0,
				totalTax: 0,
				totalDiscount: 0,
				netRevenue: 0
			},
			topItems: [],
			paymentBreakdown: [],
			period,
			error: err instanceof Error ? err.message : 'Failed to load reports'
		};
	}
};
