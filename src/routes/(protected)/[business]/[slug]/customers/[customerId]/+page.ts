import type { PageLoad } from './$types';
import {
	getCustomerWithOrders,
	getLoyaltyAccount,
	getLoyaltyTransactions,
	getLoyaltySettings,
	getLoyaltyTierProgress
} from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, params, depends }) => {
	depends('app:customer-detail');
	const parentData = await parent();
	const businessId = parentData.businessId;
	const customerId = params.customerId;

	try {
		const [customerResult, loyaltyResult, transactionsResult, settingsResult, tierProgressResult] =
			await Promise.allSettled([
				getCustomerWithOrders(businessId, customerId, { fetch }),
				getLoyaltyAccount(businessId, customerId, { fetch }),
				getLoyaltyTransactions(businessId, customerId, { limit: 5 }, { fetch }),
				getLoyaltySettings(businessId, { fetch }),
				getLoyaltyTierProgress(businessId, customerId, { fetch })
			]);

		const customer = customerResult.status === 'fulfilled' ? customerResult.value : null;
		const loyalty = loyaltyResult.status === 'fulfilled' ? loyaltyResult.value : null;
		const transactions =
			transactionsResult.status === 'fulfilled' ? transactionsResult.value : null;
		const loyaltySettings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
		const tierProgress =
			tierProgressResult.status === 'fulfilled' ? tierProgressResult.value : null;

		return {
			...parentData,
			customer: customer?.customer ?? null,
			orderStats: customer?.orderStats ?? { totalOrders: 0, totalSpent: 0, lastOrderDate: null },
			loyaltyAccount: loyalty?.account ?? null,
			loyaltyTransactions: transactions?.transactions ?? [],
			loyaltySettings: loyaltySettings?.settings ?? null,
			tierProgress
		};
	} catch (err) {
		console.error('Failed to load customer:', err);
		return {
			...parentData,
			customer: null,
			orderStats: { totalOrders: 0, totalSpent: 0, lastOrderDate: null },
			loyaltyAccount: null,
			loyaltyTransactions: [],
			loyaltySettings: null,
			tierProgress: null,
			error: err instanceof Error ? err.message : 'Failed to load customer'
		};
	}
};
