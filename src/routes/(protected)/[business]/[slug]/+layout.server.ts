import { getBusinessContext } from '$lib/api';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';
import { catalogFeatureSlug } from '$lib/utils/catalog';
import { isRedirect, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Map route prefixes to required feature slugs.
 * If the path after the business slug *starts with* one of these keys and the
 * feature is not enabled, the user is redirected to the dashboard.
 *
 * Keys are matched with `startsWith`, so a nested route must be spelled out in
 * full — `/reservations` never matched anything, because the route it meant to
 * guard is `/tables/reservations`. Nested entries are listed after the parent
 * they sit under so a missing dependency (`tables`) is reported before the
 * extra that depends on it (`reservations`).
 */
const ROUTE_FEATURE_MAP: Record<string, string> = {
	'/tables': 'tables',
	// Reservations is a separate extra that only `dependsOn: ['tables']`, and it
	// gates the waitlist controller too (`@RequireBusinessFeature('reservations')`
	// on both reservation.controller.ts and waitlist.controller.ts).
	'/tables/reservations': 'reservations',
	'/tables/waitlist': 'reservations',
	// `/menu` is deliberately absent — the catalog's gating slug depends on the
	// vertical (`menu` for food, `services` for salon/spa/clinic), which a flat
	// prefix→slug map cannot express. It is resolved below via
	// `catalogFeatureSlug()`. Gating it on `menu` here would bounce a salon
	// owner with `?feature_disabled=menu` — a feature their vertical cannot even
	// enable, so the dashboard banner would offer them no way out.
	'/services': 'services',
	'/inventory': 'inventory',
	'/expenses': 'expenses',
	'/kitchen-display': 'kds',
	'/team': 'team',
	// The backend gates every agent endpoint on this slug, so without the entry
	// the page renders, calls `/status`, and shows a 403 the operator has to
	// interpret — rather than the dashboard banner every other disabled feature
	// produces.
	'/assistant': 'ai-assistant'
};

export const load: LayoutServerLoad = async ({ params, url, fetch, depends }) => {
	depends('app:business-data');
	const { business, slug } = params;

	// Validate business type
	if (!VALID_BUSINESS_TYPES.includes(business as any)) {
		redirect(307, '/');
	}

	// Get business configuration for UI
	const businessConfig = BUSINESS_TYPE_CONFIG[business as keyof typeof BUSINESS_TYPE_CONFIG];

	try {
		// Single API call: business + role + subscription
		const {
			business: businessData,
			userRole,
			subscription
		} = await getBusinessContext(slug, { fetch });

		// Route protection: redirect if accessing a disabled feature
		const enabledFeatures = businessData.enabledFeatures ?? [];
		if (enabledFeatures.length > 0) {
			const pathAfterSlug = url.pathname.split(`/${slug}`)[1] || '';
			const routeFeatures: Record<string, string> = {
				...ROUTE_FEATURE_MAP,
				// The catalog under `/menu` is gated on whichever slug this
				// vertical actually enables: `services` for salon/spa/clinic,
				// `menu` for everyone else.
				'/menu': catalogFeatureSlug(business)
			};
			for (const [routeSegment, featureSlug] of Object.entries(routeFeatures)) {
				if (pathAfterSlug.startsWith(routeSegment) && !enabledFeatures.includes(featureSlug)) {
					redirect(307, `/${business}/${slug}/dashboard?feature_disabled=${featureSlug}`);
				}
			}
		}

		return {
			business: {
				...businessData,
				config: businessConfig
			},
			businessId: businessData.id,
			businessType: business,
			config: businessConfig,
			userRole,
			subscription,
			enabledFeatures
		};
	} catch (err) {
		// `redirect()` signals by throwing, so the feature guard above unwinds into
		// this catch. Without the re-throw every `feature_disabled` redirect was
		// rewritten to the generic business-unavailable one — the user still landed
		// on the dashboard, so it looked fine, but the slug was lost (the banner
		// could never say which feature was off) and a bogus fetch failure was
		// logged on every hit.
		if (isRedirect(err)) throw err;

		console.error('Failed to fetch business context:', err);
		redirect(307, '/dashboard?error=business-unavailable');
	}
};
