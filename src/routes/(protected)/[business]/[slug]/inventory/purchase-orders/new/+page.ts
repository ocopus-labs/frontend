import type { PageLoad } from './$types';
import { getInventoryItems, getSuppliers } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:purchase-orders');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [inventoryData, suppliersData] = await Promise.all([
			getInventoryItems(businessId, { limit: 500, active: true }, { fetch }),
			getSuppliers(businessId, { status: 'active', limit: 200 }, { fetch })
		]);

		return {
			...parentData,
			inventoryItems: inventoryData.items,
			suppliers: suppliersData.suppliers
		};
	} catch (err) {
		console.error('Failed to load data for new purchase order:', err);
		return {
			...parentData,
			inventoryItems: [],
			suppliers: [],
			error: err instanceof Error ? err.message : 'Failed to load data'
		};
	}
};
