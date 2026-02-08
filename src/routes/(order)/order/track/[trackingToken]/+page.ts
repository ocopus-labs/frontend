import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getOrderTracking } from '$lib/api';

export const load: PageLoad = async ({ params, fetch }) => {
	const { trackingToken } = params;

	try {
		const result = await getOrderTracking(trackingToken, { fetch });
		return {
			order: result.order,
			trackingToken
		};
	} catch (err: any) {
		if (err?.statusCode === 404) {
			error(404, 'Order not found');
		}
		error(500, 'Failed to load order');
	}
};
