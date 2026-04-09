import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getOnlineMenu, getOnlineConfig } from '$lib/api';

export const load: PageLoad = async ({ params, fetch }) => {
	const { slug } = params;

	try {
		const [menuResult, configResult] = await Promise.all([
			getOnlineMenu(slug, { fetch }),
			getOnlineConfig(slug, { fetch })
		]);

		return {
			categories: menuResult.categories,
			config: configResult
		};
	} catch (err: any) {
		console.log('Error loading online menu:', err);
		if (err?.statusCode === 404) {
			error(404, 'Business not found');
		}
		if (err?.statusCode === 400) {
			error(400, 'Online ordering is not available for this business');
		}
		error(500, 'Failed to load menu');
	}
};
