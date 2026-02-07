import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * This route is deprecated in favor of /dashboard/subscriptions/result,
 * which handles success, processing, and cancelled states.
 *
 * We redirect here to preserve backwards compatibility in case any
 * old bookmarks or external links point to /subscriptions/cancelled.
 * All query parameters are preserved.
 */
export const load: PageServerLoad = async ({ url }) => {
	const queryString = url.searchParams.toString();
	const target = queryString
		? `/dashboard/subscriptions/result?${queryString}`
		: '/dashboard/subscriptions/result';

	redirect(307, target);
};
