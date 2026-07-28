import type { PageLoad } from './$types';
import {
	getInventoryItems,
	getInventoryStats,
	getDemandPrediction,
	getReorderSuggestions
} from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:inventory');
	const parentData = await parent();
	const businessId = parentData.businessId;

	const limit = parseInt(url.searchParams.get('limit') || '25', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);

	try {
		const [itemsData, statsData, demandData, reorderData] = await Promise.all([
			getInventoryItems(businessId, { limit, offset }, { fetch }),
			getInventoryStats(businessId, { fetch }),
			getDemandPrediction(businessId, undefined, { fetch }).catch(() => null),
			getReorderSuggestions(businessId, { fetch }).catch(() => null)
		]);

		return {
			...parentData,
			items: itemsData.items,
			total: itemsData.total,
			pagination: { limit, offset },
			stats: statsData.stats,
			demandPredictions: demandData?.predictions || [],
			reorderSuggestions: reorderData?.suggestions || []
		};
	} catch (err) {
		console.warn('Failed to load inventory:', err);
		return {
			...parentData,
			items: [],
			total: 0,
			pagination: { limit, offset },
			stats: {
				totalItems: 0,
				inStock: 0,
				lowStock: 0,
				outOfStock: 0,
				totalValue: 0
			},
			demandPredictions: [],
			reorderSuggestions: [],
			error: err instanceof Error ? err.message : 'Failed to load inventory'
		};
	}
};
