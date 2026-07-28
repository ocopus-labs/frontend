import type { PageLoad } from './$types';
import { getUsage, type UsageResponse } from '$lib/api/agent';

/**
 * Assistant usage for the settings panel.
 *
 * Loaded server-side so the page renders with numbers rather than flashing an
 * empty chart. `scope` defaults to the caller's own usage; the business-wide
 * figure is fetched on demand from the page, because only owners may read it
 * and a 403 during a route load would fail the whole navigation.
 */
export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:agent-usage');
	const parentData = await parent();

	try {
		const usage: UsageResponse = await getUsage(parentData.businessId, {}, { fetch });
		return { ...parentData, usage, error: null };
	} catch (err) {
		// The assistant feature being off is a 403 here. The page says so rather
		// than the navigation failing — settings must stay reachable.
		return {
			...parentData,
			usage: null,
			error: err instanceof Error ? err.message : 'Could not load assistant usage.'
		};
	}
};
