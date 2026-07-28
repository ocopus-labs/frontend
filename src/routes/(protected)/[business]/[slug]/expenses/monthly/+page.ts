import type { PageLoad } from './$types';
import { getExpenses, getExpenseSummary, getExpenseCategories } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get month from URL or default to current month
	const monthParam = url.searchParams.get('month');
	const now = new Date();
	const selectedMonth =
		monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	// Calculate date range for the month
	const [year, month] = selectedMonth.split('-').map(Number);
	const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

	try {
		const [expensesData, summaryData, categoriesData] = await Promise.all([
			getExpenses(businessId, { startDate, endDate }, { fetch }),
			getExpenseSummary(businessId, { startDate, endDate }, { fetch }),
			getExpenseCategories(businessId, false, { fetch })
		]);

		return {
			...parentData,
			expenses: expensesData.expenses,
			summary: summaryData.summary,
			categories: categoriesData.categories,
			selectedMonth,
			startDate,
			endDate
		};
	} catch (err) {
		console.error('Failed to load monthly expenses:', err);
		return {
			...parentData,
			expenses: [],
			summary: {
				totalAmount: 0,
				pendingAmount: 0,
				approvedAmount: 0,
				paidAmount: 0,
				categoryBreakdown: {},
				monthlyTrend: []
			},
			categories: [],
			selectedMonth,
			startDate,
			endDate,
			error: err instanceof Error ? err.message : 'Failed to load monthly expenses'
		};
	}
};
