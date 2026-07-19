import { getSubscriptionPlans, type SubscriptionPlan } from '$lib/api/subscription';
import type { PageServerLoad } from './$types';

/**
 * Tier prices and limits are authoritative from the API (`GET /subscription/plans`,
 * public/anonymous, cached 300s). The page merges them with the positioning copy in
 * `$lib/config/pricing`. If the call fails we return an empty list and the page falls
 * back to `TIER_FALLBACK` so pricing still renders during an outage.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const plans: SubscriptionPlan[] = await getSubscriptionPlans({ fetch })
		.then((res) => res.plans ?? [])
		.catch(() => []);

	return { plans };
};
