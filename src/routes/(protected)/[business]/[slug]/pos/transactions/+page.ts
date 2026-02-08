import type { PageLoad } from './$types';
import { getPayments, getPaymentSummary } from '$lib/api/payment';
import type { PaymentMethod } from '$lib/api/payment';

export const load: PageLoad = async ({ url, parent, fetch }) => {
  const { business } = await parent();

  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status') || undefined;
  const method = (url.searchParams.get('method') || undefined) as PaymentMethod | undefined;

  try {
    const [paymentsResult, summaryResult] = await Promise.all([
      getPayments(business.id, { limit, offset, status, method }, { fetch }),
      getPaymentSummary(business.id, undefined, { fetch })
    ]);

    const total = paymentsResult.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      payments: paymentsResult.payments,
      total,
      summary: summaryResult.summary,
      page,
      limit,
      totalPages,
      statusFilter: status || 'all',
      methodFilter: method || 'all'
    };
  } catch (e) {
    console.error('Failed to load payments:', e);
    return {
      payments: [],
      total: 0,
      summary: null,
      page: 1,
      limit,
      totalPages: 1,
      statusFilter: 'all',
      methodFilter: 'all'
    };
  }
};
