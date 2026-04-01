import type { PageServerLoad } from './$types';
import {
	getSubscriptionPlans,
	getSubscriptionUsage
} from '$lib/api/subscription';

export const load: PageServerLoad = async ({ fetch, parent }) => {
	const parentData = await parent();

	const [plansResponse, usageResponse] = await Promise.all([
		getSubscriptionPlans({ fetch }).catch((err) => {
			console.warn('Failed to fetch plans:', err);
			return { plans: [] as import('$lib/api/subscription').SubscriptionPlan[] };
		}),
		getSubscriptionUsage({ fetch }).catch(() => ({ usage: null }))
	]);

	return {
		...parentData,
		plans: plansResponse.plans,
		subscription: parentData.subscription,
		usage: usageResponse.usage
	};
};
