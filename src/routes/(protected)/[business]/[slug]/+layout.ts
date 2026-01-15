import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';

export const load: LayoutLoad = async ({ params }) => {
	const { business, slug } = params;

	// Validate business type
	if (!VALID_BUSINESS_TYPES.includes(business as any)) {
		redirect(307, '/');
	}

	// Get business configuration
	const businessConfig = BUSINESS_TYPE_CONFIG[business as keyof typeof BUSINESS_TYPE_CONFIG];

	// Get business data (in a real app, this would come from a database)
	const businessData = {
		id: slug,
		name: `${businessConfig.label} - ${slug}`,
		type: business,
		slug: slug,
		config: businessConfig
	};

	return {
		business: businessData,
		businessType: business,
		config: businessConfig
	};
};
