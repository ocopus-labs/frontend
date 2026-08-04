import { clearApiCache, createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

/** Grouping labels only — nothing in the scheduler branches on these. */
export type ResourceType = 'chair' | 'room' | 'equipment' | 'other';
export type ResourceStatus = 'active' | 'inactive';

export interface Resource {
	id: string;
	restaurantId: string;
	name: string;
	type: ResourceType;
	status: ResourceStatus;
	/** The salon's own order. Availability fills resources in it, so the diary
	 * matches how the floor actually gets used. */
	sortOrder: number;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateResourcePayload {
	name: string;
	type?: ResourceType;
	sortOrder?: number;
	notes?: string;
}

export interface UpdateResourcePayload {
	name?: string;
	type?: ResourceType;
	/**
	 * `inactive` retires a resource without deleting it. Deleting is refused
	 * once anything has been booked into it — that would erase where the work
	 * happened and release those rows from the overlap constraint.
	 */
	status?: ResourceStatus;
	sortOrder?: number;
	notes?: string;
}

type FetchOption = { fetch?: typeof fetch };

function resourceCacheKey(businessId: string) {
	return `/business/${businessId}/resources`;
}

// ==================== READS ====================

export async function listResources(
	businessId: string,
	params?: { status?: ResourceStatus },
	options?: FetchOption
): Promise<Resource[]> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const search = params?.status ? `?status=${params.status}` : '';
	return api.get(`${resourceCacheKey(businessId)}${search}`);
}

// ==================== WRITES ====================

export async function createResource(
	businessId: string,
	data: CreateResourcePayload,
	options?: FetchOption
): Promise<Resource> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const created = await api.post<Resource>(resourceCacheKey(businessId), data);
	clearApiCache(resourceCacheKey(businessId));
	return created;
}

export async function updateResource(
	businessId: string,
	id: string,
	data: UpdateResourcePayload,
	options?: FetchOption
): Promise<Resource> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const updated = await api.patch<Resource>(`${resourceCacheKey(businessId)}/${id}`, data);
	clearApiCache(resourceCacheKey(businessId));
	// A retired resource changes what is bookable, so the diary's slot cache is
	// stale the moment this returns.
	clearApiCache(`/business/${businessId}/appointments`);
	return updated;
}

export async function deleteResource(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const result = await api.delete<{ message: string }>(`${resourceCacheKey(businessId)}/${id}`);
	clearApiCache(resourceCacheKey(businessId));
	clearApiCache(`/business/${businessId}/appointments`);
	return result;
}
