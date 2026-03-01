import type { PageServerLoad } from './$types';
import {
	getSubscriptionPlans,
	getMySubscription,
	getSubscriptionUsage
} from '$lib/api/subscription';

export const load: PageServerLoad = async ({ fetch, parent }) => {
	// Get parent data (includes businesses)
	const parentData = await parent();

	// Fetch subscription data in parallel — use individual .catch() so a
	// failure in an auth-required endpoint doesn't wipe out the plans list.
	const [plansResponse, subscriptionResponse, usageResponse] = await Promise.all([
		getSubscriptionPlans({ fetch }).catch((err) => {
			console.warn('Failed to fetch plans:', err);
			return { plans: [] as import('$lib/api/subscription').SubscriptionPlan[] };
		}),
		getMySubscription({ fetch }).catch(() => ({ subscription: null })),
		getSubscriptionUsage({ fetch }).catch(() => ({ usage: null }))
	]);

	return {
		...parentData,
		plans: plansResponse.plans,
		subscription: subscriptionResponse.subscription ?? parentData.subscription,
		usage: usageResponse.usage
	};
};
