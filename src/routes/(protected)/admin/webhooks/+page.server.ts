import { getAdminWebhooks } from '$lib/api/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url, depends }) => {
	depends('app:webhooks');
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 50;
	const provider = url.searchParams.get('provider') || undefined;
	const status = url.searchParams.get('status') || undefined;
	const eventType = url.searchParams.get('eventType') || undefined;
	const startDate = url.searchParams.get('startDate') || undefined;
	const endDate = url.searchParams.get('endDate') || undefined;

	const result = await getAdminWebhooks(
		{ page, limit, provider, status, eventType, startDate, endDate },
		{ fetch }
	);

	return {
		...result,
		filters: { provider, status, eventType, startDate, endDate }
	};
};
