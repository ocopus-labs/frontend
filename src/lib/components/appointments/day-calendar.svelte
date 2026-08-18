<script lang="ts" module>
	export interface CalendarStaff {
		/** `BusinessUser.id` — the same id the booking API takes as `staffId`. */
		id: string;
		name: string;
	}

	/** The window a day opens on before the bookings themselves widen it. */
	export const DEFAULT_WINDOW = { start: 9 * 60, end: 19 * 60 };

	/**
	 * The statuses the legend explains — the ones that can appear on the grid.
	 * Cancelled and no-show are absent because they are never drawn.
	 */
	const LEGEND_STATUSES = [
		'scheduled',
		'confirmed',
		'checked_in',
		'in_progress',
		'completed'
	] as const;
</script>

<script lang="ts">
	import type { Appointment } from '$lib/api';
	import { Badge } from '$lib/components/ui/badge';
	import { EmptyState } from '$lib/components/data-display';
	import { zonedDateKey, zonedMinutesOfDay } from '$lib/utils/timezone';
	import { STATUS_BLOCK_CLASS, STATUS_LABEL, occupiesChair } from './status';
	import AppointmentGrid, { type GridColumn } from './calendar/appointment-grid.svelte';
	import { MINUTES_PER_DAY } from './calendar/dnd';
	import CalendarOffIcon from '@lucide/svelte/icons/calendar-off';
	import UsersIcon from '@lucide/svelte/icons/users';

	interface Props {
		appointments: Appointment[];
		staff: CalendarStaff[];
		/** The outlet's IANA zone. Every time below is read through it. */
		timeZone: string;
		/** `YYYY-MM-DD`, in the outlet's zone. */
		dateKey: string;
		canDrag?: boolean;
		pendingId?: string | null;
		onSelect?: (appointment: Appointment) => void;
		onMove?: (appointment: Appointment, column: GridColumn, startMinutes: number) => void;
	}

	let {
		appointments,
		staff,
		timeZone,
		dateKey,
		canDrag = false,
		pendingId = null,
		onSelect,
		onMove
	}: Props = $props();

	/**
	 * Only the bookings that actually hold a chair are laid out. Cancelled and
	 * no-show rows are the two statuses the exclusion constraint ignores, so they
	 * are the only ones that can overlap a live booking — putting them on the
	 * grid would draw two blocks in one place and make the day look
	 * double-booked when it is not. The page lists them separately instead.
	 */
	const booked = $derived(appointments.filter((a) => occupiesChair(a.status)));

	function startMinutes(appointment: Appointment): number {
		return zonedMinutesOfDay(appointment.blockStartAt, timeZone);
	}

	function endMinutes(appointment: Appointment): number {
		const end = zonedMinutesOfDay(appointment.blockEndAt, timeZone);
		return end <= startMinutes(appointment) ? MINUTES_PER_DAY : end;
	}

	/**
	 * The visible time window: the default working day, widened to contain every
	 * booking and rounded out to whole hours. Derived from the bookings rather
	 * than from `businessHours` so an out-of-hours appointment is never clipped
	 * off the top or bottom of the grid.
	 */
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

	/**
	 * One column per staff member, plus a column for unassigned bookings and one
	 * for any staff id that is no longer on the team — a deactivated stylist's
	 * bookings still have to appear somewhere, and silently folding them into
	 * "Unassigned" would misattribute them.
	 */
	const columns = $derived.by(() => {
		// Arrays, not a Map/Set: `svelte/prefer-svelte-reactivity` bans the
		// built-ins in a component, and a team is small enough that the linear
		// scans cost nothing.
		const cols: GridColumn[] = staff.map((s) => ({
			key: s.id,
			label: s.name,
			dateKey,
			staffId: s.id
		}));

		let hasUnassigned = false;
		for (const appointment of booked) {
			const id = appointment.staffId;
			if (!id) {
				hasUnassigned = true;
			} else if (!cols.some((c) => c.key === id)) {
				cols.push({ key: id, label: 'Former team member', dateKey, staffId: id, muted: true });
			}
		}

		if (hasUnassigned) {
			cols.push({
				key: '',
				label: 'Unassigned',
				dateKey,
				staffId: null,
				muted: true,
				// `reschedule` reads an omitted `staffId` as "keep whoever is on it",
				// and the API has no way to clear one. Accepting a drop here would
				// silently leave the booking with the stylist it already had, which
				// looks like the drag failed rather than like the gesture is absent.
				canDrop: false
			});
		}
		return cols;
	});

	// The current-time marker, only on the outlet's own today. Re-read once a
	// minute; at 64px an hour a finer interval would not move a pixel.
	let nowMinutes = $state<number | null>(null);

	$effect(() => {
		const zone = timeZone;
		const day = dateKey;

		function tick() {
			const now = new Date();
			nowMinutes = zonedDateKey(now, zone) === day ? zonedMinutesOfDay(now, zone) : null;
		}

		tick();
		const timer = setInterval(tick, 60_000);
		return () => clearInterval(timer);
	});
</script>

{#if columns.length === 0}
	<EmptyState
		title="No one to book yet"
		description="Add team members before taking appointments — every booking is held against a person's time."
		icon={UsersIcon}
	/>
{:else if booked.length === 0}
	<EmptyState
		title="Nothing booked"
		description="This day is completely free."
		icon={CalendarOffIcon}
	/>
{:else}
	<AppointmentGrid
		{columns}
		appointments={booked}
		columnOf={(a) => a.staffId ?? ''}
		{timeZone}
		windowStart={visible.start}
		windowEnd={visible.end}
		{nowMinutes}
		{canDrag}
		{pendingId}
		{onSelect}
		{onMove}
	/>

	<div class="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
		<span>Status</span>
		{#each LEGEND_STATUSES as status (status)}
			<Badge variant="outline" class="gap-1.5 font-normal">
				<span class="size-2 rounded-full border {STATUS_BLOCK_CLASS[status]}"></span>
				{STATUS_LABEL[status]}
			</Badge>
		{/each}
		{#if canDrag}
			<span class="ml-auto">
				Drag a booking to move it. Completed and cancelled bookings stay put.
			</span>
		{/if}
	</div>
{/if}
