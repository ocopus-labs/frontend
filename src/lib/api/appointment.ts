import { clearApiCache, createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

/**
 * Mirrors `APPOINTMENT_STATUSES` in the backend DTO. Only `cancelled` and
 * `no_show` free the chair — that is enforced by a Postgres exclusion
 * constraint, not by this list.
 */
export type AppointmentStatus =
	'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type AppointmentSource = 'pos' | 'online' | 'phone' | 'walk_in';

/**
 * The services as they were when the booking was made. A snapshot, not a live
 * join: editing the catalog afterwards must not silently change what a customer
 * was quoted. Checkout re-reads prices from the catalog and never trusts this.
 */
export interface AppointmentServiceLine {
	menuItemId: string;
	name: string;
	price: number;
	durationMinutes: number;
	staffId?: string;
}

export interface Appointment {
	id: string;
	restaurantId: string;
	appointmentNumber: string;
	customerId: string | null;
	/**
	 * Joined on every read. Name only — `phone`/`email`/`address` on `Customer`
	 * are encrypted at rest and are not decrypted for a list endpoint.
	 */
	customer: { id: string; name: string } | null;
	staffId: string | null;
	orderId: string | null;
	/** The service window — what the customer is told. UTC ISO. */
	startAt: string;
	endAt: string;
	/** Service plus buffers — what the chair actually loses. UTC ISO. */
	blockStartAt: string;
	blockEndAt: string;
	status: AppointmentStatus;
	source: AppointmentSource;
	services: AppointmentServiceLine[];
	notes: string | null;
	createdBy: string;
	confirmedAt: string | null;
	checkedInAt: string | null;
	startedAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	cancellationReason: string | null;
	createdAt: string;
	updatedAt: string;
}

/** One bookable opening for one staff member. Half-open, like everything else. */
export interface AvailabilitySlot {
	staffId: string;
	startAt: string;
	endAt: string;
	blockStartAt: string;
	blockEndAt: string;
}

export interface AvailabilityResponse {
	date: string;
	/**
	 * The outlet's IANA zone, read from the promoted `timezone` column. Every
	 * time on the booking screen is rendered through this and never through the
	 * browser's zone.
	 */
	timeZone: string;
	slots: AvailabilitySlot[];
}

export interface ListAppointmentsParams {
	/** Inclusive `YYYY-MM-DD` calendar dates, resolved in the outlet's zone. */
	from: string;
	to: string;
	staffId?: string;
	status?: AppointmentStatus;
}

export interface AvailabilityParams {
	date: string;
	serviceId: string;
	staffId?: string;
	granularityMinutes?: number;
}

export interface CreateAppointmentPayload {
	date: string;
	/**
	 * Wall-clock `HH:mm` in the outlet's zone. Deliberately not an instant: the
	 * server composes the timestamp so the client never has to be right about
	 * the outlet's timezone or its DST rules.
	 */
	startTime: string;
	services: { menuItemId: string; staffId?: string }[];
	staffId?: string;
	customerId?: string;
	source?: AppointmentSource;
	notes?: string;
}

export interface RescheduleAppointmentPayload {
	date: string;
	startTime: string;
	staffId?: string;
}

/**
 * A service whose catalog price moved between booking and checkout.
 *
 * The customer was quoted `bookedPrice` and is being charged `chargedPrice`.
 * Surfaced rather than swallowed so the front desk hears it from the screen
 * and not from the customer.
 */
export interface AppointmentPriceChange {
	menuItemId: string;
	name: string;
	bookedPrice: number;
	chargedPrice: number;
}

export interface AppointmentCheckoutResponse {
	message: string;
	/** The order the till now works with: payment, tax, invoice, loyalty. */
	order: { id: string; orderNumber: string; [key: string]: unknown };
	appointment: Appointment;
	priceChanges: AppointmentPriceChange[];
}

type FetchOption = { fetch?: typeof fetch };

/**
 * The API client caches browser GETs for 30 seconds. That is fine for a menu and
 * wrong for a diary: two receptionists booking a minute apart would each be
 * offered a slot the other had already taken, and after any write the day would
 * keep rendering the state from before it.
 *
 * The exclusion constraint still refuses the double booking, so this is a
 * confusing-409 problem rather than a data-integrity one — but it is avoidable.
 * Invalidation lives here rather than at the call sites so no future caller has
 * to remember it.
 */
function appointmentCacheKey(businessId: string) {
	return `/business/${businessId}/appointments`;
}

// ==================== READS ====================

export async function listAppointments(
	businessId: string,
	params: ListAppointmentsParams,
	options?: FetchOption
): Promise<Appointment[]> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	searchParams.set('from', params.from);
	searchParams.set('to', params.to);
	if (params.staffId) searchParams.set('staffId', params.staffId);
	if (params.status) searchParams.set('status', params.status);
	return api.get(`/business/${businessId}/appointments?${searchParams.toString()}`);
}

export async function getAppointment(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<Appointment> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/appointments/${id}`);
}

export async function getAvailability(
	businessId: string,
	params: AvailabilityParams,
	options?: FetchOption
): Promise<AvailabilityResponse> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	searchParams.set('date', params.date);
	searchParams.set('serviceId', params.serviceId);
	if (params.staffId) searchParams.set('staffId', params.staffId);
	if (params.granularityMinutes !== undefined) {
		searchParams.set('granularityMinutes', String(params.granularityMinutes));
	}
	// Slots are the most perishable read in the product — always go to the wire.
	clearApiCache(`${appointmentCacheKey(businessId)}/availability`);
	return api.get(`/business/${businessId}/appointments/availability?${searchParams.toString()}`);
}

// ==================== WRITES ====================

export async function createAppointment(
	businessId: string,
	data: CreateAppointmentPayload,
	options?: FetchOption
): Promise<Appointment> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const created = await api.post<Appointment>(`/business/${businessId}/appointments`, data);
	clearApiCache(appointmentCacheKey(businessId));
	return created;
}

export async function rescheduleAppointment(
	businessId: string,
	id: string,
	data: RescheduleAppointmentPayload,
	options?: FetchOption
): Promise<Appointment> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const updated = await api.patch<Appointment>(
		`/business/${businessId}/appointments/${id}/reschedule`,
		data
	);
	clearApiCache(appointmentCacheKey(businessId));
	return updated;
}

export async function updateAppointmentStatus(
	businessId: string,
	id: string,
	data: { status: AppointmentStatus; reason?: string },
	options?: FetchOption
): Promise<Appointment> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const updated = await api.patch<Appointment>(
		`/business/${businessId}/appointments/${id}/status`,
		data
	);
	clearApiCache(appointmentCacheKey(businessId));
	return updated;
}

/**
 * Turn a completed appointment into an order.
 *
 * Sends no body: the services and their prices are read server-side from the
 * catalog, and a client that could send a price would be choosing what to
 * charge itself. The order cache is cleared as well as the diary's — the till
 * and the orders list are both now out of date.
 */
export async function checkoutAppointment(
	businessId: string,
	id: string,
	options?: FetchOption
): Promise<AppointmentCheckoutResponse> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const result = await api.post<AppointmentCheckoutResponse>(
		`/business/${businessId}/appointments/${id}/checkout`,
		{}
	);
	clearApiCache(appointmentCacheKey(businessId));
	clearApiCache(`/business/${businessId}/orders`);
	return result;
}
