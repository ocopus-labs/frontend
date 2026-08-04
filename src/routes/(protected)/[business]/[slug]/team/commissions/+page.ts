import type { PageLoad } from './$types';
import { getCommissionReport } from '$lib/api';

/**
 * The pay period, resolved in the outlet's zone rather than the viewer's.
 *
 * A month boundary is a wall-clock idea, and a manager in Dubai opening the
 * report for a Kolkata salon must see the salon's month. `?month=YYYY-MM` wins
 * when present, so a period can be linked and survives a reload.
 *
 * Both bounds are UTC instants composed from that zone's midnight; the backend
 * treats them half-open (`gte` / `lt`), so a row lands in exactly one month.
 */
function monthBounds(month: string, timeZone: string): { from: string; to: string } {
	const [year, monthIndex] = month.split('-').map(Number);
	return {
		from: zonedMidnight(year, monthIndex, timeZone),
		to:
			monthIndex === 12
				? zonedMidnight(year + 1, 1, timeZone)
				: zonedMidnight(year, monthIndex + 1, timeZone)
	};
}

/**
 * The instant midnight-on-the-1st happens in `timeZone`.
 *
 * Composed by measuring the zone's offset at that nominal wall clock and
 * subtracting it, rather than by string arithmetic — the offset is not a
 * constant per zone and a fixed `+05:30` would be wrong for half the world and
 * for half the year in most of the rest.
 */
function zonedMidnight(year: number, month: number, timeZone: string): string {
	const nominal = Date.UTC(year, month - 1, 1, 0, 0, 0);
	const asUtc = new Date(nominal);
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(asUtc);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	const seenAsUtc = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	return new Date(nominal + (nominal - seenAsUtc)).toISOString();
}

/** The outlet's current month as `YYYY-MM`. */
function currentMonth(timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit'
	}).format(new Date());
	return parts.slice(0, 7);
}

export const load: PageLoad = async ({ parent, url, fetch, depends }) => {
	depends('app:commissions');
	const parentData = await parent();
	const businessId = parentData.businessId;

	const timeZone =
		parentData.business?.timezone ?? parentData.business?.settings?.timezone ?? 'UTC';
	const currency = parentData.business?.settings?.currency ?? 'INR';
	const month = url.searchParams.get('month') || currentMonth(timeZone);
	const period = monthBounds(month, timeZone);

	try {
		// One call. The report already carries every active member and their
		// rate — the rates are payroll data and are served from behind the
		// payroll roles rather than from the general team list, which STAFF can
		// read.
		const report = await getCommissionReport(businessId, period, { fetch });
		return { ...parentData, month, timeZone, currency, report };
	} catch (err) {
		console.error('Failed to load commissions:', err);
		return {
			...parentData,
			month,
			timeZone,
			currency,
			report: { from: period.from, to: period.to, staff: [], total: {} },
			error: err instanceof Error ? err.message : 'Failed to load commissions'
		};
	}
};
