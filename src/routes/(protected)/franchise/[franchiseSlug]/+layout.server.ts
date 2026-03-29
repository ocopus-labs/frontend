import { error, redirect } from '@sveltejs/kit';
import { getFranchiseBySlug } from '$lib/api/franchise';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals, params }) => {
	if (!locals.session) {
		redirect(307, '/login');
	}

	try {
		const { franchise, userRole } = await getFranchiseBySlug(params.franchiseSlug, { fetch });
		return { franchise, userRole };
	} catch (err: any) {
		if (err?.statusCode === 404 || err?.status === 404) {
			error(404, 'Franchise not found');
		}
		throw err;
	}
};
