import { clearApiCache, createApiClient, getApiClient } from './client';
import type { MoneyByCurrency } from '$lib/utils/money';

// ==================== TYPES ====================

export type CommissionRateType = 'percentage' | 'flat';

/** Which rule produced a line — the catalog row, or the member's own rate. */
export type CommissionSource = 'service' | 'staff';

export interface CommissionStaffTotal {
	businessUserId: string;
	name: string;
	/**
	 * The member's rate as it stands now — deliberately served here and not on
	 * the general team-member response. Every role that can list the team would
	 * otherwise be able to read what colleagues are paid; behind this endpoint
	 * it is limited to the payroll roles.
	 *
	 * Null for someone who earned in this period but has since left.
	 */
	commissionType: CommissionRateType | null;
	commissionValue: number | null;
	/**
	 * Per-currency, never a number. An outlet bills in one currency but a
	 * franchise can span several, and adding INR to AED gives a figure that is
	 * wrong in both.
	 */
	total: MoneyByCurrency;
	/** What the rates were applied to, so an effective rate can be shown. */
	basis: MoneyByCurrency;
	lineCount: number;
}

export interface CommissionReport {
	from: string;
	to: string;
	staff: CommissionStaffTotal[];
	total: MoneyByCurrency;
}

/**
 * One earning. Every figure that produced it is on the row rather than joined —
 * the rule that set the rate may have changed since, and a payslip has to stay
 * readable when it does.
 */
export interface CommissionLine {
	id: string;
	orderId: string;
	orderNumber: string;
	appointmentId: string | null;
	itemName: string;
	basisAmount: number;
	rateType: CommissionRateType;
	rateValue: number;
	amount: number;
	currency: string;
	source: CommissionSource;
	earnedAt: string;
}

export interface CommissionStatement {
	businessUserId: string;
	from: string;
	to: string;
	lines: CommissionLine[];
	total: MoneyByCurrency;
}

export interface CommissionPeriod {
	/** Inclusive ISO instant. */
	from: string;
	/** Exclusive — half-open, so a row belongs to exactly one period. */
	to: string;
}

export interface SetCommissionRatePayload {
	/** `null` removes the rate entirely. */
	commissionType: CommissionRateType | null;
	commissionValue?: number | null;
}

export interface StaffCommissionRate {
	businessUserId: string;
	commissionType: CommissionRateType | null;
	commissionValue: number | null;
}

type FetchOption = { fetch?: typeof fetch };

function commissionCacheKey(businessId: string) {
	return `/business/${businessId}/commissions`;
}

// ==================== READS ====================

export async function getCommissionReport(
	businessId: string,
	period: CommissionPeriod,
	options?: FetchOption
): Promise<CommissionReport> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const params = new URLSearchParams({ from: period.from, to: period.to });
	return api.get(`/business/${businessId}/commissions?${params.toString()}`);
}

export async function getCommissionStatement(
	businessId: string,
	businessUserId: string,
	period: CommissionPeriod,
	options?: FetchOption
): Promise<CommissionStatement> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const params = new URLSearchParams({ from: period.from, to: period.to });
	return api.get(
		`/business/${businessId}/commissions/staff/${businessUserId}?${params.toString()}`
	);
}

// ==================== WRITES ====================

/**
 * Set or clear a member's default rate.
 *
 * Takes effect from the next order only — commission already earned keeps the
 * rate it was computed with. Clears the report cache because the *rates* shown
 * beside each member change, not because any earning did.
 */
export async function setStaffCommissionRate(
	businessId: string,
	businessUserId: string,
	data: SetCommissionRatePayload,
	options?: FetchOption
): Promise<StaffCommissionRate> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const updated = await api.put<StaffCommissionRate>(
		`/business/${businessId}/commissions/staff/${businessUserId}/rate`,
		data
	);
	clearApiCache(commissionCacheKey(businessId));
	clearApiCache(`/business/${businessId}/team`);
	return updated;
}
