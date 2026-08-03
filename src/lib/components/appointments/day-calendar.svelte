<script lang="ts" module>
	export interface CalendarStaff {
		/** `BusinessUser.id` — the same id the booking API takes as `staffId`. */
		id: string;
		name: string;
	}

	/**
	 * Vertical scale. 64px an hour keeps a 30-minute service legible on one line
	 * without making a 10-hour day scroll forever.
	 */
	const HOUR_HEIGHT = 64;
	const PX_PER_MINUTE = HOUR_HEIGHT / 60;
	const MINUTES_PER_DAY = 1440;

	/** The window a day opens on before the bookings themselves widen it. */
	const DEFAULT_WINDOW = { start: 9 * 60, end: 19 * 60 };

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
	import {
		zonedDateKey,
		zonedMinutesOfDay,
		formatZonedTime,
		minutesToWallClock
	} from '$lib/utils/timezone';
	import { STATUS_BLOCK_CLASS, STATUS_LABEL, occupiesChair } from './status';
	import CalendarOffIcon from '@lucide/svelte/icons/calendar-off';
	import UsersIcon from '@lucide/svelte/icons/users';

	interface Props {
		appointments: Appointment[];
		staff: CalendarStaff[];
		/** The outlet's IANA zone. Every time below is read through it. */
		timeZone: string;
		/** `YYYY-MM-DD`, in the outlet's zone — used only for the "now" marker. */
		dateKey: string;
		onSelect?: (appointment: Appointment) => void;
	}

	let { appointments, staff, timeZone, dateKey, onSelect }: Props = $props();

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
		// A booking may end exactly at midnight, which reads as minute 0 of the
		// following day. The server refuses anything that crosses midnight, so an
		// end at or before the start can only be that boundary case.
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

	const gridHeight = $derived((visible.end - visible.start) * PX_PER_MINUTE);
	const hourMarks = $derived(
		Array.from({ length: (visible.end - visible.start) / 60 + 1 }, (_, i) => visible.start + i * 60)
	);

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
		const cols = staff.map((s) => ({ id: s.id, name: s.name }));

		let hasUnassigned = false;
		for (const appointment of booked) {
			const id = appointment.staffId;
			if (!id) {
				hasUnassigned = true;
			} else if (!cols.some((c) => c.id === id)) {
				cols.push({ id, name: 'Former team member' });
			}
		}

		if (hasUnassigned) cols.push({ id: '', name: 'Unassigned' });
		return cols;
	});

	function columnAppointments(columnId: string): Appointment[] {
		return booked.filter((a) => (a.staffId ?? '') === columnId);
	}

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

	const nowOffset = $derived(
		nowMinutes !== null && nowMinutes >= visible.start && nowMinutes <= visible.end
			? (nowMinutes - visible.start) * PX_PER_MINUTE
			: null
	);
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
	<div class="overflow-x-auto rounded-lg border border-border">
		<div class="flex min-w-max">
			<!-- Time gutter. Sticky so the hours stay readable while scrolling
			     sideways through a large team. -->
			<div class="sticky left-0 z-20 w-16 shrink-0 border-r border-border bg-background">
				<div class="h-10 border-b border-border"></div>
				<div class="relative" style="height: {gridHeight}px">
					{#each hourMarks as mark (mark)}
						<span
							class="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
							style="top: {(mark - visible.start) * PX_PER_MINUTE}px"
						>
							{minutesToWallClock(mark === MINUTES_PER_DAY ? 1439 : mark)}
						</span>
					{/each}
				</div>
			</div>

			{#each columns as column (column.id)}
				<div class="w-44 shrink-0 border-r border-border last:border-r-0">
					<div
						class="flex h-10 items-center border-b border-border bg-muted/40 px-3 text-xs font-medium"
					>
						<span class="truncate" class:text-muted-foreground={column.id === ''}>
							{column.name}
						</span>
					</div>

					<div class="relative" style="height: {gridHeight}px">
						{#each hourMarks as mark (mark)}
							<div
								class="absolute inset-x-0 border-t border-border/60"
								style="top: {(mark - visible.start) * PX_PER_MINUTE}px"
							></div>
						{/each}

						{#if nowOffset !== null}
							<div
								class="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
								style="top: {nowOffset}px"
							></div>
						{/if}

						{#each columnAppointments(column.id) as appointment (appointment.id)}
							{@const top = (startMinutes(appointment) - visible.start) * PX_PER_MINUTE}
							{@const height =
								(endMinutes(appointment) - startMinutes(appointment)) * PX_PER_MINUTE}
							<!-- A positioned surface rather than a <Button>: the block is
							     sized by the booking's duration, so nearly every class the
							     button variants set would have to be overridden. Same
							     pattern as the result rows in `pos/customer-picker.svelte`. -->
							<button
								type="button"
								onclick={() => onSelect?.(appointment)}
								class="absolute inset-x-1 flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md border p-1.5 text-left transition-colors {STATUS_BLOCK_CLASS[
									appointment.status
								]}"
								style="top: {top}px; height: {Math.max(height, 22)}px"
							>
								<span class="truncate text-[11px] leading-tight font-medium">
									{appointment.customer?.name ?? 'Walk-in'}
								</span>
								<span class="truncate text-[10px] leading-tight text-muted-foreground">
									{formatZonedTime(appointment.startAt, timeZone)} ·
									{appointment.services.map((s) => s.name).join(', ') || 'Service'}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
		<span>Status</span>
		{#each LEGEND_STATUSES as status (status)}
			<Badge variant="outline" class="gap-1.5 font-normal">
				<span class="size-2 rounded-full border {STATUS_BLOCK_CLASS[status]}"></span>
				{STATUS_LABEL[status]}
			</Badge>
		{/each}
	</div>
{/if}
