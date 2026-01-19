import { getAdminUsers } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const banned = url.searchParams.get('banned');
	const search = url.searchParams.get('search') || undefined;
	const role = url.searchParams.get('role') || undefined;
	const sortBy = url.searchParams.get('sortBy') || undefined;
	const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

	const result = await getAdminUsers(
		{
			page,
			limit,
			banned: banned === 'true' ? true : banned === 'false' ? false : undefined,
			search,
			role,
			sortBy,
			sortOrder
		},
		{ fetch }
	);

	return {
		...result,
		filters: { banned, search, role, sortBy, sortOrder }
	};
};
