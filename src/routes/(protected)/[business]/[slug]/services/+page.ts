import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * `/services` is the salon/spa/clinic name for the catalog. It is not a second
 * implementation — the rows, the API and the pages are the same as `/menu`, so
 * this redirects into that section rather than forking five pages that would
 * then drift apart.
 *
 * The relabelling ("Menu" → "Services") happens inside those pages via
 * `catalogVocabulary()`, and the feature gate in `[slug]/+layout.server.ts`
 * knows that a service vertical's catalog is gated on `services`, not `menu`.
 *
 * 307, not 308: if services ever need their own screens — per-service staff
 * assignment, duration editing at scale — they drop in here without a cached
 * permanent redirect fighting it.
 */
export const load: PageLoad = ({ params }) => {
	redirect(307, `/${params.business}/${params.slug}/menu/items`);
};
