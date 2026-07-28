import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface SegmentRules {
	minOrders?: number;
	minSpend?: number;
	lastVisitDays?: number;
	tags?: string[];
	status?: string;
}

export interface Segment {
	id: string;
	restaurantId: string;
	name: string;
	rules: SegmentRules;
	autoRefresh: boolean;
	customerCount: number;
	createdAt: string;
	updatedAt: string;
	_count?: { campaigns: number };
}

export interface SegmentWithCampaigns extends Segment {
	campaigns: Array<{
		id: string;
		name: string;
		status: string;
		createdAt: string;
	}>;
}

export interface SegmentPreviewCustomer {
	id: string;
	name: string;
	phone: string;
	email?: string;
	tags: string[];
	status: string;
}

export interface CreateSegmentPayload {
	name: string;
	rules: SegmentRules;
	autoRefresh?: boolean;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== SEGMENTS API ====================

export async function getSegments(
	businessId: string,
	options?: FetchOption
): Promise<{ segments: Segment[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/customers/segments`);
}

export async function getSegmentById(
	businessId: string,
	segmentId: string,
	options?: FetchOption
): Promise<{ segment: SegmentWithCampaigns }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/customers/segments/${segmentId}`);
}

export async function createSegment(
	businessId: string,
	data: CreateSegmentPayload,
	options?: FetchOption
): Promise<{ message: string; segment: Segment }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/customers/segments`, data);
}

export async function previewSegment(
	businessId: string,
	rules: SegmentRules,
	options?: FetchOption
): Promise<{ count: number; customers: SegmentPreviewCustomer[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/customers/segments/preview`, { rules });
}

export async function refreshSegment(
	businessId: string,
	segmentId: string,
	options?: FetchOption
): Promise<{ message: string; segment: Segment }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/customers/segments/${segmentId}/refresh`);
}

export async function deleteSegment(
	businessId: string,
	segmentId: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/customers/segments/${segmentId}`);
}
