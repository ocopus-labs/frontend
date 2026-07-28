import type { PageLoad } from './$types';
import { getPaymentCredentials } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:payment-credentials');
	const parentData = await parent();
	try {
		const { credentials } = await getPaymentCredentials(parentData.businessId, { fetch });
		return { ...parentData, credentials };
	} catch (err) {
		return {
			...parentData,
			credentials: [],
			credentialsError: (err as Error).message
		};
	}
};
