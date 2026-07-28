import type { PageLoad } from './$types';
import { getCurrentSession, getDrawerHistory } from '$lib/api/cash-drawer';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const [currentResult, historyResult] = await Promise.all([
		getCurrentSession(businessId, { fetch }).catch(() => ({ session: null })),
		getDrawerHistory(businessId, { limit: 20 }, { fetch }).catch(() => ({ sessions: [], total: 0 }))
	]);

	return {
		...parentData,
		currentSession: currentResult.session,
		history: historyResult.sessions,
		historyTotal: historyResult.total
	};
};
