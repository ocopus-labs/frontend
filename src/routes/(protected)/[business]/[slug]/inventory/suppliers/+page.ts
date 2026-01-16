import type { PageLoad } from './$types';
import { getSuppliers, getSupplierStats } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [suppliersData, statsData] = await Promise.all([
			getSuppliers(businessId, undefined, { fetch }),
			getSupplierStats(businessId, { fetch })
		]);

		return {
			...parentData,
			suppliers: suppliersData.suppliers,
			stats: statsData.stats
		};
	} catch (err) {
		console.error('Failed to load suppliers:', err);
		return {
			...parentData,
			suppliers: [],
			stats: {
				total: 0,
				active: 0,
				inactive: 0,
				totalOrders: 0
			},
			error: err instanceof Error ? err.message : 'Failed to load suppliers'
		};
	}
};
