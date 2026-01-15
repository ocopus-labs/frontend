import type { LayoutLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { VALID_BUSINESS_TYPES, BUSINESS_TYPE_CONFIG } from '$lib/types/business';
import { getBusinessBySlug } from '$lib/api';

export const load: LayoutLoad = async ({ data }) => {
	console.log('Parent data in layout load:', data);
	return {
		...data
	};
};
