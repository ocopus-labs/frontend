import { getAdminBusinesses } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url, depends }) => {
	depends('app:admin-businesses');
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const status = url.searchParams.get('status') || undefined;
	const type = url.searchParams.get('type') || undefined;
	const search = url.searchParams.get('search') || undefined;
	const sortBy = url.searchParams.get('sortBy') || undefined;
	const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

	const result = await getAdminBusinesses(
		{ page, limit, status, type, search, sortBy, sortOrder },
		{ fetch }
	);

	return {
		...result,
		filters: { status, type, search, sortBy, sortOrder }
	};
};
