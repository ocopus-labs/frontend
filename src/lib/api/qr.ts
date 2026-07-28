import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface UpiSettings {
	enabled: boolean;
	vpa: string;
	merchantName: string;
}

export interface QrCodeResult {
	dataUrl: string;
	upiString: string;
}

export interface TableQrCode {
	url: string;
	dataUrl: string;
	generatedAt: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== QR API ====================

export async function getUpiSettings(
	businessId: string,
	options?: FetchOption
): Promise<{ settings: UpiSettings }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/qr/settings`);
}

export async function updateUpiSettings(
	businessId: string,
	data: Partial<UpiSettings>,
	options?: FetchOption
): Promise<{ settings: UpiSettings }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.put(`/business/${businessId}/qr/settings`, data);
}

export async function generatePaymentQr(
	businessId: string,
	amount: number,
	transactionNote?: string,
	options?: FetchOption
): Promise<QrCodeResult> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/qr/payment`, { amount, transactionNote });
}

export async function generateTableQr(
	businessId: string,
	tableId: string,
	options?: FetchOption
): Promise<{ dataUrl: string; url: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/qr/table/${tableId}`);
}

export async function generateAllTableQrs(
	businessId: string,
	options?: FetchOption
): Promise<{ count: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/qr/tables/all`);
}

export async function getTableQr(
	businessId: string,
	tableId: string,
	options?: FetchOption
): Promise<{ qrCode: TableQrCode | null }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/qr/table/${tableId}`);
}
