import type { PageLoad } from './$types';
import { getBusinessSummaries } from '$lib/api/account-dashboard';

export const load: PageLoad = async ({ fetch, depends }) => {
	depends('app:business-summaries');

	try {
		const summaries = await getBusinessSummaries({ fetch });
		return { summaries, summariesError: null };
	} catch (error) {
		// The grid still renders every business from the layout's data; it just
		// loses the operational overlay, so this degrades rather than fails.
		console.warn('Failed to fetch business summaries:', error);
		return {
			summaries: [],
			summariesError: error instanceof Error ? error.message : 'Failed to load summaries'
		};
	}
};
