import type { PageServerLoad } from './$types';

/**
 * Dodo checkout return URL — the backend hardcodes this path
 * (`subscription.service.ts:143`), which is why it survives the
 * subscriptions → billing merge. Don't move it without a coordinated
 * backend change; deploying the frontend first would break in-flight checkouts.
 *
 * The page polls `getMySubscription()` client-side for the webhook to land, so
 * all it needs from the server is the current subscription. It previously also
 * fetched usage stats that were never rendered.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { subscription } = await parent();
	return { subscription };
};
