import { getAdminLiveStats, getAdminActivityFeed } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const [liveStats, activityResult] = await Promise.all([
			getAdminLiveStats({ fetch }),
			getAdminActivityFeed(20, undefined, { fetch })
		]);

		return {
			liveStats,
			activities: activityResult.activities
		};
	} catch {
		return {
			liveStats: null,
			activities: [],
			loadError: true
		};
	}
};
