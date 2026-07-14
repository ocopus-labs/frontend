import type { PageLoad } from './$types';
import { adminListReviews } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const { reviews, total } = await adminListReviews(businessId, { take: 100 }, { fetch });
		return { ...parentData, reviews, total };
	} catch (err) {
		console.error('Failed to load reviews:', err);
		return {
			...parentData,
			reviews: [],
			total: 0,
			error: err instanceof Error ? err.message : 'Failed to load reviews'
		};
	}
};
