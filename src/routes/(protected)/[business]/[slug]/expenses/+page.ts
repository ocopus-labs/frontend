import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * `/expenses` had no index route at all. That was invisible while the sidebar
 * rendered "Expenses" as a collapsible group trigger rather than a link — but
 * the entry is now a plain link (the three sub-items moved into the tab bar),
 * so this path is reachable and needs to land somewhere.
 *
 * 307 rather than 308: Daily is the sensible default view, not a permanent
 * identity for this URL. If an expenses overview page is ever added, it drops
 * in here without a cached permanent redirect fighting it.
 */
export const load: PageLoad = ({ params }) => {
	redirect(307, `/${params.business}/${params.slug}/expenses/daily`);
};
