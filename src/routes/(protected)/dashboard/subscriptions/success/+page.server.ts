import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * This route is deprecated in favor of /dashboard/subscriptions/result,
 * which handles both success and failure states.
 *
 * We redirect here to preserve backwards compatibility in case any
 * old bookmarks or external links point to /subscriptions/success.
 * All query parameters (subscription_id, session_id, etc.) are preserved.
 */
export const load: PageServerLoad = async ({ url }) => {
	const queryString = url.searchParams.toString();
	const target = queryString
		? `/dashboard/subscriptions/result?${queryString}`
		: '/dashboard/subscriptions/result';

	redirect(307, target);
};
