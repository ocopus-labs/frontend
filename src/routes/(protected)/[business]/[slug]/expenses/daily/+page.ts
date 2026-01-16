import type { PageLoad } from './$types';
import { getExpenses, getExpenseCategories } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get date from URL or default to today
	const dateParam = url.searchParams.get('date');
	const selectedDate = dateParam || new Date().toISOString().split('T')[0];

	try {
		const [expensesData, categoriesData] = await Promise.all([
			getExpenses(businessId, { startDate: selectedDate, endDate: selectedDate }, { fetch }),
			getExpenseCategories(businessId, false, { fetch })
		]);

		return {
			...parentData,
			expenses: expensesData.expenses,
			categories: categoriesData.categories,
			selectedDate
		};
	} catch (err) {
		console.error('Failed to load expenses:', err);
		return {
			...parentData,
			expenses: [],
			categories: [],
			selectedDate,
			error: err instanceof Error ? err.message : 'Failed to load expenses'
		};
	}
};
