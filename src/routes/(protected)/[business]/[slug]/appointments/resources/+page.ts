import type { PageLoad } from './$types';
import { listResources } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:resources');
	const parentData = await parent();

	try {
		// Everything, not just active: retired rooms have to stay visible or
		// there is no way to bring one back.
		const resources = await listResources(parentData.businessId, undefined, { fetch });
		return { ...parentData, resources };
	} catch (err) {
		console.error('Failed to load resources:', err);
		return {
			...parentData,
			resources: [],
			error: err instanceof Error ? err.message : 'Failed to load resources'
		};
	}
};
