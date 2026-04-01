import { getBusinessContext } from '$lib/api';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, fetch, depends }) => {
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

		return {
			business: {
				...businessData,
				config: businessConfig
			},
			businessId: businessData.id,
			businessType: business,
			config: businessConfig,
			userRole,
			subscription
		};
	} catch (err) {
		console.error('Failed to fetch business context:', err);
		redirect(307, '/dashboard?error=business-unavailable');
	}
};
