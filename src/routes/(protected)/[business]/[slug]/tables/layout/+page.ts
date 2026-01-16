import type { PageLoad } from './$types';
import { getTables, getTableStats } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [tablesData, statsData] = await Promise.all([
			getTables(businessId, undefined, { fetch }),
			getTableStats(businessId, { fetch })
		]);

		return {
			...parentData,
			tables: tablesData.tables,
			stats: statsData.stats
		};
	} catch (err) {
		console.error('Failed to load tables:', err);
		return {
			...parentData,
			tables: [],
			stats: {
				total: 0,
				available: 0,
				occupied: 0,
				reserved: 0,
				maintenance: 0,
				out_of_service: 0
			},
			error: err instanceof Error ? err.message : 'Failed to load tables'
		};
	}
};
