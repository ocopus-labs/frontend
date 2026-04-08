import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { trackWaitlistPosition } from '$lib/api';

export const load: PageLoad = async ({ params, fetch }) => {
	const { token } = params;

	try {
		const result = await trackWaitlistPosition(token, { fetch });
		return {
			entry: result.entry,
			token
		};
	} catch (err: any) {
		if (err?.statusCode === 404) {
			error(404, 'Waitlist entry not found');
		}
		error(500, 'Failed to load waitlist status');
	}
};
