<script lang="ts" module>
	/**
	 * One column of the grid.
	 *
	 * What a column *means* is the only difference between the two views. In the
	 * day view a column is a stylist and every column shares one date; in the week
	 * view a column is a date and the whole team shares it. Both drop onto the
	 * same call — `{ date, startTime, staffId }` — so a drag across columns
	 * reassigns the stylist in one view and changes the day in the other, with no
	 * branch anywhere below this type.
	 */
	export interface GridColumn {
		/** Stable identity for the `{#each}` key. */
		key: string;
		label: string;
		/** Secondary line in the header, e.g. the date in a week view. */
		sublabel?: string;
		/** The outlet date this column stands for, `YYYY-MM-DD`. */
		dateKey: string;
		/**
		 * The staff member a drop should assign, or `null` to leave whoever is on
		 * the booking alone.
		 *
		 * There is no third state for "unassign": `reschedule` treats an omitted
		 * `staffId` as "keep", and the API has no way to express clearing one. The
		 * Unassigned column is therefore not a drop target — see `canDrop` below.
		 */
		staffId: string | null;
		muted?: boolean;
		canDrop?: boolean;
	}
</script>

<script lang="ts">
	import type { Appointment } from '$lib/api';
	import { formatZonedTime, minutesToWallClock, zonedMinutesOfDay } from '$lib/utils/timezone';
	import { STATUS_BLOCK_CLASS, canReschedule } from '../status';
	import DraggableAppointment from './draggable-appointment.svelte';
	import DroppableColumn from './droppable-column.svelte';
	import { droppedStartMinutes, MINUTES_PER_DAY, PX_PER_MINUTE } from './dnd';

	interface Props {
		columns: GridColumn[];
		/** Already filtered to the bookings that hold a chair. */
		appointments: Appointment[];
		/** Which column an appointment belongs in. */
		columnOf: (appointment: Appointment) => string;
		timeZone: string;
		/** Visible window in minutes from the outlet's midnight. */
		windowStart: number;
		windowEnd: number;
		/** Minutes past midnight of the outlet's now, when it falls on a shown day. */
		nowMinutes?: number | null;
		/** Which column the now-marker belongs to. Every column, in a day view. */
		nowColumnKey?: string | null;
		columnWidthClass?: string;
		canDrag?: boolean;
		/** The booking whose move is in flight, dimmed until the reload lands. */
		pendingId?: string | null;
		onSelect?: (appointment: Appointment) => void;
		onMove?: (appointment: Appointment, column: GridColumn, startMinutes: number) => void;
	}

	let {
		columns,
		appointments,
		columnOf,
		timeZone,
		windowStart,
		windowEnd,
		nowMinutes = null,
		nowColumnKey = null,
		columnWidthClass = 'w-44',
		canDrag = false,
		pendingId = null,
		onSelect,
		onMove
	}: Props = $props();

	/**
	 * How far into the dragged block the pointer went down. Module-level rather
	 * than passed through the drag payload because Pragmatic's data is captured
	 * once at drag start, and this is read on drop.
	 */
	let grabOffsetMinutes = $state(0);

	const gridHeight = $derived((windowEnd - windowStart) * PX_PER_MINUTE);
	const hourMarks = $derived(
		Array.from({ length: (windowEnd - windowStart) / 60 + 1 }, (_, i) => windowStart + i * 60)
	);

	function startMinutes(appointment: Appointment): number {
		return zonedMinutesOfDay(appointment.blockStartAt, timeZone);
	}

	function endMinutes(appointment: Appointment): number {
		const end = zonedMinutesOfDay(appointment.blockEndAt, timeZone);
		// A booking may end exactly at midnight, which reads as minute 0 of the
		// following day. The server refuses anything that crosses midnight, so an
		// end at or before the start can only be that boundary case.
		return end <= startMinutes(appointment) ? MINUTES_PER_DAY : end;
	}

	function blockMinutes(appointment: Appointment): number {
		return endMinutes(appointment) - startMinutes(appointment);
	}

	function inColumn(key: string): Appointment[] {
		return appointments.filter((a) => columnOf(a) === key);
	}

	function handleDrop(column: GridColumn, appointment: Appointment, pointerMinutes: number) {
		const start = droppedStartMinutes(pointerMinutes, grabOffsetMinutes, blockMinutes(appointment));
		// The block's start is what the grid draws, but the *service* is what the
		// customer is told and what `reschedule` takes — so the setup buffer is
		// added back on. Dropping a booking with a 15-minute setup onto 10:00
		// means the chair is claimed at 10:00 and the customer is seen at 10:15.
		const serviceOffset =
			zonedMinutesOfDay(appointment.startAt, timeZone) - startMinutes(appointment);
		onMove?.(appointment, column, start + Math.max(0, serviceOffset));
	}
</script>

<div class="overflow-x-auto rounded-lg border border-border">
	<div class="flex min-w-max">
		<!-- Time gutter. Sticky so the hours stay readable while scrolling
		     sideways through a large team or a whole week. -->
		<div class="sticky left-0 z-30 w-16 shrink-0 border-r border-border bg-background">
			<div class="h-10 border-b border-border"></div>
			<div class="relative" style="height: {gridHeight}px">
				{#each hourMarks as mark (mark)}
					<span
						class="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
						style="top: {(mark - windowStart) * PX_PER_MINUTE}px"
					>
						{minutesToWallClock(mark === MINUTES_PER_DAY ? 1439 : mark)}
					</span>
				{/each}
			</div>
		</div>

		{#each columns as column (column.key)}
			<div class="{columnWidthClass} shrink-0 border-r border-border last:border-r-0">
				<div
					class="flex h-10 flex-col justify-center border-b border-border bg-muted/40 px-3 text-xs"
				>
					<span class="truncate font-medium" class:text-muted-foreground={column.muted}>
						{column.label}
					</span>
					{#if column.sublabel}
						<span class="truncate text-[10px] text-muted-foreground">{column.sublabel}</span>
					{/if}
				</div>

				<DroppableColumn
					{windowStart}
					{windowEnd}
					height={gridHeight}
					canDrop={canDrag && column.canDrop !== false}
					onDrop={(appointment, minutes) => handleDrop(column, appointment, minutes)}
				>
					{#each hourMarks as mark (mark)}
						<div
							class="absolute inset-x-0 border-t border-border/60"
							style="top: {(mark - windowStart) * PX_PER_MINUTE}px"
						></div>
					{/each}

					{#if nowMinutes !== null && (nowColumnKey === null || nowColumnKey === column.key) && nowMinutes >= windowStart && nowMinutes <= windowEnd}
						<div
							class="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
							style="top: {(nowMinutes - windowStart) * PX_PER_MINUTE}px"
						></div>
					{/if}

					{#each inColumn(column.key) as appointment (appointment.id)}
						<!-- A completed or cancelled booking cannot be rescheduled — the
						     server refuses it — so it must not look draggable either. -->
						<DraggableAppointment
							{appointment}
							top={(startMinutes(appointment) - windowStart) * PX_PER_MINUTE}
							height={blockMinutes(appointment) * PX_PER_MINUTE}
							blockMinutes={blockMinutes(appointment)}
							canDrag={canDrag && canReschedule(appointment.status)}
							pending={pendingId === appointment.id}
							class={STATUS_BLOCK_CLASS[appointment.status]}
							onSelect={() => onSelect?.(appointment)}
							onGrab={(offset) => (grabOffsetMinutes = offset)}
						>
							<span class="truncate text-[11px] leading-tight font-medium">
								{appointment.customer?.name ?? 'Walk-in'}
							</span>
							<span class="truncate text-[10px] leading-tight text-muted-foreground">
								{formatZonedTime(appointment.startAt, timeZone)} ·
								{appointment.services.map((s) => s.name).join(', ') || 'Service'}
							</span>
						</DraggableAppointment>
					{/each}
				</DroppableColumn>
			</div>
		{/each}
	</div>
</div>
