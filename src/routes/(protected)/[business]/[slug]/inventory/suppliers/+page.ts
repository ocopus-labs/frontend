import type { PageLoad } from './$types';
import { getSuppliers, getSupplierStats } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	try {
		const [suppliersData, statsData] = await Promise.all([
			getSuppliers(businessId, { limit, offset }, { fetch }),
			getSupplierStats(businessId, { fetch })
		]);

		const total = suppliersData.total ?? suppliersData.suppliers.length;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			...parentData,
			suppliers: suppliersData.suppliers,
			stats: statsData.stats,
			page,
			limit,
			total,
			totalPages
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
			page: 1,
			limit,
			total: 0,
			totalPages: 1,
			error: err instanceof Error ? err.message : 'Failed to load suppliers'
		};
	}
};
