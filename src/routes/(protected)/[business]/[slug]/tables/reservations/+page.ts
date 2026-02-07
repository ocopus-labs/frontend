import type { PageLoad } from './$types';
import { getReservations, getReservationStats, getTables } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;
	const dateParam = url.searchParams.get('date');
	const statusParam = url.searchParams.get('status');

	try {
		const [reservationsData, statsData, tablesData] = await Promise.all([
			getReservations(businessId, {
				date: dateParam || undefined,
				status: statusParam as any || undefined,
				limit,
				offset
			}, { fetch }),
			getReservationStats(businessId, { fetch }),
			getTables(businessId, undefined, { fetch })
		]);

		const total = reservationsData.total ?? reservationsData.reservations.length;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			...parentData,
			reservations: reservationsData.reservations,
			stats: statsData.stats,
			tables: tablesData.tables,
			page,
			limit,
			total,
			totalPages
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
			page: 1,
			limit,
			total: 0,
			totalPages: 1,
			error: err instanceof Error ? err.message : 'Failed to load reservations'
		};
	}
};
