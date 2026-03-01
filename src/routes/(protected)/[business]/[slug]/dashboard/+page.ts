import type { PageLoad } from './$types';
import {
	getDashboardStats,
	getAnalyticsDashboard,
	getPaymentMethodBreakdown,
	getRevenueTrends,
	getHourlyBreakdown,
	getTopSellingItems,
	getTableStats
} from '$lib/api';
import { getOrders } from '$lib/api/order';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;
	const period = url.searchParams.get('period') || 'month';

	// Map period to analytics API params
	const periodMap: Record<string, string> = {
		today: 'today',
		yesterday: 'yesterday',
		week: 'week',
		month: 'month'
	};
	const analyticsPeriod = periodMap[period] || 'month';

	try {
		const [
			stats,
			analyticsData,
			paymentData,
			revenueTrends,
			hourlyData,
			topItems,
			recentOrdersData,
			tableStats
		] = await Promise.all([
			getDashboardStats(businessId, undefined, { fetch }),
			getAnalyticsDashboard(businessId, { fetch }).catch(() => null),
			getPaymentMethodBreakdown(businessId, { period: analyticsPeriod as any }, { fetch }).catch(
				() => null
			),
			getRevenueTrends(businessId, 30, { fetch }).catch(() => null),
			getHourlyBreakdown(businessId, undefined, { fetch }).catch(() => null),
			getTopSellingItems(businessId, { limit: 5 }, { fetch }).catch(() => null),
			getOrders(businessId, { limit: 10 }, { fetch }).catch(() => null),
			getTableStats(businessId, { fetch }).catch(() => null)
		]);

		return {
			...parentData,
			period,
			dashboardStats: stats,
			analyticsComparison: analyticsData?.stats || null,
			paymentBreakdown: paymentData?.breakdown || [],
			revenueTrends: revenueTrends || [],
			hourlyBreakdown: hourlyData?.breakdown || [],
			topItems: topItems || [],
			recentOrders: recentOrdersData?.orders || [],
			tableStats: tableStats?.stats || null,
			orderStats: stats?.orders || null,
			statsError: null
		};
	} catch (error) {
		console.warn('Failed to fetch dashboard stats:', error);
		return {
			...parentData,
			period,
			dashboardStats: null,
			analyticsComparison: null,
			paymentBreakdown: [],
			revenueTrends: [],
			hourlyBreakdown: [],
			topItems: [],
			recentOrders: [],
			tableStats: null,
			orderStats: null,
			statsError: error instanceof Error ? error.message : 'Failed to load stats'
		};
	}
};
