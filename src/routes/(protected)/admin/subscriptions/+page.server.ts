import { getAdminSubscriptions } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const status = url.searchParams.get('status') || undefined;
	const planId = url.searchParams.get('planId') || undefined;

	const result = await getAdminSubscriptions({ page, limit, status, planId }, { fetch });

	return {
		...result,
		filters: { status, planId }
	};
};
