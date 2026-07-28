import type { PageLoad } from './$types';
import { getApiKeys, getGrantablePermissions } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, depends }) => {
	depends('app:settings');
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Grantable permissions are fetched alongside the keys so the create form
	// can only offer what this role may actually grant. Loaded independently:
	// a failure here shouldn't hide the existing keys.
	const grantablePromise = getGrantablePermissions(businessId, { fetch }).catch((err: unknown) => {
		console.error('Failed to load grantable permissions:', err);
		return null;
	});

	try {
		const [keys, grantable] = await Promise.all([
			getApiKeys(businessId, { fetch }),
			grantablePromise
		]);
		return {
			...parentData,
			apiKeys: keys,
			grantable
		};
	} catch (err) {
		console.error('Failed to load API keys:', err);
		return {
			...parentData,
			apiKeys: [],
			grantable: await grantablePromise,
			error: err instanceof Error ? err.message : 'Failed to load API keys'
		};
	}
};
