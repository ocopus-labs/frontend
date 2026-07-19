import { formatCurrency, type CurrencyCode } from './i18n';

/**
 * Totals keyed by ISO 4217 code, e.g. `{ INR: 420000, USD: 1830 }`.
 *
 * Any figure that spans more than one outlet is a *set* of totals rather than a
 * number, because outlets bill in their own currency. The platform dashboard
 * used to receive a single scalar here -- the result of summing INR and USD
 * together -- and render it as USD.
 *
 * Mirrors `MoneyByCurrency` in `backend/src/lib/common/utils/money.util.ts`.
 */
export type MoneyByCurrency = Record<string, number>;

/** Non-zero buckets, largest first. */
export function moneyEntries(totals: MoneyByCurrency | undefined): Array<[string, number]> {
	if (!totals) return [];
	return Object.entries(totals)
		.filter(([, amount]) => amount !== 0)
		.sort(([, a], [, b]) => b - a);
}

/**
 * The single currency these totals are in, or `null` if they span more than
 * one. Lets a caller use a single-value display (an animated counter, a chart
 * axis) when that is honest, and fall back when it is not.
 */
export function soleCurrency(totals: MoneyByCurrency | undefined): CurrencyCode | null {
	const entries = moneyEntries(totals);
	return entries.length === 1 ? (entries[0][0] as CurrencyCode) : null;
}

/**
 * Render totals for display. One currency renders as one figure; several render
 * joined, never summed.
 *
 * `emptyCurrency` is only used when there is nothing to show, so that "no
 * revenue" reads as a zero rather than as blank space.
 */
export function formatMoney(
	totals: MoneyByCurrency | undefined,
	emptyCurrency: CurrencyCode = 'INR'
): string {
	const entries = moneyEntries(totals);
	if (entries.length === 0) return formatCurrency(0, emptyCurrency);
	return entries
		.map(([currency, amount]) => formatCurrency(amount, currency as CurrencyCode))
		.join(' · ');
}

/**
 * Total within a single currency, for comparisons that are only meaningful
 * inside one. Returns 0 when that currency is absent -- deliberately not a sum
 * across currencies.
 */
export function moneyIn(totals: MoneyByCurrency | undefined, currency: string): number {
	return totals?.[currency] ?? 0;
}
