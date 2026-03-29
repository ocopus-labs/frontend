import { redirect } from '@sveltejs/kit';
import { getUserBusinesses } from '$lib/api';
import { getMySubscription } from '$lib/api/subscription';
import { getUserFranchises } from '$lib/api/franchise';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals, url, depends }) => {
	depends('app:user-businesses');
	// Check for session from hooks.server.ts
	if (!locals.session) {
		const returnTo = encodeURIComponent(url.pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	try {
		const [{ businesses }, subscriptionResponse, franchiseResponse] = await Promise.all([
			getUserBusinesses({ fetch }),
			getMySubscription({ fetch }).catch(() => ({ subscription: null })),
			getUserFranchises({ fetch }).catch(() => ({ franchises: [] }))
		]);

		return {
			businesses,
			subscription: subscriptionResponse.subscription,
			franchises: franchiseResponse.franchises
		};
	} catch (err) {
		console.warn('Failed to fetch user businesses:', err);
		return {
			businesses: [],
			subscription: null
		};
	}
};
