import { getBusinessContext } from '$lib/api';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Map route segments to required feature slugs.
 * If the URL contains one of these segments and the feature is not enabled,
 * the user is redirected to the dashboard.
 */
const ROUTE_FEATURE_MAP: Record<string, string> = {
	'/tables': 'tables',
	'/menu': 'menu',
	'/inventory': 'inventory',
	'/expenses': 'expenses',
	'/kitchen-display': 'kds',
	'/team': 'team',
	'/reservations': 'reservations',
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
		const { business: businessData, userRole, subscription } = await getBusinessContext(slug, { fetch });

		// Route protection: redirect if accessing a disabled feature
		const enabledFeatures = businessData.enabledFeatures ?? [];
		if (enabledFeatures.length > 0) {
			const pathAfterSlug = url.pathname.split(`/${slug}`)[1] || '';
			for (const [routeSegment, featureSlug] of Object.entries(ROUTE_FEATURE_MAP)) {
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
			enabledFeatures,
		};
	} catch (err) {
		console.error('Failed to fetch business context:', err);
		redirect(307, '/dashboard?error=business-unavailable');
	}
};
