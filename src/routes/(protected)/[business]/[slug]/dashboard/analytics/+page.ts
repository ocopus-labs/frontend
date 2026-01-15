import type { PageLoad } from './$types';
import {
	getDashboardStats,
	getTopSellingItems,
	getPeakHours,
	getRevenueTrends
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

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;
	const dateRange = url.searchParams.get('range') || '7d';
	const days = getDaysFromRange(dateRange);

	try {
		const [stats, topItems, peakHours, revenueTrends] = await Promise.all([
			getDashboardStats(businessId, undefined, { fetch }),
			getTopSellingItems(businessId, { limit: 5, days }, { fetch }),
			getPeakHours(businessId, days, { fetch }),
			getRevenueTrends(businessId, days, { fetch })
		]);

		return {
			...parentData,
			dateRange,
			stats,
			topItems,
			peakHours,
			revenueTrends,
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
			analyticsError: error instanceof Error ? error.message : 'Failed to load analytics'
		};
	}
};
