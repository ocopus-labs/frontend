import { redirect } from '@sveltejs/kit';
import { getAdminStats } from '$lib/api/admin';
import type { LayoutServerLoad } from './$types';

const SUPER_ADMIN_ROLE = 'super_admin';

export const load: LayoutServerLoad = async ({ fetch, locals, url, depends }) => {
	depends('app:auth');

	// Check for session from hooks.server.ts
	if (!locals.session) {
		const returnTo = encodeURIComponent(url.pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	// Check if user has super_admin role
	const user = locals.user;
	if (!user || user.role !== SUPER_ADMIN_ROLE) {
		// Redirect non-admins to regular dashboard
		redirect(307, '/dashboard');
	}

	try {
		const { stats } = await getAdminStats({ fetch });

		return {
			user,
			stats
		};
	} catch (err) {
		// Still allow access even if stats fail
		return {
			user,
			stats: null,
			statsError: true
		};
	}
};
