import type { PageLoad } from './$types';
import {
	getDashboardStats,
	getAnalyticsDashboard,
	getPaymentMethodBreakdown,
	getRevenueTrends,
	getHourlyBreakdown,
	getTopSellingItems,
	getTableStats,
	getShiftHistory
} from '$lib/api';
import { getOrders } from '$lib/api/order';

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:dashboard');
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
		// Map period to days for top-items endpoint
		const periodDaysMap: Record<string, number> = {
			today: 1,
			yesterday: 1,
			week: 7,
			month: 30
		};
		const days = periodDaysMap[analyticsPeriod] || 30;

		const [
			stats,
			analyticsData,
			paymentData,
			revenueTrends,
			hourlyData,
			topItems,
			recentOrdersData,
			tableStats,
			activeShiftsData
		] = await Promise.all([
			getDashboardStats(businessId, undefined, { fetch, period: analyticsPeriod }),
			getAnalyticsDashboard(businessId, { fetch }).catch(() => null),
			getPaymentMethodBreakdown(businessId, { period: analyticsPeriod as any }, { fetch }).catch(
				() => null
			),
			getRevenueTrends(businessId, days, { fetch }).catch(() => null),
			getHourlyBreakdown(businessId, undefined, { fetch }).catch(() => null),
			getTopSellingItems(businessId, { limit: 5, days }, { fetch }).catch(() => null),
			getOrders(businessId, { limit: 10 }, { fetch }).catch(() => null),
			getTableStats(businessId, { fetch }).catch(() => null),
			getShiftHistory(businessId, { limit: 100 }, { fetch }).catch(() => null)
		]);

		const onDutyCount = activeShiftsData
			? activeShiftsData.shifts.filter((s: any) => s.status === 'active').length
			: 0;

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
			onDutyCount,
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
			onDutyCount: 0,
			statsError: error instanceof Error ? error.message : 'Failed to load stats'
		};
	}
};
