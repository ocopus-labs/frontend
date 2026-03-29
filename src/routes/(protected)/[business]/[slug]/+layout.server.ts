import { getBusinessBySlug } from '$lib/api';
import { getBusinessSubscription } from '$lib/api/subscription';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals, fetch, depends }) => {
	depends('app:business-data');
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

		// Fetch the business owner's subscription (determines feature access for all team members)
		const subscriptionResponse = await getBusinessSubscription(businessData.id, { fetch })
			.catch(() => ({ subscription: null }));

		return {
			business: {
				...businessData,
				config: businessConfig
			},
			businessId: businessData.id,
			businessType: business,
			config: businessConfig,
			userRole,
			subscription: subscriptionResponse.subscription
		};
	} catch (err) {
		console.error('Failed to fetch business data:', err);
		redirect(307, '/dashboard?error=business-unavailable');
	}
};
