import { getAdminBusinessDetails } from '$lib/api/admin';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	try {
		const result = await getAdminBusinessDetails(params.id, { fetch });
		return result;
	} catch (e) {
		throw error(404, 'Business not found');
	}
};
