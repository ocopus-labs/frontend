import { getAdminActivityFeed } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const { activities } = await getAdminActivityFeed(15, undefined, { fetch });
		return {
			activities
		};
	} catch {
		return {
			activities: [],
			activityFeedError: true
		};
	}
};
