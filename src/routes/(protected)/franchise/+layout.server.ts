import { redirect } from '@sveltejs/kit';
import { getUserFranchises } from '$lib/api/franchise';
import { getUserBusinesses } from '$lib/api';
import { getMySubscription } from '$lib/api/subscription';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals }) => {
	if (!locals.session) {
		redirect(307, '/login');
	}

	// The shared sidebar needs businesses + subscription; without them it
	// renders an empty business list for the whole franchise section.
	const [franchiseResult, businessResult, subscriptionResult] = await Promise.all([
		getUserFranchises({ fetch }).catch((err) => {
			console.warn('Failed to fetch franchises:', err);
			return { franchises: [] };
		}),
		getUserBusinesses({ fetch }).catch((err) => {
			console.warn('Failed to fetch businesses:', err);
			return { businesses: [] };
		}),
		getMySubscription({ fetch }).catch(() => ({ subscription: null }))
	]);

	return {
		franchises: franchiseResult.franchises,
		businesses: businessResult.businesses,
		subscription: subscriptionResult.subscription
	};
};
