import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type ProviderStatus =
	'GATEWAY_UNCONFIGURED' | 'NO_KEY' | 'DISABLED' | 'UNTESTED' | 'HEALTHY' | 'ERROR';

export interface AiProvider {
	slug: string;
	label: string;
	modalities: string[];
	enabled: boolean;
	status: ProviderStatus;
	/** Env var the key is read from — providers are configured by env, not by this UI. */
	envVar: string;
	hasKey: boolean;
	keyUrl: string;
	notes?: string;
	lastError: string | null;
	lastCheckAt: string | null;
	modelCount: number;
	fallbackOrder: number;
}

export interface AiModel {
	id: string;
	providerSlug: string;
	modelId: string;
	label: string;
	modality: string;
	isFree: boolean;
	contextWindow: number | null;
	supportsTools: boolean;
	enabled: boolean;
	isDefault: boolean;
}

export interface GatewayInfo {
	configured: boolean;
	/** Whether an Authenticated Gateway token is set. Cloudflare enables auth by
	 * default on the auto-created `default` gateway. */
	authenticated: boolean;
	accountEnv: string;
	gatewayEnv: string;
	tokenEnv: string;
}

export interface ProvidersResponse {
	providers: AiProvider[];
	gateway: GatewayInfo;
}

export interface TestResult {
	ok: boolean;
	status: ProviderStatus;
	error?: string;
}

// ==================== API FUNCTIONS ====================

export async function getAiProviders(options?: {
	fetch?: typeof fetch;
}): Promise<ProvidersResponse> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get<ProvidersResponse>('/admin/ai/providers');
}

export async function setProviderEnabled(
	slug: string,
	enabled: boolean
): Promise<{ provider: AiProvider }> {
	const api = getApiClient();
	return api.patch<{ provider: AiProvider }>(`/admin/ai/providers/${slug}`, { enabled });
}

export async function testProvider(slug: string): Promise<TestResult> {
	const api = getApiClient();
	return api.post<TestResult>(`/admin/ai/providers/${slug}/test`, {});
}

export async function getAiModels(options?: {
	fetch?: typeof fetch;
}): Promise<{ models: AiModel[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get<{ models: AiModel[] }>('/admin/ai/models');
}

export async function setModelEnabled(id: string, enabled: boolean): Promise<{ model: AiModel }> {
	const api = getApiClient();
	return api.patch<{ model: AiModel }>(`/admin/ai/models/${id}`, { enabled });
}

export async function syncAiModels(): Promise<{
	openrouter: { synced: number; skipped: number };
	total: number;
}> {
	const api = getApiClient();
	return api.post<{ openrouter: { synced: number; skipped: number }; total: number }>(
		'/admin/ai/models/sync',
		{}
	);
}
