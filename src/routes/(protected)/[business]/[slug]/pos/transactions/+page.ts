import type { PageLoad } from './$types';
import { getPayments, getPaymentSummary } from '$lib/api/payment';

export const load: PageLoad = async ({ params, parent, fetch }) => {
  const { business } = await parent();

  try {
    const [paymentsResult, summaryResult] = await Promise.all([
      getPayments(business.id, { limit: 100 }, { fetch }),
      getPaymentSummary(business.id, undefined, { fetch })
    ]);

    return {
      payments: paymentsResult.payments,
      total: paymentsResult.total,
      summary: summaryResult.summary
    };
  } catch (e) {
    console.error('Failed to load payments:', e);
    return {
      payments: [],
      total: 0,
      summary: null
    };
  }
};
