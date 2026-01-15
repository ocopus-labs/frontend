import { redirect } from '@sveltejs/kit';
import { getUserBusinesses } from '$lib/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, cookies, url }) => {
	// Check for session cookie (better-auth uses this pattern)
	const sessionCookie = cookies.get('better-auth.session_token');

	if (!sessionCookie) {
		// Redirect to login with return URL
		const returnTo = encodeURIComponent(url.pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	try {
		const { businesses } = await getUserBusinesses({ fetch });
		return {
			businesses
		};
	} catch (err) {
		console.warn('Failed to fetch user businesses:', err);
		// If API call fails (might be auth issue), redirect to login
		redirect(307, '/login');
	}
};
