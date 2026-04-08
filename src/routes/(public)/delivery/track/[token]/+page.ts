import type { PageLoad } from './$types';
import { trackDelivery } from '$lib/api';

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const data = await trackDelivery(params.token, { fetch });

		return {
			delivery: data.delivery,
			token: params.token,
			error: null
		};
	} catch (err) {
		console.error('Failed to track delivery:', err);
		return {
			delivery: null,
			token: params.token,
			error: err instanceof Error ? err.message : 'Delivery not found'
		};
	}
};
