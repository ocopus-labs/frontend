import type { PageLoad } from './$types';
import { getExpenses, getExpenseCategories } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const dateParam = url.searchParams.get('date');
	const selectedDate = dateParam || new Date().toISOString().split('T')[0];
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	try {
		const [expensesData, categoriesData] = await Promise.all([
			getExpenses(businessId, { startDate: selectedDate, endDate: selectedDate, limit, offset }, { fetch }),
			getExpenseCategories(businessId, false, { fetch })
		]);

		const total = expensesData.total;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			...parentData,
			expenses: expensesData.expenses,
			categories: categoriesData.categories,
			selectedDate,
			page,
			limit,
			total,
			totalPages
		};
	} catch (err) {
		console.error('Failed to load expenses:', err);
		return {
			...parentData,
			expenses: [],
			categories: [],
			selectedDate,
			page: 1,
			limit,
			total: 0,
			totalPages: 1,
			error: err instanceof Error ? err.message : 'Failed to load expenses'
		};
	}
};
