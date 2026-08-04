/**
 * Wall-clock arithmetic in a business's own timezone.
 *
 * The backend stores every instant in UTC and composes bookings against
 * `Restaurant.timezone` — the promoted column, which is the source of truth over
 * the copy in `settings.timezone`. If the browser renders those instants with
 * its *own* zone, a booking made at 10:00 in a Mumbai salon shows as 04:30 to an
 * owner travelling in London, and "today" is a different day for the two of them.
 *
 * So none of these read the browser zone. Every function takes the outlet's IANA
 * zone explicitly and there is no default — omitting it should be a type error,
 * not a silently wrong render.
 *
 * This is the frontend counterpart to `src/lib/common/utils/date.util.ts` on the
 * backend, and deliberately mirrors its half-open, minutes-from-midnight model.
 */

export interface ZonedParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

/** `Intl.DateTimeFormat` construction is expensive; one per zone is plenty. */
const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = formatters.get(timeZone);
	if (cached) return cached;

	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		// `hourCycle: 'h23'` and not `hour12: false`. They are not the same: with
		// `hour12: false` an en-US formatter yields the h24 cycle, where midnight
		// reads as hour **24** rather than 0 — which lands a midnight booking at
		// minute 1440 and pushes it off the bottom of the day.
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
	formatters.set(timeZone, formatter);
	return formatter;
}

export function zonedParts(instant: Date | string, timeZone: string): ZonedParts {
	const date = instant instanceof Date ? instant : new Date(instant);
	const parts = partsFormatter(timeZone).formatToParts(date);
	const read = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((p) => p.type === type)?.value ?? '0');

	return {
		year: read('year'),
		month: read('month'),
		day: read('day'),
		hour: read('hour'),
		minute: read('minute')
	};
}

/** Minutes since midnight of the instant's own calendar day, in `timeZone`. */
export function zonedMinutesOfDay(instant: Date | string, timeZone: string): number {
	const { hour, minute } = zonedParts(instant, timeZone);
	return hour * 60 + minute;
}

/** `YYYY-MM-DD` — which calendar day this instant falls on, in `timeZone`. */
export function zonedDateKey(instant: Date | string, timeZone: string): string {
	const { year, month, day } = zonedParts(instant, timeZone);
	return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

/** Today's date key for the outlet — not for whoever is looking at the screen. */
export function todayInZone(timeZone: string): string {
	return zonedDateKey(new Date(), timeZone);
}

/**
 * Move a `YYYY-MM-DD` key by whole days.
 *
 * Pure calendar arithmetic, so it runs at UTC on purpose: a zone-aware shift
 * would land on 23:00 the previous day across a DST boundary and the key would
 * go backwards.
 */
export function shiftDateKey(dateKey: string, days: number): string {
	const at = new Date(`${dateKey}T00:00:00.000Z`);
	at.setUTCDate(at.getUTCDate() + days);
	return at.toISOString().slice(0, 10);
}

/** `2026-08-03` → `Mon, 3 Aug 2026`. */
export function formatDateKey(dateKey: string): string {
	// Read back at UTC, matching how the key was built — formatting it in the
	// viewer's zone would show the day before for anyone west of UTC.
	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(new Date(`${dateKey}T12:00:00.000Z`));
}

/** An instant as the outlet's clock reads it: `9:30 AM`. */
export function formatZonedTime(instant: Date | string, timeZone: string): string {
	const date = instant instanceof Date ? instant : new Date(instant);
	return new Intl.DateTimeFormat('en-US', {
		timeZone,
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(date);
}

/** Minutes from midnight → the `HH:mm` the booking API accepts. */
export function minutesToWallClock(minutes: number): string {
	const whole = Math.floor(minutes / 60);
	return `${pad2(whole)}:${pad2(minutes - whole * 60)}`;
}

/** `HH:mm` → minutes from midnight, or `null` if it is not a 24-hour time. */
export function wallClockToMinutes(value: string): number | null {
	const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
	if (!match) return null;
	return Number(match[1]) * 60 + Number(match[2]);
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function pad4(n: number): string {
	return String(n).padStart(4, '0');
}
