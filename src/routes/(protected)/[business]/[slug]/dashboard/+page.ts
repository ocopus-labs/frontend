import type { PageLoad } from './$types';
import { getDashboardStats } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const stats = await getDashboardStats(businessId, undefined, { fetch });
		return {
			...parentData,
			dashboardStats: stats,
			statsError: null
		};
	} catch (error) {
		console.warn('Failed to fetch dashboard stats:', error);
		// Return null stats so page can show fallback UI
		return {
			...parentData,
			dashboardStats: null,
			statsError: error instanceof Error ? error.message : 'Failed to load stats'
		};
	}
};
