import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getDisplayQueue } from '$lib/api';

export const load: PageLoad = async ({ params, fetch }) => {
	const { slug } = params;

	try {
		const data = await getDisplayQueue(slug, { fetch });
		return {
			slug,
			businessName: data.businessName,
			businessLogo: data.businessLogo,
			businessId: data.businessId,
			orders: data.orders
		};
	} catch (err: any) {
		if (err?.statusCode === 404) {
			error(404, 'Business not found');
		}
		error(500, 'Failed to load display queue');
	}
};
