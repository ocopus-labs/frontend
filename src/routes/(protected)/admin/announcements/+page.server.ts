import { getAdminAnnouncements } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const result = await getAdminAnnouncements({}, { fetch });

	return {
		announcements: result.data,
		total: result.total,
		totalPages: result.totalPages
	};
};
