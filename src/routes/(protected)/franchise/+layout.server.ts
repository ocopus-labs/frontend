import { redirect } from '@sveltejs/kit';
import { getUserFranchises } from '$lib/api/franchise';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals }) => {
	if (!locals.session) {
		redirect(307, '/login');
	}

	try {
		const { franchises } = await getUserFranchises({ fetch });
		return { franchises };
	} catch (err) {
		console.warn('Failed to fetch franchises:', err);
		return { franchises: [] };
	}
};
