<script lang="ts">
	/**
	 * Seven day columns, the whole team merged into each.
	 *
	 * The other half of what `day-calendar` shows. A salon uses the day view to
	 * run today — one column per stylist, so you can see who is free — and the
	 * week view to answer "when can you fit me in?", which is a question about
	 * days rather than about people.
	 *
	 * Same grid, same drop handler. A column here carries a date and no staff, so
	 * dragging across one moves the booking to another day and leaves the stylist
	 * alone; in the day view a column carries a stylist and one date, so the same
	 * drag reassigns the work. Neither view knows the other exists.
	 */
	import type { Appointment } from '$lib/api';
	import { EmptyState } from '$lib/components/data-display';
	import { shiftDateKey, todayInZone, zonedDateKey, zonedMinutesOfDay } from '$lib/utils/timezone';
	import { occupiesChair } from './status';
	import AppointmentGrid, { type GridColumn } from './calendar/appointment-grid.svelte';
	import { MINUTES_PER_DAY } from './calendar/dnd';
	import { DEFAULT_WINDOW } from './day-calendar.svelte';
	import CalendarOffIcon from '@lucide/svelte/icons/calendar-off';

	interface Props {
		appointments: Appointment[];
		timeZone: string;
		/** The first day of the shown week, `YYYY-MM-DD` in the outlet's zone. */
		fromDateKey: string;
		days?: number;
		canDrag?: boolean;
		pendingId?: string | null;
		onSelect?: (appointment: Appointment) => void;
		onMove?: (appointment: Appointment, column: GridColumn, startMinutes: number) => void;
	}

	let {
		appointments,
		timeZone,
		fromDateKey,
		days = 7,
		canDrag = false,
		pendingId = null,
		onSelect,
		onMove
	}: Props = $props();

	const booked = $derived(appointments.filter((a) => occupiesChair(a.status)));

	function startMinutes(appointment: Appointment): number {
		return zonedMinutesOfDay(appointment.blockStartAt, timeZone);
	}

	function endMinutes(appointment: Appointment): number {
		const end = zonedMinutesOfDay(appointment.blockEndAt, timeZone);
		return end <= startMinutes(appointment) ? MINUTES_PER_DAY : end;
	}

	const visible = $derived.by(() => {
		let start = DEFAULT_WINDOW.start;
		let end = DEFAULT_WINDOW.end;
		for (const appointment of booked) {
			start = Math.min(start, startMinutes(appointment));
			end = Math.max(end, endMinutes(appointment));
		}
		return {
			start: Math.max(0, Math.floor(start / 60) * 60),
			end: Math.min(MINUTES_PER_DAY, Math.ceil(end / 60) * 60)
		};
	});

	const today = $derived(todayInZone(timeZone));

	/**
	 * Column headers are built with `shiftDateKey`, which walks date keys through
	 * UTC rather than adding 24 hours to a local instant. On a DST changeover day
	 * the latter lands on the previous or next date, and a week view is exactly
	 * where that shows up as a duplicated or missing column.
	 */
	const columns = $derived.by(() =>
		Array.from({ length: days }, (_, i): GridColumn => {
			const dateKey = shiftDateKey(fromDateKey, i);
			const at = new Date(`${dateKey}T12:00:00.000Z`);
			return {
				key: dateKey,
				label: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(at),
				sublabel: new Intl.DateTimeFormat('en-GB', {
					day: 'numeric',
					month: 'short',
					timeZone: 'UTC'
				}).format(at),
				dateKey,
				// Null, so a move between days leaves the stylist alone. Reassigning
				// is the day view's gesture, where the columns are people.
				staffId: null,
				muted: dateKey !== today
			};
		})
	);

	let nowMinutes = $state<number | null>(null);
	let nowColumnKey = $state<string | null>(null);

	$effect(() => {
		const zone = timeZone;

		function tick() {
			const now = new Date();
			const key = zonedDateKey(now, zone);
			nowColumnKey = key;
			nowMinutes = zonedMinutesOfDay(now, zone);
		}

		tick();
		const timer = setInterval(tick, 60_000);
		return () => clearInterval(timer);
	});
</script>

{#if booked.length === 0}
	<EmptyState
		title="Nothing booked this week"
		description="The whole week is free."
		icon={CalendarOffIcon}
	/>
{:else}
	<AppointmentGrid
		{columns}
		appointments={booked}
		columnOf={(a) => zonedDateKey(a.blockStartAt, timeZone)}
		{timeZone}
		windowStart={visible.start}
		windowEnd={visible.end}
		{nowMinutes}
		{nowColumnKey}
		columnWidthClass="w-40"
		{canDrag}
		{pendingId}
		{onSelect}
		{onMove}
	/>
{/if}
