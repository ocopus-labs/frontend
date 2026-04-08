import type { PageLoad } from './$types';
import { getAccountingExports } from '$lib/api/accounting';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:accounting-exports');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const result = await getAccountingExports(businessId, { limit: 20, offset: 0 }, { fetch });
		return {
			...parentData,
			exports: result.exports,
			total: result.total
		};
	} catch (err) {
		console.error('Failed to load accounting exports:', err);
		return {
			...parentData,
			exports: [],
			total: 0,
			error: err instanceof Error ? err.message : 'Failed to load accounting exports'
		};
	}
};
