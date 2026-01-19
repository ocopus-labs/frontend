import { getAdminAnalytics } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const startDate = url.searchParams.get('startDate') || undefined;
	const endDate = url.searchParams.get('endDate') || undefined;

	const { analytics } = await getAdminAnalytics({ startDate, endDate }, { fetch });

	return {
		analytics,
		filters: { startDate, endDate }
	};
};
