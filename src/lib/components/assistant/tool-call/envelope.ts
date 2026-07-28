import type { ToolResultEnvelope, TableColumn, ValueFormat } from '$lib/api/agent';
import { formatCurrency, type CurrencyCode } from '$lib/utils/i18n';

/**
 * Reading and formatting tool results.
 *
 * The backend describes what a payload *is* (`kind: 'table'`, a `money` column);
 * this decides what that looks like on screen. Kept out of the components so
 * the rules are testable and so every renderer formats an amount the same way —
 * a table showing ₹450 next to a record showing 450.00 is the kind of
 * inconsistency operators read as a bug in the numbers themselves.
 */

/** Envelope kinds the registry knows how to render. */
const KINDS = new Set(['table', 'record', 'series', 'text', 'raw']);

/**
 * Whether a tool output is a B3 envelope.
 *
 * Structural, not just a `kind` check: business payloads legitimately contain a
 * field called `kind` (a menu item's dietary kind, for one), and rendering
 * one of those as an empty table would be worse than showing the JSON.
 */
export function isEnvelope(output: unknown): output is ToolResultEnvelope {
	if (typeof output !== 'object' || output === null) return false;
	const value = output as Record<string, unknown>;
	if (typeof value.kind !== 'string' || !KINDS.has(value.kind)) return false;

	switch (value.kind) {
		case 'table':
			return Array.isArray(value.columns) && Array.isArray(value.rows);
		case 'record':
			return Array.isArray(value.fields);
		case 'series':
			return Array.isArray(value.points);
		case 'text':
			return typeof value.text === 'string';
		case 'raw':
			return 'data' in value;
		default:
			return false;
	}
}

/** Read a dotted path, returning undefined rather than throwing on a gap. */
export function readPath(row: unknown, key: string): unknown {
	let current: unknown = row;
	for (const segment of key.split('.')) {
		if (current === null || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

export interface FormatContext {
	currency: string;
	timezone: string;
}

const EM_DASH = '—';

/**
 * A cell or field value, as text.
 *
 * Returns an em dash for absent values rather than an empty string: a blank
 * cell in a table of numbers reads as zero, and "no discount recorded" and
 * "a discount of zero" are different facts about an order.
 */
export function formatValue(
	value: unknown,
	format: ValueFormat | undefined,
	ctx: FormatContext
): string {
	if (value === null || value === undefined || value === '') return EM_DASH;

	// Arrays of scalars — tags, mostly. Anything deeper is not a cell.
	if (Array.isArray(value)) {
		const parts = value.filter((v) => typeof v === 'string' || typeof v === 'number');
		return parts.length ? parts.join(', ') : EM_DASH;
	}
	if (typeof value === 'object') return EM_DASH;

	switch (format) {
		case 'money':
			return formatMoneyValue(value, ctx.currency);
		case 'number':
			return formatNumber(value);
		case 'percent':
			return formatPercent(value);
		case 'date':
			return formatDateValue(value, ctx.timezone, false);
		case 'datetime':
			return formatDateValue(value, ctx.timezone, true);
		case 'boolean':
			return value ? 'Yes' : 'No';
		case 'status':
			return humanize(String(value));
		default:
			return String(value);
	}
}

/**
 * Prisma `Decimal` serialises to a numeric *string*, so every amount in the
 * schema arrives as text. Parsing here rather than at each call site is what
 * stops a total rendering as "450.00" beside one rendering as "₹450.00".
 */
function toNumber(value: unknown): number | null {
	const parsed = typeof value === 'string' ? Number(value) : value;
	return typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : null;
}

function formatMoneyValue(value: unknown, currency: string): string {
	const amount = toNumber(value);
	if (amount === null) return String(value);
	return formatCurrency(amount, currency as CurrencyCode);
}

function formatNumber(value: unknown): string {
	const parsed = toNumber(value);
	if (parsed === null) return String(value);
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: Number.isInteger(parsed) ? 0 : 2
	}).format(parsed);
}

function formatPercent(value: unknown): string {
	const parsed = toNumber(value);
	if (parsed === null) return String(value);
	// The backend sends a percentage, not a fraction — `percentage: 42.5` means
	// 42.5%. Dividing by 100 here would quietly shrink every share by two
	// orders of magnitude.
	return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(parsed)}%`;
}

function formatDateValue(value: unknown, timeZone: string, withTime: boolean): string {
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			...(withTime ? { timeStyle: 'short' } : {}),
			timeZone
		}).format(date);
	} catch {
		// An unknown IANA zone should cost the timezone, not the date.
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			...(withTime ? { timeStyle: 'short' } : {})
		}).format(date);
	}
}

/** `out_of_stock` → `Out of stock`. */
export function humanize(text: string): string {
	const spaced = text.replace(/[_-]+/g, ' ').trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Numeric columns read better right-aligned; everything else does not. */
export function isNumericColumn(column: TableColumn): boolean {
	return column.format === 'money' || column.format === 'number' || column.format === 'percent';
}

/**
 * Status values that carry a meaning worth colouring.
 *
 * Deliberately small. Colouring every status invents a signal — "takeaway" is
 * not good or bad — and a screen where everything is coloured is a screen where
 * nothing stands out.
 */
const POSITIVE = new Set(['paid', 'completed', 'active', 'in_stock', 'confirmed', 'delivered']);
const NEGATIVE = new Set([
	'cancelled',
	'failed',
	'out_of_stock',
	'refunded',
	'rejected',
	'no_show'
]);
const CAUTION = new Set(['pending', 'partial', 'low_stock', 'draft', 'on_hold']);

export type StatusTone = 'positive' | 'negative' | 'caution' | 'neutral';

export function statusTone(value: unknown): StatusTone {
	const key = String(value ?? '')
		.toLowerCase()
		.replace(/[\s-]+/g, '_');
	if (POSITIVE.has(key)) return 'positive';
	if (NEGATIVE.has(key)) return 'negative';
	if (CAUTION.has(key)) return 'caution';
	return 'neutral';
}

/**
 * A short summary of a result, for the collapsed header.
 *
 * "24 orders" tells an operator whether to expand; "Done" does not.
 */
export function summarize(envelope: ToolResultEnvelope): string | null {
	switch (envelope.kind) {
		case 'table': {
			const count = envelope.rows.length;
			const total = envelope.meta?.total;
			const known = typeof total === 'number' && total > count;
			return known ? `${count} of ${total}` : `${count} ${count === 1 ? 'row' : 'rows'}`;
		}
		case 'series':
			return `${envelope.points.length} points`;
		case 'record':
		case 'text':
		case 'raw':
			return null;
	}
}
