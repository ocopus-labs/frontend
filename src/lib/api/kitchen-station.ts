import { createApiClient, getApiClient } from './client';

export interface KitchenStation {
	id: string;
	restaurantId: string;
	name: string;
	displayColor: string;
	categoryIds: string[];
	sortOrder: number;
	isActive: boolean;
}

type FetchOption = { fetch?: typeof fetch };

export async function getKitchenStations(
	businessId: string,
	options?: FetchOption
): Promise<{ stations: KitchenStation[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/kitchen-stations`);
}

export async function createKitchenStation(
	businessId: string,
	data: { name: string; displayColor?: string; categoryIds: string[]; sortOrder?: number },
	options?: FetchOption
): Promise<{ message: string; station: KitchenStation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/kitchen-stations`, data);
}

export async function updateKitchenStation(
	businessId: string,
	stationId: string,
	data: Partial<{
		name: string;
		displayColor: string;
		categoryIds: string[];
		sortOrder: number;
		isActive: boolean;
	}>,
	options?: FetchOption
): Promise<{ message: string; station: KitchenStation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/kitchen-stations/${stationId}`, data);
}

export async function deleteKitchenStation(
	businessId: string,
	stationId: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/kitchen-stations/${stationId}`);
}

export async function getUnassignedCategories(
	businessId: string,
	options?: FetchOption
): Promise<{ categories: { id: string; name: string }[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/kitchen-stations/unassigned-categories`);
}
