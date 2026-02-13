import type { PageLoad } from './$types';
import { getModifierGroups } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const { businessId } = parentData;

	try {
		const { modifierGroups } = await getModifierGroups(businessId, { fetch });
		return {
			...parentData,
			modifierGroups
		};
	} catch {
		return {
			...parentData,
			modifierGroups: []
		};
	}
};
