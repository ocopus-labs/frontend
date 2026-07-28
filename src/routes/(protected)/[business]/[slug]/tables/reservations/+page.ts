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

	// Load tables independently so they're available even if reservation APIs fail
	const [reservationResult, tablesResult] = await Promise.allSettled([
		Promise.all([
			getReservations(
				businessId,
				{
					date: dateParam || undefined,
					status: (statusParam as any) || undefined,
					limit,
					offset
				},
				{ fetch }
			),
			getReservationStats(businessId, { fetch })
		]),
		getTables(businessId, undefined, { fetch })
	]);

	const tables = tablesResult.status === 'fulfilled' ? tablesResult.value.tables : [];

	if (reservationResult.status === 'fulfilled') {
		const [reservationsData, statsData] = reservationResult.value;
		const total = reservationsData.total ?? reservationsData.reservations.length;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			...parentData,
			reservations: reservationsData.reservations,
			stats: statsData.stats,
			tables,
			page,
			limit,
			total,
			totalPages
		};
	}

	console.error('Failed to load reservations:', reservationResult.reason);
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
		tables,
		page: 1,
		limit,
		total: 0,
		totalPages: 1,
		error:
			reservationResult.reason instanceof Error
				? reservationResult.reason.message
				: 'Failed to load reservations'
	};
};
