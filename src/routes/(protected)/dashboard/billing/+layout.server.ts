import { getSubscriptionPlans, getSubscriptionUsage } from '$lib/api/subscription';
import type { LayoutServerLoad } from './$types';

/**
 * Loaded once for the whole billing section so the Plan / Usage / Invoices tabs
 * share it instead of each re-fetching. `subscription` comes from the parent
 * dashboard layout.
 */
export const load: LayoutServerLoad = async ({ fetch, parent }) => {
	const [{ subscription }, plansResponse, usageResponse] = await Promise.all([
		parent(),
		getSubscriptionPlans({ fetch }).catch(() => ({ plans: [] })),
		getSubscriptionUsage({ fetch }).catch(() => ({ usage: null }))
	]);

	// Both endpoints wrap their payload — unwrap so pages get the bare list/object.
	return { subscription, plans: plansResponse.plans, usage: usageResponse.usage };
};
