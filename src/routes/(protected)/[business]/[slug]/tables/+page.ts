import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * `/tables` had no index route. That was invisible while the sidebar rendered
 * "Tables" as a collapsible group trigger rather than a link — but the entry is
 * now a plain link (the sub-items moved into the tab bar), so this path is
 * reachable and needs to land somewhere.
 *
 * 307 rather than 308: the floor plan is the sensible default view, not a
 * permanent identity for this URL. If a tables overview is ever added, it drops
 * in here without a cached permanent redirect fighting it.
 */
export const load: PageLoad = ({ params }) => {
	redirect(307, `/${params.business}/${params.slug}/tables/layout`);
};
