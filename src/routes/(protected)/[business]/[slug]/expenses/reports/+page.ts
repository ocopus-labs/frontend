import type { PageLoad } from './$types';
import { getExpenseSummary, getExpenseCategories } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get date range from URL or default to last 90 days
	const startDateParam = url.searchParams.get('startDate');
	const endDateParam = url.searchParams.get('endDate');

	const now = new Date();
	const defaultEndDate = now.toISOString().split('T')[0];
	const defaultStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	const startDate = startDateParam || defaultStartDate;
	const endDate = endDateParam || defaultEndDate;

	try {
		const [summaryData, categoriesData] = await Promise.all([
			getExpenseSummary(businessId, { startDate, endDate }, { fetch }),
			getExpenseCategories(businessId, false, { fetch })
		]);

		return {
			...parentData,
			summary: summaryData.summary,
			categories: categoriesData.categories,
			startDate,
			endDate
		};
	} catch (err) {
		console.error('Failed to load expense reports:', err);
		return {
			...parentData,
			summary: {
				totalAmount: 0,
				pendingAmount: 0,
				approvedAmount: 0,
				paidAmount: 0,
				categoryBreakdown: {},
				monthlyTrend: []
			},
			categories: [],
			startDate,
			endDate,
			error: err instanceof Error ? err.message : 'Failed to load expense reports'
		};
	}
};
