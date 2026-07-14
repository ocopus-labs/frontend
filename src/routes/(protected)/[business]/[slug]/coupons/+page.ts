import type { PageLoad } from './$types';
import { listCoupons } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const coupons = await listCoupons(businessId, { fetch });
		return { ...parentData, coupons };
	} catch (err) {
		console.error('Failed to load coupons:', err);
		return {
			...parentData,
			coupons: [],
			error: err instanceof Error ? err.message : 'Failed to load coupons'
		};
	}
};
