import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Subscriptions merged into /dashboard/billing.
 *
 * The two pages had grown ~90% duplicate (same subscription fetch, same status
 * badge, same plan+price block, a byte-identical portal handler). Billing is
 * now the single destination, with Plan & modules / Usage / Invoices tabs.
 *
 * Kept as a permanent redirect for old bookmarks and any external links.
 * NOTE: the child route /dashboard/subscriptions/result is NOT redirected —
 * the backend hardcodes it as the Dodo checkout return URL
 * (`subscription.service.ts`, `${FRONTEND_URL}/dashboard/subscriptions/result`).
 * Don't remove it until that URL is changed backend-side.
 */
export const load: PageServerLoad = async () => {
	redirect(308, '/dashboard/billing');
};
