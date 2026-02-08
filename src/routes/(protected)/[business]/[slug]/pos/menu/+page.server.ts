import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ params }) => {
	redirect(302, `/${params.business}/${params.slug}/menu/items`);
};
