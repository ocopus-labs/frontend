import type { PageLoad } from './$types';
import { getGroups, getMenu } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:menu');
	const { businessId, business } = await parent();

	try {
		const [groupsData, menuData] = await Promise.all([
			getGroups(businessId, { fetch }),
			getMenu(businessId, { fetch }),
		]);

		return {
			businessId,
			business,
			groups: groupsData.groups,
			menuItems: menuData.items,
		};
	} catch (err) {
		console.warn('Failed to fetch groups:', err);
		return {
			businessId,
			business,
			groups: [],
			menuItems: [],
		};
	}
};
