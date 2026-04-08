import type { PageLoad } from './$types';
import { getReportDimensions, getReportMetrics, getSavedReports } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [dimensionsData, metricsData, savedData] = await Promise.all([
			getReportDimensions(businessId, { fetch }),
			getReportMetrics(businessId, { fetch }),
			getSavedReports(businessId, { fetch })
		]);

		return {
			...parentData,
			dimensions: dimensionsData.dimensions,
			metrics: metricsData.metrics,
			savedReports: savedData.reports
		};
	} catch (err) {
		console.error('Failed to load report builder data:', err);
		return {
			...parentData,
			dimensions: [],
			metrics: [],
			savedReports: [],
			error: err instanceof Error ? err.message : 'Failed to load report builder'
		};
	}
};
