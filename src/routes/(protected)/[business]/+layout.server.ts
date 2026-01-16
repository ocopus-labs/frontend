import { getUserBusinesses } from '$lib/api';
import { getMySubscription } from '$lib/api/subscription';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
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
		return {
			businesses: [],
			subscription: null
		};
	}
};
