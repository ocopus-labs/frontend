import { getAdminAuditLogs } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 50;
	const userId = url.searchParams.get('userId') || undefined;
	const resource = url.searchParams.get('resource') || undefined;
	const action = url.searchParams.get('action') || undefined;

	const result = await getAdminAuditLogs({ page, limit, userId, resource, action }, { fetch });

	return {
		...result,
		filters: { userId, resource, action }
	};
};
