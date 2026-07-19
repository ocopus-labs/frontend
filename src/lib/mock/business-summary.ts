/**
 * Per-business operational summary — mock.
 *
 * TODO(api): replace `buildBusinessSummaries()` with a real
 * `GET /api/account/businesses/summary` call. See docs/FRONTEND-API-PENDING.md §2.
 *
 * This deliberately returns *only* what `getUserBusinesses()` doesn't already
 * provide; the page merges it onto the real business records by id.
 *
 * Seeded deterministically off the business id so SSR and hydration agree.
 */

export interface BusinessAlert {
	kind: 'stock' | 'payment' | 'sync' | 'subscription';
	message: string;
	severity: 'warning' | 'destructive';
}

export interface BusinessSummary {
	businessId: string;
	/** Derived server-side from `settings.businessHours` in the business's own timezone. */
	isOpenNow: boolean;
	todayRevenue: number;
	todayOrders: number;
	/** Signed % vs the same point yesterday. */
	revenueChange: number;
	/** Last 7 days of revenue, oldest → newest. */
	sparkline: number[];
	staffCount: number;
	activeStaffNow: number;
	pendingOrders: number;
	alerts: BusinessAlert[];
	lastActivityMinutesAgo: number | null;
}

export interface SummarySeedBusiness {
	id: string;
	name: string;
}

function hashSeed(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

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

const ALERT_POOL: BusinessAlert[] = [
	{ kind: 'stock', message: '3 items below reorder point', severity: 'warning' },
	{ kind: 'payment', message: 'Payment gateway not configured', severity: 'destructive' },
	{ kind: 'sync', message: '12 offline orders pending sync', severity: 'warning' },
	{ kind: 'subscription', message: 'Trial ends in 4 days', severity: 'warning' }
];

/** Build a summary for each business, keyed by id. */
export function buildBusinessSummaries(
	businesses: SummarySeedBusiness[]
): Map<string, BusinessSummary> {
	const map = new Map<string, BusinessSummary>();

	for (const business of businesses) {
		const next = rng(hashSeed(business.id + 'summary'));

		const dailyBase = between(next, 900, 4200);
		const isOpenNow = next() > 0.25;
		const alertRoll = next();

		const alerts: BusinessAlert[] = [];
		if (alertRoll > 0.72) alerts.push(ALERT_POOL[Math.floor(next() * ALERT_POOL.length)]);
		if (alertRoll > 0.92) alerts.push(ALERT_POOL[Math.floor(next() * ALERT_POOL.length)]);

		const sparkline = Array.from({ length: 7 }, () =>
			Math.round(dailyBase * between(next, 0.7, 1.3))
		);
		const staffCount = Math.round(between(next, 3, 24));

		map.set(business.id, {
			businessId: business.id,
			isOpenNow,
			todayRevenue: Math.round(dailyBase * between(next, 0.4, 1.1)),
			todayOrders: Math.round(between(next, 8, 90)),
			revenueChange: Math.round(between(next, -18, 34) * 10) / 10,
			sparkline,
			staffCount,
			activeStaffNow: isOpenNow ? Math.max(1, Math.round(staffCount * between(next, 0.2, 0.6))) : 0,
			pendingOrders: isOpenNow ? Math.round(between(next, 0, 9)) : 0,
			// De-duplicate: the same alert can be rolled twice.
			alerts: alerts.filter((a, i) => alerts.findIndex((b) => b.kind === a.kind) === i),
			lastActivityMinutesAgo: isOpenNow ? Math.round(between(next, 1, 45)) : null
		});
	}

	return map;
}
