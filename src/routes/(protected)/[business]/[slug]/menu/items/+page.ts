import type { PageLoad } from './$types';
import { getMenu, getCategories } from '$lib/api';

export const load: PageLoad = async ({ parent }) => {
	const { businessId, businessType, config } = await parent();

	try {
		// Fetch menu data from API
		const menuData = await getMenu(businessId);

		return {
			businessId,
			businessType,
			config,
			categories: menuData.categories,
			items: menuData.items,
			menuVersion: menuData.menuVersion,
			lastPublished: menuData.lastPublished,
			isLoaded: true
		};
	} catch (err) {
		console.warn('Failed to fetch menu, using empty data:', err);

		return {
			businessId,
			businessType,
			config,
			categories: [],
			items: [],
			menuVersion: 1.0,
			lastPublished: undefined,
			isLoaded: false
		};
	}
};
