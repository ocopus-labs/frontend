import { redirect } from '@sveltejs/kit';
import { getUserBusinesses } from '$lib/api';
import { getMySubscription } from '$lib/api/subscription';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals, url }) => {
	// Check for session from hooks.server.ts
	if (!locals.session) {
		const returnTo = encodeURIComponent(url.pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	try {
		const [{ businesses }, subscriptionResponse] = await Promise.all([
			getUserBusinesses({ fetch }),
			getMySubscription({ fetch }).catch(() => ({ subscription: null }))
		]);

		return {
			businesses,
			subscription: subscriptionResponse.subscription
		};
	} catch (err) {
		console.warn('Failed to fetch user businesses:', err);
		redirect(307, '/login');
	}
};
