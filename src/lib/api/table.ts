import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'out_of_service';
export type TableShape = 'square' | 'round' | 'rectangle' | 'oval';

export interface TablePosition {
	x: number;
	y: number;
	floor?: string;
	section?: string;
}

export interface TableDimensions {
	width: number;
	height: number;
}

export interface TableSettings {
	minPartySize?: number;
	maxPartySize?: number;
	isReservable?: boolean;
	defaultTurnoverTime?: number;
	notes?: string;
}

export interface TableSession {
	orderId: string;
	orderNumber: string;
	startedAt: string;
	customerCount?: number;

	/**
	 * Live running total for the session's order, resolved server-side on read
	 * (see `attachLiveSessionTotals` in the backend table service). `null` means
	 * the order could not be resolved — render that as unknown, never as 0.
	 * Absent on endpoints that don't resolve totals.
	 */
	currentTotal?: number | null;
	/** Line-item count on the live order. Same read-time resolution. */
	itemCount?: number;
}

export interface MaintenanceLog {
	action: string;
	notes?: string;
	performedAt: string;
	performedBy: string;
}

export interface Table {
	id: string;
	restaurantId: string;
	tableNumber: string;
	displayName: string;
	capacity: number;
	status: TableStatus;
	position: TablePosition;
	shape?: TableShape;
	dimensions?: TableDimensions;
	settings?: TableSettings;
	currentSession?: TableSession;
	qrCode?: { url: string; dataUrl: string; generatedAt: string } | null;
	maintenanceLog?: MaintenanceLog[];
	createdAt: string;
	updatedAt: string;
}

export interface TableStats {
	total: number;
	available: number;
	occupied: number;
	reserved: number;
	maintenance: number;
	out_of_service: number;
}

export interface CreateTablePayload {
	tableNumber: string;
	displayName: string;
	capacity: number;
	position: TablePosition;
	shape?: TableShape;
	dimensions?: TableDimensions;
	settings?: TableSettings;
}

export interface UpdateTablePayload extends Partial<CreateTablePayload> {}

export interface UpdateTableStatusPayload {
	status: TableStatus;
	notes?: string;
}

export interface StartTableSessionPayload {
	orderId: string;
	orderNumber: string;
	customerCount?: number;
}

export interface EndTableSessionPayload {
	notes?: string;
}

export interface AddMaintenanceLogPayload {
	action: string;
	notes?: string;
}

// ==================== RESERVATION TYPES ====================

export type ReservationStatus =
	'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export interface Reservation {
	id: string;
	restaurantId: string;
	tableId?: string;
	table?: Table;
	customerName: string;
	customerPhone?: string;
	customerEmail?: string;
	partySize: number;
	reservationDate: string;
	reservationTime: string;
	duration?: number;
	status: ReservationStatus;
	notes?: string;
	specialRequests?: string;
	source?: string;
	createdBy?: string;
	confirmedAt?: string;
	seatedAt?: string;
	completedAt?: string;
	cancelledAt?: string;
	cancellationReason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReservationStats {
	total: number;
	today: number;
	upcoming: number;
	pending: number;
	confirmed: number;
	cancelled: number;
}

export interface CreateReservationPayload {
	tableId?: string;
	customerName: string;
	customerPhone?: string;
	customerEmail?: string;
	partySize: number;
	reservationDate: string;
	reservationTime: string;
	duration?: number;
	notes?: string;
	specialRequests?: string;
}

export interface UpdateReservationPayload extends Partial<CreateReservationPayload> {
	status?: ReservationStatus;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== TABLE CRUD ====================

export async function getTables(
	businessId: string,
	status?: TableStatus,
	options?: FetchOption
): Promise<{ tables: Table[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const url = status
		? `/business/${businessId}/tables?status=${status}`
		: `/business/${businessId}/tables`;
	return api.get(url);
}

export async function getTableStats(
	businessId: string,
	options?: FetchOption
): Promise<{ stats: TableStats }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/tables/stats`);
}

export async function getTableById(
	businessId: string,
	tableId: string,
	options?: FetchOption
): Promise<{ table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/tables/${tableId}`);
}

export async function getTableByNumber(
	businessId: string,
	tableNumber: string,
	options?: FetchOption
): Promise<{ table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/tables/number/${tableNumber}`);
}

export async function createTable(
	businessId: string,
	data: CreateTablePayload,
	options?: FetchOption
): Promise<{ message: string; table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tables`, data);
}

export async function bulkCreateTables(
	businessId: string,
	count: number,
	defaultCapacity?: number,
	options?: FetchOption
): Promise<{ message: string; tables: Table[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tables/bulk`, { count, defaultCapacity });
}

export async function updateTable(
	businessId: string,
	tableId: string,
	data: UpdateTablePayload,
	options?: FetchOption
): Promise<{ message: string; table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/tables/${tableId}`, data);
}

export async function updateTableStatus(
	businessId: string,
	tableId: string,
	data: UpdateTableStatusPayload,
	options?: FetchOption
): Promise<{ message: string; table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/tables/${tableId}/status`, data);
}

export async function deleteTable(
	businessId: string,
	tableId: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/tables/${tableId}`);
}

// ==================== TABLE SESSIONS ====================

export async function startTableSession(
	businessId: string,
	tableId: string,
	data: StartTableSessionPayload,
	options?: FetchOption
): Promise<{ message: string; table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tables/${tableId}/session/start`, data);
}

export async function endTableSession(
	businessId: string,
	tableId: string,
	data?: EndTableSessionPayload,
	options?: FetchOption
): Promise<{ message: string; table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tables/${tableId}/session/end`, data || {});
}

// ==================== MAINTENANCE ====================

export async function addMaintenanceLog(
	businessId: string,
	tableId: string,
	data: AddMaintenanceLogPayload,
	options?: FetchOption
): Promise<{ message: string; table: Table }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/tables/${tableId}/maintenance`, data);
}

// ==================== RESERVATIONS ====================

export async function getReservations(
	businessId: string,
	params?: {
		date?: string;
		startDate?: string;
		endDate?: string;
		status?: ReservationStatus;
		limit?: number;
		offset?: number;
	},
	options?: FetchOption
): Promise<{ reservations: Reservation[]; total?: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.date) searchParams.set('date', params.date);
	if (params?.startDate) searchParams.set('startDate', params.startDate);
	if (params?.endDate) searchParams.set('endDate', params.endDate);
	if (params?.status) searchParams.set('status', params.status);
	if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
	if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/reservations?${query}`
		: `/business/${businessId}/reservations`;
	return api.get(url);
}

export async function getReservationStats(
	businessId: string,
	options?: FetchOption
): Promise<{ stats: ReservationStats }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/reservations/stats`);
}

export async function getReservationById(
	businessId: string,
	reservationId: string,
	options?: FetchOption
): Promise<{ reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/reservations/${reservationId}`);
}

export async function createReservation(
	businessId: string,
	data: CreateReservationPayload,
	options?: FetchOption
): Promise<{ message: string; reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/reservations`, data);
}

export async function updateReservation(
	businessId: string,
	reservationId: string,
	data: UpdateReservationPayload,
	options?: FetchOption
): Promise<{ message: string; reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/reservations/${reservationId}`, data);
}

export async function confirmReservation(
	businessId: string,
	reservationId: string,
	options?: FetchOption
): Promise<{ message: string; reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/reservations/${reservationId}/confirm`);
}

export async function cancelReservation(
	businessId: string,
	reservationId: string,
	reason?: string,
	options?: FetchOption
): Promise<{ message: string; reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/reservations/${reservationId}/cancel`, { reason });
}

export async function seatReservation(
	businessId: string,
	reservationId: string,
	tableId?: string,
	options?: FetchOption
): Promise<{ message: string; reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/reservations/${reservationId}/seat`, { tableId });
}

export async function completeReservation(
	businessId: string,
	reservationId: string,
	options?: FetchOption
): Promise<{ message: string; reservation: Reservation }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/reservations/${reservationId}/complete`);
}

export async function deleteReservation(
	businessId: string,
	reservationId: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/reservations/${reservationId}`);
}
