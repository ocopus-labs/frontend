import type { PageServerLoad } from './$types';
import {
	getSubscriptionPlans,
	getMySubscription,
	getSubscriptionUsage
} from '$lib/api/subscription';

export const load: PageServerLoad = async ({ fetch, parent }) => {
	// Get parent data (includes businesses)
	const parentData = await parent();

	try {
		// Fetch subscription data in parallel
		const [plansResponse, subscriptionResponse, usageResponse] = await Promise.all([
			getSubscriptionPlans({ fetch }),
			getMySubscription({ fetch }),
			getSubscriptionUsage({ fetch })
		]);

		return {
			...parentData,
			plans: plansResponse.plans,
			subscription: subscriptionResponse.subscription,
			usage: usageResponse.usage
		};
	} catch (err) {
		console.warn('Failed to fetch subscription data:', err);
		// Return empty data if API fails
		return {
			...parentData,
			plans: [],
			subscription: null,
			usage: null
		};
	}
};
