import { getUserBusinesses } from '$lib/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, depends }) => {
	depends('app:business-layout');
	try {
		const { businesses } = await getUserBusinesses({ fetch });
		return { businesses };
	} catch (err) {
		console.warn('Failed to fetch user businesses:', err);
		return { businesses: [] };
	}
};
