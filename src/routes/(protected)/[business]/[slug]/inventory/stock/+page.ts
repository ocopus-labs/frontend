import type { PageLoad } from './$types';
import { getInventoryItems, getInventoryStats } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [itemsData, statsData] = await Promise.all([
			getInventoryItems(businessId, undefined, { fetch }),
			getInventoryStats(businessId, { fetch })
		]);

		return {
			...parentData,
			items: itemsData.items,
			stats: statsData.stats
		};
	} catch (err) {
		console.error('Failed to load inventory:', err);
		return {
			...parentData,
			items: [],
			stats: {
				totalItems: 0,
				inStock: 0,
				lowStock: 0,
				outOfStock: 0,
				totalValue: 0
			},
			error: err instanceof Error ? err.message : 'Failed to load inventory'
		};
	}
};
