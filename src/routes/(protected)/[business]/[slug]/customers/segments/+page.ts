import type { PageLoad } from './$types';
import { getSegments } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:segments');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const segmentsData = await getSegments(businessId, { fetch });

		return {
			...parentData,
			segments: segmentsData.segments
		};
	} catch (err) {
		console.error('Failed to load segments:', err);
		return {
			...parentData,
			segments: [],
			error: err instanceof Error ? err.message : 'Failed to load segments'
		};
	}
};
