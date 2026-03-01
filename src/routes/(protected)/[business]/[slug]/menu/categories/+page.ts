import type { PageLoad } from './$types';
import { getCategories } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:menu');
	const { businessId, businessType, config, business } = await parent();

	try {
		const { categories } = await getCategories(businessId, { fetch });

		return {
			businessId,
			businessType,
			config,
			business,
			categories
		};
	} catch (err) {
		console.warn('Failed to fetch categories:', err);

		return {
			businessId,
			businessType,
			config,
			business,
			categories: []
		};
	}
};
