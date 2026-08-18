/**
 * Drag geometry for the appointment grid.
 *
 * Adapted from `DevRohit06/big-calendar-svelte` (MIT) — `src/lib/calendar/
 * components/dnd/dnd.ts`. The pure minute arithmetic is taken close to
 * verbatim; everything that produced an instant is gone.
 *
 * **That removal is the whole adaptation.** The original composes times with
 * `startOfDay(day)` and `set(day, { hours, minutes })` from `date-fns`, which
 * read the *browser's* zone. This diary is built the other way round: every
 * time is the outlet's, so a manager in Dubai sees a Kolkata salon's own clock
 * (`$lib/utils/timezone`). Reusing those helpers would have reintroduced
 * exactly the bug class the Phase 2 DST tests exist to catch.
 *
 * It turns out not to be needed. A drag here yields a **date key and a
 * wall-clock minute**, and `PATCH /appointments/:id/reschedule` takes precisely
 * that — `{ date, startTime }` — because the server composes the instant
 * against the outlet's zone. No instant is ever built on the client, so there
 * is nothing for a timezone to be wrong about.
 */

import type { Appointment } from '$lib/api';

/**
 * Vertical scale. 64px an hour keeps a 30-minute service legible on one line
 * without making a ten-hour day scroll forever. The original used 96px; 64
 * matches what this diary already shipped with.
 */
export const HOUR_HEIGHT = 64;
export const PX_PER_MINUTE = HOUR_HEIGHT / 60;
export const MINUTES_PER_DAY = 1440;

/** Grid resolution. Bookings snap to a quarter hour, like the slot API's default. */
export const SLOT_MINUTES = 15;

/**
 * Marker key on the drag payload. Namespaced, and deliberately not the same
 * word as the `appointment` property beside it — a computed key that collides
 * with a literal one gives the object two declarations of the same name.
 */
const DRAG_KEY = 'ocopus-appointment-drag';

type AppointmentDragData = {
	[DRAG_KEY]: true;
	appointment: Appointment;
};

export function appointmentDragData(appointment: Appointment): AppointmentDragData {
	return { [DRAG_KEY]: true, appointment };
}

export function isAppointmentDragData(
	data: Record<string | symbol, unknown>
): data is AppointmentDragData {
	return data[DRAG_KEY] === true;
}

/** Rounds a minute value to the nearest slot boundary. */
export function snapToSlot(minutes: number): number {
	return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

/**
 * Which minute a pointer sitting `offsetY` down a column has landed on.
 *
 * Geometry rather than `document.elementFromPoint`: for most of a drag the
 * pointer is over an appointment block or the drag preview, neither of which is
 * a slot, so a hit test would stall on the last slot it saw. Clamped, so
 * dragging off the top or bottom parks on a real minute instead of running off
 * into negative time.
 *
 * Taken from the original almost unchanged — it is pure arithmetic over
 * offsets and needs no dates at all.
 */
export function minutesFromOffset(
	offsetY: number,
	columnHeight: number,
	windowStart: number,
	windowEnd: number
): number {
	if (columnHeight <= 0) return windowStart;

	const raw = windowStart + (offsetY / columnHeight) * (windowEnd - windowStart);
	const clamped = Math.min(Math.max(raw, windowStart), windowEnd - SLOT_MINUTES);

	return Math.floor(clamped / SLOT_MINUTES) * SLOT_MINUTES;
}

/**
 * Where a dragged booking should start, given where its *block* was grabbed.
 *
 * `grabOffsetMinutes` is how far into the block the pointer went down, so a
 * booking picked up by its middle does not jump its top edge to the cursor.
 * Snapped after the subtraction, and never allowed above the top of the day.
 */
export function droppedStartMinutes(
	pointerMinutes: number,
	grabOffsetMinutes: number,
	blockLengthMinutes: number
): number {
	const start = snapToSlot(pointerMinutes - grabOffsetMinutes);
	// A booking may not be dragged off either end of its own day: the server
	// refuses anything crossing the outlet's midnight, and offering the gesture
	// only to have it 400 is worse than not offering it.
	return Math.min(Math.max(start, 0), MINUTES_PER_DAY - blockLengthMinutes);
}
