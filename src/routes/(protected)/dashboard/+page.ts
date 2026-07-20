import type { PageLoad } from './$types';
import { getAccountDashboard, toDashboardPeriod } from '$lib/api/account-dashboard';

export const load: PageLoad = async ({ fetch, url, depends }) => {
	depends('app:account-dashboard');

	// `period` lives in the URL so the view is shareable and survives a reload.
	const period = toDashboardPeriod(url.searchParams.get('period'));

	try {
		const dashboard = await getAccountDashboard(period, { fetch });
		return { period, dashboard, dashboardError: null };
	} catch (error) {
		console.warn('Failed to fetch account dashboard:', error);
		return {
			period,
			dashboard: null,
			dashboardError: error instanceof Error ? error.message : 'Failed to load dashboard'
		};
	}
};
