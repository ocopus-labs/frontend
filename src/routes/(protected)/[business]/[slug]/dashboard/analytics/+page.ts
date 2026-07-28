import type { PageLoad } from './$types';
import {
	getDashboardStats,
	getTopSellingItems,
	getRevenueTrends,
	getAnalyticsDashboard,
	getPaymentMethodBreakdown,
	getHourlyBreakdown,
	getSalesForecast
} from '$lib/api';
import { getOrderStats } from '$lib/api/order';

/** Returns the ISO date string (YYYY-MM-DD) for `daysAgo` days before today. */
function dateStringDaysAgo(daysAgo: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return d.toISOString().split('T')[0];
}

/** Day-of-week short label matching the heatmap component's DAYS array (Sun..Sat). */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

	// Fetch 7 individual days for the revenue heatmap (last 7 days including today)
	const heatmapDateStrings = Array.from({ length: 7 }, (_, i) => dateStringDaysAgo(6 - i));

	try {
		const [
			stats,
			topItems,
			revenueTrends,
			analyticsData,
			paymentData,
			hourlyData,
			orderStats,
			forecastData,
			...heatmapDayResults
		] = await Promise.all([
			getDashboardStats(businessId, undefined, { fetch, period }),
			getTopSellingItems(businessId, { limit: 10, days }, { fetch }),
			getRevenueTrends(businessId, days, { fetch }),
			getAnalyticsDashboard(businessId, { fetch }).catch(() => null),
			getPaymentMethodBreakdown(businessId, { period: period as any }, { fetch }).catch(() => null),
			getHourlyBreakdown(businessId, undefined, { fetch }).catch(() => null),
			getOrderStats(businessId, undefined, { fetch }).catch(() => null),
			getSalesForecast(businessId, 7, { fetch }).catch(() => null),
			...heatmapDateStrings.map((dateStr) =>
				getHourlyBreakdown(businessId, dateStr, { fetch }).catch(() => null)
			)
		]);

		// Build heatmap data: { day, hour, revenue }[]
		const revenueHeatmapData: { day: string; hour: number; revenue: number }[] = [];
		heatmapDateStrings.forEach((dateStr, idx) => {
			const result = heatmapDayResults[idx];
			if (!result?.breakdown) return;
			const dayLabel = DAY_LABELS[new Date(dateStr + 'T12:00:00').getDay()];
			for (const h of result.breakdown) {
				if (h.revenue > 0) {
					revenueHeatmapData.push({ day: dayLabel, hour: h.hour, revenue: h.revenue });
				}
			}
		});

		return {
			...parentData,
			dateRange,
			stats,
			topItems,
			revenueTrends,
			analyticsComparison: analyticsData?.stats || null,
			paymentBreakdown: paymentData?.breakdown || [],
			hourlyBreakdown: hourlyData?.breakdown || [],
			orderStats: orderStats?.stats || null,
			revenueHeatmapData,
			forecastData: forecastData?.forecasts || [],
			analyticsError: null
		};
	} catch (error) {
		console.warn('Failed to fetch analytics data:', error);
		return {
			...parentData,
			dateRange,
			stats: null,
			topItems: null,
			revenueTrends: null,
			analyticsComparison: null,
			paymentBreakdown: [],
			hourlyBreakdown: [],
			orderStats: null,
			revenueHeatmapData: [],
			forecastData: [],
			analyticsError: error instanceof Error ? error.message : 'Failed to load analytics'
		};
	}
};
