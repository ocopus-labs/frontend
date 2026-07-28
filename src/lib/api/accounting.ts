import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type AccountingProvider = 'generic' | 'quickbooks' | 'tally' | 'xero' | 'zoho';

export type AccountingExportStatus = 'generating' | 'ready' | 'downloaded' | 'failed';

export interface AccountingExport {
	id: string;
	provider: AccountingProvider;
	format: string;
	startDate: string;
	endDate: string;
	status: AccountingExportStatus;
	recordCount: number | null;
	error: string | null;
	createdBy: string;
	createdAt: string;
}

export interface CreateAccountingExportPayload {
	provider: AccountingProvider;
	startDate: string;
	endDate: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== ACCOUNTING EXPORTS ====================

export async function createAccountingExport(
	businessId: string,
	data: CreateAccountingExportPayload,
	options?: FetchOption
): Promise<{ message: string; export: AccountingExport }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/accounting/export`, data);
}

export async function getAccountingExports(
	businessId: string,
	params?: {
		limit?: number;
		offset?: number;
	},
	options?: FetchOption
): Promise<{ exports: AccountingExport[]; total: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
	if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/accounting/exports?${query}`
		: `/business/${businessId}/accounting/exports`;
	return api.get(url);
}

export async function downloadAccountingExport(
	businessId: string,
	exportId: string
): Promise<Blob> {
	const url = `/api/v1/business/${businessId}/accounting/exports/${exportId}/download`;
	const res = await fetch(url, { credentials: 'include' });
	if (!res.ok) throw new Error('Download failed');
	return res.blob();
}
