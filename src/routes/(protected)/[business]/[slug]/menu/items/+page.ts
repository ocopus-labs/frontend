import type { PageLoad } from './$types';
import { getMenu, getItems } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const { businessId, businessType, config, business } = await parent();

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	try {
		const [menuData, itemsData] = await Promise.all([
			getMenu(businessId, { fetch }),
			getItems(businessId, { limit, offset }, { fetch })
		]);

		const total = itemsData.total;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			businessId,
			businessType,
			config,
			business,
			categories: menuData.categories,
			items: itemsData.items,
			menuVersion: menuData.menuVersion,
			lastPublished: menuData.lastPublished,
			isLoaded: true,
			page,
			limit,
			total,
			totalPages
		};
	} catch (err) {
		console.warn('Failed to fetch menu, using empty data:', err);

		return {
			businessId,
			businessType,
			config,
			business,
			categories: [],
			items: [],
			menuVersion: 1.0,
			lastPublished: undefined,
			isLoaded: false,
			page: 1,
			limit,
			total: 0,
			totalPages: 1
		};
	}
};
