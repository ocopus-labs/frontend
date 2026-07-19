import type { PageLoad } from './$types';
import { getOrderStats, getActiveOrders } from '$lib/api';

/**
 * Orders overview. Both calls are independent, so a failure in one shouldn't
 * blank the other half of the page — hence `allSettled` and per-section error
 * strings rather than a single throw.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const [statsResult, activeResult] = await Promise.allSettled([
		getOrderStats(businessId, undefined, { fetch }),
		getActiveOrders(businessId, { fetch })
	]);

	if (statsResult.status === 'rejected') {
		console.warn('Failed to fetch order stats:', statsResult.reason);
	}
	if (activeResult.status === 'rejected') {
		console.warn('Failed to fetch active orders:', activeResult.reason);
	}

	return {
		...parentData,
		stats: statsResult.status === 'fulfilled' ? statsResult.value.stats : null,
		activeOrders: activeResult.status === 'fulfilled' ? activeResult.value.orders : [],
		statsError: statsResult.status === 'rejected' ? 'Could not load order statistics.' : null,
		activeError: activeResult.status === 'rejected' ? 'Could not load the live order queue.' : null
	};
};
