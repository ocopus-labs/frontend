import { getAdminPlans } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, depends }) => {
	depends('app:plans');
	const result = await getAdminPlans({ fetch });

	return {
		plans: result.plans
	};
};
