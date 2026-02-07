import type { PageLoad } from './$types';
import {
	getDashboardStats,
	getTopSellingItems,
	getPeakHours,
	getRevenueTrends,
	getAnalyticsDashboard,
	getPaymentMethodBreakdown,
	getHourlyBreakdown
} from '$lib/api';

function getDaysFromRange(range: string): number {
	switch (range) {
		case '7d':
			return 7;
		case '30d':
			return 30;
		case '90d':
			return 90;
		case '1y':
			return 365;
		default:
			return 7;
	}
}

function getRangePeriod(range: string): string {
	switch (range) {
		case '7d':
			return 'week';
		case '30d':
			return 'month';
		case '90d':
			return 'quarter';
		case '1y':
			return 'year';
		default:
			return 'week';
	}
}

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;
	const dateRange = url.searchParams.get('range') || '7d';
	const days = getDaysFromRange(dateRange);
	const period = getRangePeriod(dateRange);

	try {
		const [stats, topItems, peakHours, revenueTrends, analyticsData, paymentData, hourlyData] = await Promise.all([
			getDashboardStats(businessId, undefined, { fetch }),
			getTopSellingItems(businessId, { limit: 5, days }, { fetch }),
			getPeakHours(businessId, days, { fetch }),
			getRevenueTrends(businessId, days, { fetch }),
			getAnalyticsDashboard(businessId, { fetch }).catch(() => null),
			getPaymentMethodBreakdown(businessId, { period: period as any }, { fetch }).catch(() => null),
			getHourlyBreakdown(businessId, undefined, { fetch }).catch(() => null)
		]);

		return {
			...parentData,
			dateRange,
			stats,
			topItems,
			peakHours,
			revenueTrends,
			analyticsComparison: analyticsData?.stats || null,
			paymentBreakdown: paymentData?.breakdown || [],
			hourlyBreakdown: hourlyData?.breakdown || [],
			analyticsError: null
		};
	} catch (error) {
		console.warn('Failed to fetch analytics data:', error);
		return {
			...parentData,
			dateRange,
			stats: null,
			topItems: null,
			peakHours: null,
			revenueTrends: null,
			analyticsComparison: null,
			paymentBreakdown: [],
			hourlyBreakdown: [],
			analyticsError: error instanceof Error ? error.message : 'Failed to load analytics'
		};
	}
};
