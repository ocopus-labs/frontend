import type { PageLoad } from './$types';
import { getGstSummary, getTaxSettings } from '$lib/api';

function getCurrentMonthRange(): { startDate: string; endDate: string } {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return {
		startDate: start.toISOString().split('T')[0],
		endDate: end.toISOString().split('T')[0]
	};
}

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const defaultRange = getCurrentMonthRange();
	const startDate = url.searchParams.get('startDate') || defaultRange.startDate;
	const endDate = url.searchParams.get('endDate') || defaultRange.endDate;

	try {
		const [summaryResult, settingsResult] = await Promise.all([
			getGstSummary(businessId, { startDate, endDate }, { fetch }),
			getTaxSettings(businessId, { fetch })
		]);

		return {
			...parentData,
			summary: summaryResult.summary,
			taxSettings: settingsResult.settings,
			startDate,
			endDate
		};
	} catch (err) {
		console.error('Failed to load GST summary:', err);
		return {
			...parentData,
			summary: null,
			taxSettings: null,
			startDate,
			endDate,
			error: err instanceof Error ? err.message : 'Failed to load GST summary'
		};
	}
};
