import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export const DASHBOARD_PERIODS = ['today', '7d', '30d', 'month', 'year'] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
	{ value: 'today', label: 'Today' },
	{ value: '7d', label: 'Last 7 days' },
	{ value: '30d', label: 'Last 30 days' },
	{ value: 'month', label: 'This month' },
	{ value: 'year', label: 'This year' }
];

export const PERIOD_COMPARISON_LABEL: Record<DashboardPeriod, string> = {
	today: 'vs yesterday',
	'7d': 'vs previous 7 days',
	'30d': 'vs previous 30 days',
	month: 'vs last month',
	year: 'vs last year'
};

/** Narrow an untrusted `?period=` value to a supported one. */
export function toDashboardPeriod(value: string | null): DashboardPeriod {
	return DASHBOARD_PERIODS.includes(value as DashboardPeriod) ? (value as DashboardPeriod) : '7d';
}

/** A headline metric with its period-over-period movement. */
export interface MetricValue {
	value: number;
	/** Signed percentage vs the comparison period; `0` when there is no prior data. */
	change: number;
	/** Short series for the card sparkline (oldest → newest). */
	sparkline: number[];
}

export interface AccountTotals {
	revenue: MetricValue;
	orders: MetricValue;
	avgOrderValue: MetricValue;
	newCustomers: MetricValue;
	/** Down is good here — render with `invertTrend`. */
	refunds: MetricValue;
}

/** Per-business slice of the portfolio, ordered by revenue desc. */
export interface BusinessPerformance {
	businessId: string;
	revenue: number;
	revenueChange: number;
	/** Share of total portfolio revenue, 0–1. */
	share: number;
	orders: number;
	avgOrderValue: number;
	sparkline: number[];
	status: 'open' | 'closed' | 'attention';
	/** Human note behind an `attention` status, e.g. low stock. */
	statusNote?: string;
}

export interface RevenuePoint {
	/** Display label for the x-axis (already formatted server-side). */
	date: string;
	revenue: number;
	orders: number;
}

export interface PeakHourPoint {
	hour: string;
	orders: number;
}

export interface TopItem {
	name: string;
	businessName: string;
	quantity: number;
	revenue: number;
}

export interface ActivityEvent {
	id: string;
	kind: 'order' | 'refund' | 'staff' | 'stock' | 'payout';
	title: string;
	description: string;
	businessName: string;
	/** Minutes ago — the page turns this into a relative label. */
	minutesAgo: number;
	amount?: number;
}

export interface AccountDashboard {
	period: DashboardPeriod;
	/** ISO 4217 code every money figure in this payload is denominated in. */
	currency: string;
	/**
	 * True when the account's businesses don't all bill in `currency`. The
	 * totals then cover only the businesses that do — the rest are excluded
	 * rather than converted, because there is no exchange-rate source.
	 */
	mixedCurrency: boolean;
	totals: AccountTotals;
	revenueSeries: RevenuePoint[];
	byBusiness: BusinessPerformance[];
	peakHours: PeakHourPoint[];
	topItems: TopItem[];
	activity: ActivityEvent[];
}

export interface BusinessAlert {
	kind: 'stock' | 'payment' | 'sync' | 'subscription';
	message: string;
	severity: 'warning' | 'destructive';
}

export interface BusinessSummary {
	businessId: string;
	/** Derived from `settings.businessHours` in the business's own timezone. */
	isOpenNow: boolean;
	todayRevenue: number;
	todayOrders: number;
	/** Signed % vs the same elapsed slice of yesterday. */
	revenueChange: number;
	/** Last 7 days of revenue, oldest → newest. */
	sparkline: number[];
	staffCount: number;
	activeStaffNow: number;
	pendingOrders: number;
	alerts: BusinessAlert[];
	lastActivityMinutesAgo: number | null;
	/** This business's own currency — summaries are per-business, never mixed. */
	currency: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== ACCOUNT DASHBOARD API ====================

/**
 * Portfolio rollup across every business the caller belongs to.
 * Resolves to `null` when the caller has no businesses yet.
 */
export async function getAccountDashboard(
	period: DashboardPeriod = '7d',
	options?: FetchOption
): Promise<AccountDashboard | null> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const response = await api.get<{ dashboard: AccountDashboard | null }>(
		`/account/dashboard?period=${period}`
	);
	return response.dashboard;
}

/**
 * Per-business operational summary for the businesses grid.
 *
 * Returns only what `getUserBusinesses()` doesn't already carry — the page
 * merges it onto the real business records by id. Every accessible business
 * gets an entry, including ones with no activity today.
 */
export async function getBusinessSummaries(options?: FetchOption): Promise<BusinessSummary[]> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const response = await api.get<{ summaries: BusinessSummary[] }>('/account/businesses/summary');
	return response.summaries;
}
