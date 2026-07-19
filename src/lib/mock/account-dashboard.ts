/**
 * Account-dashboard mock data.
 *
 * TODO(api): replace `buildAccountDashboard()` with a real
 * `GET /api/account/dashboard?period=…` call. The exported types are the
 * contract we want the backend to return — keep them as the source of truth
 * when the endpoint is built, so the page itself needs no changes.
 *
 * Values are derived from a deterministic seed (hashed from the business id +
 * period) rather than `Math.random()`, so SSR and hydration agree and the
 * numbers don't jump on every re-render.
 */

export type DashboardPeriod = 'today' | '7d' | '30d' | 'month' | 'year';

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

/** A single headline metric with its period-over-period movement. */
export interface MetricValue {
	value: number;
	/** Signed percentage change vs the comparison period. */
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
	/** Display label for the x-axis (already formatted). */
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
	totals: AccountTotals;
	revenueSeries: RevenuePoint[];
	byBusiness: BusinessPerformance[];
	peakHours: PeakHourPoint[];
	topItems: TopItem[];
	activity: ActivityEvent[];
}

/** Minimal shape this module needs from a business record. */
export interface SeedBusiness {
	id: string;
	name: string;
	type?: string | null;
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-randomness
// ---------------------------------------------------------------------------

function hashSeed(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** mulberry32 — small, fast, stable across runtimes. */
function rng(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function between(next: () => number, min: number, max: number): number {
	return min + next() * (max - min);
}

/** Random walk that trends toward `drift` — reads like a real metric series. */
function series(next: () => number, points: number, base: number, drift: number): number[] {
	const out: number[] = [];
	let current = base;
	for (let i = 0; i < points; i++) {
		const trend = (drift / points) * base;
		current = Math.max(base * 0.35, current + trend + between(next, -0.12, 0.12) * base);
		out.push(Math.round(current));
	}
	return out;
}

// ---------------------------------------------------------------------------
// Period shaping
// ---------------------------------------------------------------------------

const PERIOD_SHAPE: Record<
	DashboardPeriod,
	{ points: number; multiplier: number; label: (i: number, points: number) => string }
> = {
	today: {
		points: 12,
		multiplier: 1,
		// Compact 12-hour labels — the bar-chart axis truncates anything over 3 chars.
		label: (i) => {
			const hour = (i + 9) % 24;
			const suffix = hour < 12 ? 'a' : 'p';
			const h12 = hour % 12 === 0 ? 12 : hour % 12;
			return `${h12}${suffix}`;
		}
	},
	'7d': {
		points: 7,
		multiplier: 7,
		label: (i, points) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % points]
	},
	'30d': { points: 15, multiplier: 30, label: (i) => `${i * 2 + 1}` },
	month: { points: 12, multiplier: 26, label: (i) => `${i * 2 + 1}` },
	year: {
		points: 12,
		multiplier: 300,
		label: (i) =>
			['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]
	}
};

const ITEMS_BY_TYPE: Record<string, string[]> = {
	restaurant: ['Butter Chicken', 'Paneer Tikka', 'Biryani', 'Garlic Naan', 'Dal Makhani'],
	cafe: ['Cappuccino', 'Cold Brew', 'Croissant', 'Blueberry Muffin', 'Chai Latte'],
	bar: ['Old Fashioned', 'Draft Lager', 'Negroni', 'Nachos', 'House Red'],
	salon: ['Haircut & Style', 'Beard Trim', 'Hair Colour', 'Head Massage', 'Facial'],
	spa: ['Deep Tissue', 'Aroma Therapy', 'Body Scrub', 'Manicure', 'Hot Stone'],
	gym: ['Monthly Pass', 'PT Session', 'Protein Shake', 'Day Pass', 'Yoga Class'],
	retail: ['Cotton Tee', 'Denim Jacket', 'Sneakers', 'Tote Bag', 'Cap'],
	clinic: ['Consultation', 'Blood Panel', 'Dental Clean', 'X-Ray', 'Follow-up'],
	other: ['Service A', 'Service B', 'Service C', 'Service D', 'Service E']
};

function itemsFor(type?: string | null): string[] {
	return ITEMS_BY_TYPE[type ?? 'other'] ?? ITEMS_BY_TYPE.other;
}

function metric(next: () => number, base: number, drift: number, points = 12): MetricValue {
	const spark = series(next, points, base / points, drift);
	const total = spark.reduce((sum, v) => sum + v, 0);
	return {
		value: Math.round(total),
		change: Math.round(drift * 100 * 10) / 10,
		sparkline: spark
	};
}

/**
 * Build a full portfolio dashboard for the given businesses and period.
 * Returns `null` when there are no businesses — the page renders its empty state.
 */
export function buildAccountDashboard(
	businesses: SeedBusiness[],
	period: DashboardPeriod
): AccountDashboard | null {
	if (!businesses.length) return null;

	const shape = PERIOD_SHAPE[period];
	const next = rng(hashSeed(businesses.map((b) => b.id).join('|') + period));

	// --- per-business ------------------------------------------------------
	const raw = businesses.map((business) => {
		const bNext = rng(hashSeed(business.id + period));
		const dailyBase = between(bNext, 900, 4200);
		const revenue = Math.round(dailyBase * shape.multiplier);
		const avgOrderValue = Math.round(between(bNext, 180, 720));
		const roll = bNext();

		return {
			businessId: business.id,
			revenue,
			revenueChange: Math.round(between(bNext, -14, 32) * 10) / 10,
			orders: Math.max(1, Math.round(revenue / avgOrderValue)),
			avgOrderValue,
			sparkline: series(bNext, 10, dailyBase / 10, 0.18),
			status: (roll > 0.82 ? 'attention' : roll > 0.12 ? 'open' : 'closed') as
				'open' | 'closed' | 'attention',
			statusNote: roll > 0.82 ? 'Low stock on 3 items' : undefined
		};
	});

	const totalRevenue = raw.reduce((sum, b) => sum + b.revenue, 0);
	const byBusiness: BusinessPerformance[] = raw
		.map((b) => ({ ...b, share: totalRevenue ? b.revenue / totalRevenue : 0 }))
		.sort((a, b) => b.revenue - a.revenue);

	const totalOrders = byBusiness.reduce((sum, b) => sum + b.orders, 0);

	// --- portfolio revenue series -----------------------------------------
	const revenueWalk = series(next, shape.points, totalRevenue / shape.points, 0.22);
	const revenueSeries: RevenuePoint[] = revenueWalk.map((revenue, i) => ({
		date: shape.label(i, shape.points),
		revenue,
		orders: Math.max(1, Math.round(revenue / (totalRevenue / totalOrders || 1)))
	}));

	// --- headline totals ---------------------------------------------------
	const totals: AccountTotals = {
		revenue: {
			value: totalRevenue,
			change: Math.round(between(next, 4, 26) * 10) / 10,
			sparkline: revenueWalk
		},
		orders: {
			value: totalOrders,
			change: Math.round(between(next, -3, 19) * 10) / 10,
			sparkline: revenueSeries.map((p) => p.orders)
		},
		avgOrderValue: {
			value: Math.round(totalRevenue / (totalOrders || 1)),
			change: Math.round(between(next, -6, 12) * 10) / 10,
			sparkline: series(next, 12, totalRevenue / (totalOrders || 1), 0.08)
		},
		newCustomers: metric(next, Math.round(totalOrders * 0.34), between(next, 0.02, 0.24)),
		refunds: metric(next, Math.max(1, Math.round(totalOrders * 0.02)), between(next, -0.3, 0.08))
	};

	// --- peak hours --------------------------------------------------------
	// Two-humped lunch/dinner curve so it reads like a real hospitality day.
	const peakHours: PeakHourPoint[] = Array.from({ length: 13 }, (_, i) => {
		const hour = i + 9;
		const lunch = Math.exp(-((hour - 13) ** 2) / 3.2);
		const dinner = Math.exp(-((hour - 20) ** 2) / 4.5);
		return {
			hour: `${hour.toString().padStart(2, '0')}:00`,
			orders: Math.round((lunch * 0.8 + dinner) * totalOrders * 0.18 * between(next, 0.85, 1.15))
		};
	});

	// --- top items across the portfolio ------------------------------------
	const topItems: TopItem[] = businesses
		.flatMap((business) => {
			const iNext = rng(hashSeed(business.id + 'items' + period));
			return itemsFor(business.type)
				.slice(0, 3)
				.map((name) => {
					const quantity = Math.round(between(iNext, 20, 140) * (shape.multiplier / 7 + 0.6));
					return {
						name,
						businessName: business.name,
						quantity,
						revenue: Math.round(quantity * between(iNext, 120, 480))
					};
				});
		})
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 6);

	// --- activity feed -----------------------------------------------------
	const activityTemplates: Omit<ActivityEvent, 'id' | 'businessName' | 'minutesAgo'>[] = [
		{ kind: 'order', title: 'Order completed', description: 'Table 12 · 4 items', amount: 1840 },
		{
			kind: 'payout',
			title: 'Payout settled',
			description: 'Razorpay · UTR 8842019',
			amount: 42300
		},
		{ kind: 'stock', title: 'Low stock alert', description: 'Paneer below reorder point' },
		{
			kind: 'order',
			title: 'Online order received',
			description: 'Delivery · 2.4 km',
			amount: 640
		},
		{ kind: 'staff', title: 'Shift started', description: 'Anita M. clocked in' },
		{
			kind: 'refund',
			title: 'Refund issued',
			description: 'Order #4471 · customer request',
			amount: 320
		},
		{ kind: 'order', title: 'Order completed', description: 'Takeaway · 2 items', amount: 410 },
		{ kind: 'staff', title: 'Discount approved', description: '10% by manager on #4482' }
	];

	const activity: ActivityEvent[] = activityTemplates.map((template, i) => ({
		...template,
		id: `activity-${i}`,
		businessName: businesses[i % businesses.length].name,
		minutesAgo: Math.round(between(next, 1, 8)) + i * 7
	}));

	return { period, totals, revenueSeries, byBusiness, peakHours, topItems, activity };
}
