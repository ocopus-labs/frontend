import type { PageLoad } from './$types';
import { getCustomers, getCustomerStats, getCustomerInsights, getLoyaltySettings, getLoyaltyLeaderboard } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:customers');
	const parentData = await parent();
	const businessId = parentData.businessId;

	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 25));
	const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || '';

	try {
		const [customersData, statsData, insightsData, loyaltySettingsResult, leaderboardResult] = await Promise.allSettled([
			getCustomers(
				businessId,
				{
					search: search || undefined,
					status: status || undefined,
					limit,
					offset
				},
				{ fetch }
			),
			getCustomerStats(businessId, { fetch }),
			getCustomerInsights(businessId, { fetch }),
			getLoyaltySettings(businessId, { fetch }),
			getLoyaltyLeaderboard(businessId, { fetch })
		]);

		const customers = customersData.status === 'fulfilled' ? customersData.value : { customers: [], total: 0 };
		const stats = statsData.status === 'fulfilled' ? statsData.value : { stats: { total: 0, active: 0, inactive: 0, newThisMonth: 0 } };
		const insights = insightsData.status === 'fulfilled' ? insightsData.value : null;
		const loyaltySettings = loyaltySettingsResult.status === 'fulfilled' ? loyaltySettingsResult.value.settings : null;
		const leaderboard = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value.leaderboard : [];

		return {
			...parentData,
			customers: customers.customers,
			total: customers.total,
			stats: stats.stats,
			insights,
			pagination: { limit, offset },
			filters: { search, status },
			loyaltySettings,
			loyaltyLeaderboard: leaderboard,
		};
	} catch (err) {
		console.error('Failed to load customers:', err);
		return {
			...parentData,
			customers: [],
			total: 0,
			stats: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
			insights: null,
			pagination: { limit, offset },
			filters: { search, status },
			loyaltySettings: null,
			loyaltyLeaderboard: [],
			error: err instanceof Error ? err.message : 'Failed to load customers'
		};
	}
};
