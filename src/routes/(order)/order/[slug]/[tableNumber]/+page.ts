import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getPublicBusinessInfo, getPublicMenu } from '$lib/api';

export const load: PageLoad = async ({ params, fetch }) => {
	const { slug, tableNumber } = params;

	try {
		const [businessResult, menuResult] = await Promise.all([
			getPublicBusinessInfo(slug, { fetch }),
			getPublicMenu(slug, { fetch })
		]);

		return {
			business: businessResult.business,
			categories: menuResult.categories,
			tableNumber
		};
	} catch (err: any) {
		if (err?.statusCode === 404) {
			error(404, 'Restaurant not found');
		}
		if (err?.statusCode === 400) {
			error(400, 'Self-ordering is not available for this restaurant');
		}
		error(500, 'Failed to load menu');
	}
};
