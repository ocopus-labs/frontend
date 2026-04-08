import type { PageLoad } from './$types';
import { getActiveWaitlist } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const result = await getActiveWaitlist(businessId, { fetch });
		return {
			...parentData,
			queue: result.queue
		};
	} catch (err) {
		console.error('Failed to load waitlist:', err);
		return {
			...parentData,
			queue: [],
			error: err instanceof Error ? err.message : 'Failed to load waitlist'
		};
	}
};
