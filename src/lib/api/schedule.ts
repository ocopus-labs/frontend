import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type ShiftTemplateColor =
	'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'yellow' | 'pink' | 'gray';

export interface ShiftTemplate {
	id: string;
	restaurantId: string;
	name: string;
	startTime: string; // "HH:mm"
	endTime: string; // "HH:mm"
	color: ShiftTemplateColor;
	breakMinutes: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateShiftTemplatePayload {
	name: string;
	startTime: string;
	endTime: string;
	color?: ShiftTemplateColor;
	breakMinutes?: number;
}

export interface ScheduledShift {
	id: string;
	restaurantId: string;
	userId: string;
	templateId?: string;
	date: string; // "YYYY-MM-DD"
	startTime: string;
	endTime: string;
	notes?: string;
	status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
	createdAt: string;
	updatedAt: string;
	user?: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
	template?: ShiftTemplate;
}

export interface CreateShiftPayload {
	userId: string;
	templateId?: string;
	date: string;
	startTime: string;
	endTime: string;
	notes?: string;
}

export interface BulkCreateShiftsPayload {
	shifts: CreateShiftPayload[];
}

export interface RosterEntry {
	userId: string;
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
	shifts: ScheduledShift[];
}

export interface RosterResponse {
	roster: RosterEntry[];
	startDate: string;
	endDate: string;
}

export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
	id: string;
	restaurantId: string;
	userId: string;
	type: LeaveType;
	startDate: string;
	endDate: string;
	reason?: string;
	status: LeaveStatus;
	reviewedBy?: string;
	reviewedAt?: string;
	createdAt: string;
	updatedAt: string;
	user?: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
	reviewer?: {
		id: string;
		name: string | null;
	};
}

export interface CreateLeaveRequestPayload {
	type: LeaveType;
	startDate: string;
	endDate: string;
	reason?: string;
}

export interface OvertimeEntry {
	userId: string;
	userName: string;
	scheduledHours: number;
	actualHours: number;
	overtimeHours: number;
}

export interface OvertimeReport {
	entries: OvertimeEntry[];
	period: { startDate: string; endDate: string };
	totalOvertimeHours: number;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== SHIFT TEMPLATES ====================

export async function getShiftTemplates(
	businessId: string,
	options?: FetchOption
): Promise<{ templates: ShiftTemplate[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/schedule/templates`);
}

export async function createShiftTemplate(
	businessId: string,
	data: CreateShiftTemplatePayload,
	options?: FetchOption
): Promise<{ message: string; template: ShiftTemplate }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/schedule/templates`, data);
}

// ==================== ROSTER ====================

export async function getRoster(
	businessId: string,
	params: { startDate: string; endDate: string },
	options?: FetchOption
): Promise<RosterResponse> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	searchParams.set('startDate', params.startDate);
	searchParams.set('endDate', params.endDate);
	return api.get(`/business/${businessId}/schedule/roster?${searchParams.toString()}`);
}

// ==================== SHIFTS ====================

export async function createShift(
	businessId: string,
	data: CreateShiftPayload,
	options?: FetchOption
): Promise<{ message: string; shift: ScheduledShift }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/schedule/shifts`, data);
}

export async function bulkCreateShifts(
	businessId: string,
	data: BulkCreateShiftsPayload,
	options?: FetchOption
): Promise<{ message: string; shifts: ScheduledShift[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/schedule/shifts/bulk`, data);
}

// ==================== LEAVE REQUESTS ====================

export async function getLeaveRequests(
	businessId: string,
	params?: { status?: LeaveStatus; userId?: string },
	options?: FetchOption
): Promise<{ leaveRequests: LeaveRequest[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.userId) searchParams.set('userId', params.userId);
	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/schedule/leave-requests?${query}`
		: `/business/${businessId}/schedule/leave-requests`;
	return api.get(url);
}

export async function createLeaveRequest(
	businessId: string,
	data: CreateLeaveRequestPayload,
	options?: FetchOption
): Promise<{ message: string; leaveRequest: LeaveRequest }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/schedule/leave-requests`, data);
}

export async function approveLeaveRequest(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<{ message: string; leaveRequest: LeaveRequest }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/schedule/leave-requests/${id}/approve`);
}

export async function rejectLeaveRequest(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<{ message: string; leaveRequest: LeaveRequest }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/schedule/leave-requests/${id}/reject`);
}

// ==================== OVERTIME ====================

export async function getOvertimeReport(
	businessId: string,
	params: { startDate: string; endDate: string },
	options?: FetchOption
): Promise<OvertimeReport> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	searchParams.set('startDate', params.startDate);
	searchParams.set('endDate', params.endDate);
	return api.get(`/business/${businessId}/schedule/overtime?${searchParams.toString()}`);
}
