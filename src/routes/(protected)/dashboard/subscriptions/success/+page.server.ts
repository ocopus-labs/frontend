import type { PageServerLoad } from './$types';
import { getMySubscription, getSubscriptionUsage } from '$lib/api/subscription';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const [subscriptionResult, usageResult] = await Promise.all([
			getMySubscription({ fetch }),
			getSubscriptionUsage({ fetch }).catch(() => null)
		]);

		return {
			subscription: subscriptionResult.subscription,
			usage: usageResult?.usage ?? null
		};
	} catch (error) {
		console.error('Failed to load subscription:', error);
		return {
			subscription: null,
			usage: null
		};
	}
};
