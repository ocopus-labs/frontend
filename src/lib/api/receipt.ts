import { createApiClient, getApiClient } from './client';
type FetchOption = { fetch?: typeof fetch };

export interface ReceiptDelivery {
	id: string;
	channel: 'email' | 'whatsapp';
	recipient: string;
	status: 'pending' | 'sent' | 'delivered' | 'failed';
	sentAt?: string;
	createdAt: string;
}

export async function sendReceipt(
	businessId: string,
	orderId: string,
	data: { channel: 'email' | 'whatsapp'; recipient: string },
	options?: FetchOption
) {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/orders/${orderId}/send-receipt`, data);
}

export async function getReceiptDeliveries(
	businessId: string,
	orderId: string,
	options?: FetchOption
): Promise<ReceiptDelivery[]> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/orders/${orderId}/receipt-deliveries`);
}
