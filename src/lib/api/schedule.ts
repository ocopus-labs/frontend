import { createApiClient, getApiClient } from './client';

/**
 * The staff roster.
 *
 * These types had drifted so far from the backend that the feature could not
 * work at all: the client sent `userId` where the DTO requires `businessUserId`
 * (so every shift POST 400'd), and `getRoster` was declared as
 * `{ roster: [{ userId, user, shifts }], startDate, endDate }` against a
 * handler that returns `{ roster: [{ businessUserId, businessUser, days }] }` —
 * a different envelope, key and nesting.
 *
 * The id is the substantive part. `Shift.businessUserId`,
 * `LeaveRequest.businessUserId` and `Appointment.staffId` are all
 * `BusinessUser.id` — the *membership*, not the user account. They are
 * different values, and a UI that passes `user.id` writes rows that nothing
 * else can ever join to. Appointment availability is built from `Shift` rows,
 * so this is what stands between a salon and a bookable day.
 */

// ==================== TYPES ====================

/**
 * Free text on the wire — the DTO validates `@MaxLength(20)` and nothing more,
 * and the column is nullable. Kept as a union for the pickers while allowing
 * whatever is already stored.
 */
export type ShiftTemplateColor =
	'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'yellow' | 'pink' | 'gray';

export interface StaffRef {
	/** `BusinessUser.id` — the membership. Not the user account id. */
	id: string;
	role?: string;
	user: {
		id?: string;
		name: string | null;
		email: string;
	};
}

export interface ShiftTemplate {
	id: string;
	restaurantId: string;
	name: string;
	startTime: string; // "HH:mm"
	endTime: string; // "HH:mm"
	/** Nullable in the database; the DTO does not default it. */
	color: ShiftTemplateColor | string | null;
	breakMinutes: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateShiftTemplatePayload {
	name: string;
	startTime: string;
	endTime: string;
	color?: ShiftTemplateColor | string;
	breakMinutes?: number;
}

export type ShiftStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface ScheduledShift {
	id: string;
	restaurantId: string;
	businessUserId: string;
	templateId: string | null;
	/** `@db.Date`, serialised as an ISO instant at UTC midnight. */
	date: string;
	startTime: string;
	endTime: string;
	breakMinutes: number;
	status: ShiftStatus;
	notes: string | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	businessUser?: StaffRef;
	template?: ShiftTemplate | null;
}

export interface CreateShiftPayload {
	/** `BusinessUser.id`. Sending a user account id creates an orphan row. */
	businessUserId: string;
	templateId?: string;
	/** `YYYY-MM-DD`. */
	date: string;
	startTime: string;
	endTime: string;
	breakMinutes?: number;
	notes?: string;
}

export interface BulkCreateShiftsPayload {
	shifts: CreateShiftPayload[];
}

/** One shift as the roster nests it — trimmed, and without the parent ids. */
export interface RosterShift {
	id: string;
	startTime: string;
	endTime: string;
	breakMinutes: number;
	status: ShiftStatus;
	notes: string | null;
	template: { id: string; name: string; color: string | null } | null;
}

export interface RosterEntry {
	businessUserId: string;
	businessUser: StaffRef;
	/** Keyed by `YYYY-MM-DD`. Days with no shift are absent, not empty. */
	days: Record<string, RosterShift[]>;
}

export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
	id: string;
	restaurantId: string;
	businessUserId: string;
	type: LeaveType | string;
	startDate: string;
	endDate: string;
	reason: string | null;
	status: LeaveStatus;
	/** The columns are `approved_by` / `approved_at`, set on reject too. */
	approvedBy: string | null;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	businessUser?: StaffRef;
}

export interface CreateLeaveRequestPayload {
	type: LeaveType | string;
	startDate: string;
	endDate: string;
	reason?: string;
}

export interface ShiftConflict {
	id: string;
	date: string;
	startTime: string;
	endTime: string;
}

export interface OvertimeEntry {
	id: string;
	shift: { id: string; date: string; startTime: string; endTime: string };
	extraMinutes: number;
	rate: number | null;
	approved: boolean;
}

export interface StaffOvertime {
	businessUserId: string;
	businessUser: StaffRef;
	totalExtraMinutes: number;
	totalExtraHours: number;
	entries: OvertimeEntry[];
}

export interface OvertimeReport {
	startDate: string;
	endDate: string;
	totalOvertimeMinutes: number;
	staffOvertime: StaffOvertime[];
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
): Promise<{ roster: RosterEntry[] }> {
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
): Promise<{
	message: string;
	created: ScheduledShift[];
	errors: { index: number; error: string }[];
}> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/schedule/shifts/bulk`, data);
}

/** Pre-flight check; `createShift` refuses with a 409 regardless. */
export async function getShiftConflicts(
	businessId: string,
	params: {
		businessUserId: string;
		date: string;
		startTime: string;
		endTime: string;
		excludeShiftId?: string;
	},
	options?: FetchOption
): Promise<{ hasConflicts: boolean; conflicts: ShiftConflict[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	searchParams.set('businessUserId', params.businessUserId);
	searchParams.set('date', params.date);
	searchParams.set('startTime', params.startTime);
	searchParams.set('endTime', params.endTime);
	if (params.excludeShiftId) searchParams.set('excludeShiftId', params.excludeShiftId);
	return api.get(`/business/${businessId}/schedule/conflicts?${searchParams.toString()}`);
}

// ==================== LEAVE REQUESTS ====================

export async function getLeaveRequests(
	businessId: string,
	params?: { status?: LeaveStatus; startDate?: string; endDate?: string },
	options?: FetchOption
): Promise<{ leaveRequests: LeaveRequest[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.startDate) searchParams.set('startDate', params.startDate);
	if (params?.endDate) searchParams.set('endDate', params.endDate);
	const query = searchParams.toString();
	// Scoping is the server's call, not a parameter: STAFF gets their own rows,
	// MANAGER and above get the business's. Passing a `userId` here never did
	// anything — the handler does not read one.
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
): Promise<{ report: OvertimeReport }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	searchParams.set('startDate', params.startDate);
	searchParams.set('endDate', params.endDate);
	return api.get(`/business/${businessId}/schedule/overtime?${searchParams.toString()}`);
}
