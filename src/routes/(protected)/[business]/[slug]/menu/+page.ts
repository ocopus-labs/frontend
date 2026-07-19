import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * `/menu` had no index route. Unlike Orders, this doesn't get an overview
 * dashboard — the item list is what people open the menu to work on, so an
 * extra summary screen would be a stop on the way to the real page.
 *
 * 307, not 308: if a menu overview is ever wanted, it drops in here without a
 * cached permanent redirect fighting it.
 */
export const load: PageLoad = ({ params }) => {
	redirect(307, `/${params.business}/${params.slug}/menu/items`);
};
