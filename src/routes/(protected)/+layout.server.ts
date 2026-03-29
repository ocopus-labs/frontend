import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		const returnTo = encodeURIComponent(url.pathname + url.search);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	return {
		user: locals.user,
		session: locals.session
	};
};
