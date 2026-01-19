import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	const user = locals.user;

	if (user && !user.banned) {
		if (user.role === 'super_admin') {
			throw redirect(307, '/admin/dashboard');
		} else {
			throw redirect(307, '/dashboard');
		}
	}
};
