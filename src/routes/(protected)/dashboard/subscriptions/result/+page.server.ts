import type { PageServerLoad } from './$types';
import { getSubscriptionUsage } from '$lib/api/subscription';

export const load: PageServerLoad = async ({ fetch, parent }) => {
	const parentData = await parent();
	try {
		const usageResult = await getSubscriptionUsage({ fetch }).catch(() => null);
		return {
			subscription: parentData.subscription,
			usage: usageResult?.usage ?? null
		};
	} catch (error) {
		console.error('Failed to load subscription:', error);
		return {
			subscription: parentData.subscription,
			usage: null
		};
	}
};
