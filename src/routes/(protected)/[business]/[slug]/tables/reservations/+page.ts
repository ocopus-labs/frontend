import type { PageLoad } from './$types';
import { getReservations, getReservationStats, getTables } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Get date filter from URL or default to upcoming
	const dateParam = url.searchParams.get('date');
	const statusParam = url.searchParams.get('status');

	try {
		const [reservationsData, statsData, tablesData] = await Promise.all([
			getReservations(businessId, {
				date: dateParam || undefined,
				status: statusParam as any || undefined
			}, { fetch }),
			getReservationStats(businessId, { fetch }),
			getTables(businessId, undefined, { fetch })
		]);

		return {
			...parentData,
			reservations: reservationsData.reservations,
			stats: statsData.stats,
			tables: tablesData.tables
		};
	} catch (err) {
		console.error('Failed to load reservations:', err);
		return {
			...parentData,
			reservations: [],
			stats: {
				total: 0,
				today: 0,
				upcoming: 0,
				pending: 0,
				confirmed: 0,
				cancelled: 0
			},
			tables: [],
			error: err instanceof Error ? err.message : 'Failed to load reservations'
		};
	}
};
