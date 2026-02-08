import { getAdminPlans } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const result = await getAdminPlans({ fetch });

	return {
		plans: result.plans
	};
};
