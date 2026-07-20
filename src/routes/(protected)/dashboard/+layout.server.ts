import { redirect } from '@sveltejs/kit';
import { getUserBusinesses } from '$lib/api';
import { getMySubscription } from '$lib/api/subscription';
import { getUserFranchises } from '$lib/api/franchise';
import { listIncompleteOnboarding } from '$lib/api/onboarding';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals, url, depends }) => {
	depends('app:user-businesses');
	depends('app:onboarding');
	// Check for session from hooks.server.ts
	if (!locals.session) {
		const returnTo = encodeURIComponent(url.pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	try {
		const [{ businesses }, subscriptionResponse, franchiseResponse, incompleteResponse] =
			await Promise.all([
				getUserBusinesses({ fetch }),
				getMySubscription({ fetch }).catch(() => ({ subscription: null })),
				getUserFranchises({ fetch }).catch(() => ({ franchises: [] })),
				// Drives the resume-setup banner. Non-essential, so a failure here
				// must never take down the dashboard.
				listIncompleteOnboarding({ fetch }).catch(() => ({ businesses: [] }))
			]);

		return {
			businesses,
			subscription: subscriptionResponse.subscription,
			franchises: franchiseResponse.franchises,
			incompleteOnboarding: incompleteResponse.businesses
		};
	} catch (err) {
		console.warn('Failed to fetch user businesses:', err);
		return {
			businesses: [],
			subscription: null,
			incompleteOnboarding: []
		};
	}
};
