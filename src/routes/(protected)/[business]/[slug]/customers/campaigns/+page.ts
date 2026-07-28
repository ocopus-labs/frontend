import type { PageLoad } from './$types';
import { getCampaigns, getSegments } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:campaigns');
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [campaignsData, segmentsData] = await Promise.allSettled([
			getCampaigns(businessId, { fetch }),
			getSegments(businessId, { fetch })
		]);

		const campaigns = campaignsData.status === 'fulfilled' ? campaignsData.value.campaigns : [];
		const segments = segmentsData.status === 'fulfilled' ? segmentsData.value.segments : [];

		return {
			...parentData,
			campaigns,
			segments
		};
	} catch (err) {
		console.error('Failed to load campaigns:', err);
		return {
			...parentData,
			campaigns: [],
			segments: [],
			error: err instanceof Error ? err.message : 'Failed to load campaigns'
		};
	}
};
