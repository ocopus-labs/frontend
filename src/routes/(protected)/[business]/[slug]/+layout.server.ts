import { getBusinessBySlug } from '$lib/api';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals, fetch }) => {
	const { business, slug } = params;

	// Validate business type
	if (!VALID_BUSINESS_TYPES.includes(business as any)) {
		redirect(307, '/');
	}

	// Get business configuration for UI
	const businessConfig = BUSINESS_TYPE_CONFIG[business as keyof typeof BUSINESS_TYPE_CONFIG];

	try {
		// Fetch real business data from API
		const { business: businessData, userRole } = await getBusinessBySlug(slug, { fetch });

		return {
			business: {
				...businessData,
				config: businessConfig
			},
			businessId: businessData.id,
			businessType: business,
			config: businessConfig,
			userRole
		};
	} catch (err) {
		// Fallback to mock data if API fails (for development)
		console.warn('Failed to fetch business, using mock data:', err);

		const businessData = {
			id: slug,
			name: `${businessConfig.label} - ${slug}`,
			type: business,
			slug: slug,
			config: businessConfig
		};

		return {
			business: businessData,
			businessId: slug, // Use slug as fallback ID
			businessType: business,
			config: businessConfig,
			userRole: 'owner'
		};
	}
};
