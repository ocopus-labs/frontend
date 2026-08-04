<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import {
		AppointmentDialog,
		BookingDialog,
		DayCalendar,
		WeekCalendar,
		STATUS_BADGE_VARIANT,
		STATUS_LABEL,
		occupiesChair
	} from '$lib/components/appointments';
	import type { GridColumn } from '$lib/components/appointments/calendar/appointment-grid.svelte';
	import { rescheduleAppointment, type Appointment } from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import { canModify } from '$lib/utils/permissions';
	import {
		formatDateKey,
		formatZonedTime,
		shiftDateKey,
		todayInZone,
		zonedDateKey,
		zonedMinutesOfDay,
		minutesToWallClock
	} from '$lib/utils/timezone';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let { data }: { data: PageData } = $props();

	const canBook = $derived(canModify(data.userRole));
	const basePath = $derived(`/${$page.params.business}/${$page.params.slug}`);
	const schedulePath = $derived(`${basePath}/team/schedule`);
	const isToday = $derived(data.date === todayInZone(data.timeZone));

	/**
	 * Cancelled and no-show bookings are kept off the grid — they are the two
	 * statuses that free the chair, so drawing them would show a clash where
	 * there is none. They still matter to the front desk, so they are listed.
	 */
	const released = $derived(data.appointments.filter((a) => !occupiesChair(a.status)));
	const bookedCount = $derived(data.appointments.length - released.length);

	let bookingOpen = $state(false);
	let selected = $state<Appointment | null>(null);
	let detailOpen = $state(false);
	/** The booking whose drag is in flight. Dimmed until the reload settles it. */
	let movingId = $state<string | null>(null);

	// The day and the layout both live in the URL, so back/forward work and a
	// particular week can be linked.
	function goToDate(date: string) {
		goto(`?view=${data.view}&date=${date}`, { keepFocus: true, noScroll: true });
	}

	function goToView(view: 'day' | 'week') {
		goto(`?view=${view}&date=${data.date}`, { keepFocus: true, noScroll: true });
	}

	/** One day at a time in the day view, a whole week in the week view. */
	const step = $derived(data.view === 'week' ? 7 : 1);

	/**
	 * Commit a drag.
	 *
	 * No optimistic move. The server can refuse this — two exclusion constraints
	 * can 409 it, and a completed booking cannot be rescheduled at all — so
	 * showing the booking in its new place before the write lands would mean
	 * animating it back on failure. Instead the block dims where it is, and the
	 * reload afterwards is what moves it. That reload runs whether the write
	 * succeeded or failed, which is also what puts a refused booking back.
	 *
	 * `startMinutes` is a wall clock in the outlet's zone and `column.dateKey` is
	 * an outlet date, which is exactly what `reschedule` takes — the server
	 * composes the instant. Nothing here builds one.
	 */
	async function moveAppointment(
		appointment: Appointment,
		column: GridColumn,
		startMinutes: number
	) {
		const startTime = minutesToWallClock(startMinutes);
		const sameDay = column.dateKey === zonedDateKeyOf(appointment);
		const sameStaff = column.staffId === null || column.staffId === appointment.staffId;
		if (sameDay && sameStaff && startTime === wallClockOf(appointment)) return;

		movingId = appointment.id;
		try {
			await rescheduleAppointment(data.businessId, appointment.id, {
				date: column.dateKey,
				startTime,
				...(column.staffId ? { staffId: column.staffId } : {})
			});
			toast.success('Appointment moved');
		} catch (error) {
			// A clash comes back as a 409 naming whether the stylist or the room
			// collided, written for the front desk. Shown as-is.
			toast.error(userFriendlyError(error, 'Could not move that appointment'));
		} finally {
			movingId = null;
			refresh();
		}
	}

	const zonedDateKeyOf = (a: Appointment) => zonedDateKey(a.startAt, data.timeZone);
	const wallClockOf = (a: Appointment) =>
		minutesToWallClock(zonedMinutesOfDay(a.startAt, data.timeZone));

	function refresh() {
		invalidate('app:appointments');
	}

	function openAppointment(appointment: Appointment) {
		selected = appointment;
		detailOpen = true;
	}
</script>

<PageShell
	title="Appointments"
	description={data.view === 'week'
		? `${formatDateKey(data.from)} – ${formatDateKey(data.to)}`
		: formatDateKey(data.date)}
>
	{#snippet actions()}
		{#if canBook}
			<Button onclick={() => (bookingOpen = true)} disabled={data.services.length === 0}>
				<PlusIcon />
				New appointment
			</Button>
		{/if}
	{/snippet}

	<div class="flex flex-wrap items-center gap-2">
		<Button
			variant="outline"
			size="icon"
			aria-label={data.view === 'week' ? 'Previous week' : 'Previous day'}
			onclick={() => goToDate(shiftDateKey(data.date, -step))}
		>
			<ChevronLeftIcon />
		</Button>
		<Button
			variant="outline"
			size="icon"
			aria-label={data.view === 'week' ? 'Next week' : 'Next day'}
			onclick={() => goToDate(shiftDateKey(data.date, step))}
		>
			<ChevronRightIcon />
		</Button>
		<Button
			variant={isToday ? 'secondary' : 'outline'}
			size="sm"
			onclick={() => goToDate(todayInZone(data.timeZone))}
		>
			Today
		</Button>
		<Input
			type="date"
			value={data.date}
			class="w-40"
			aria-label="Pick a day"
			onchange={(e) => goToDate(e.currentTarget.value)}
		/>
		<div class="flex overflow-hidden rounded-md border border-border">
			<Button
				variant={data.view === 'day' ? 'secondary' : 'ghost'}
				size="sm"
				class="rounded-none border-0"
				onclick={() => goToView('day')}
			>
				Day
			</Button>
			<Button
				variant={data.view === 'week' ? 'secondary' : 'ghost'}
				size="sm"
				class="rounded-none border-0"
				onclick={() => goToView('week')}
			>
				Week
			</Button>
		</div>

		<span class="text-xs text-muted-foreground">
			{bookedCount}
			{bookedCount === 1 ? 'booking' : 'bookings'}
		</span>
	</div>

	{#if data.error}
		<p class="text-sm text-destructive">{data.error}</p>
	{/if}

	{#if data.services.length === 0}
		<p class="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
			Nothing in the catalog can be booked yet — a service needs a duration before it can be put in
			the diary.
		</p>
	{/if}

	{#if data.view === 'week'}
		<WeekCalendar
			appointments={data.appointments}
			timeZone={data.timeZone}
			fromDateKey={data.from}
			canDrag={canBook}
			pendingId={movingId}
			onSelect={openAppointment}
			onMove={moveAppointment}
		/>
	{:else}
		<DayCalendar
			appointments={data.appointments}
			staff={data.staff}
			timeZone={data.timeZone}
			dateKey={data.date}
			canDrag={canBook}
			pendingId={movingId}
			onSelect={openAppointment}
			onMove={moveAppointment}
		/>
	{/if}

	{#if released.length > 0}
		<Collapsible.Root>
			<Collapsible.Trigger>
				{#snippet child({ props })}
					<Button variant="ghost" size="sm" {...props}>
						{released.length} cancelled or no-show
					</Button>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content class="flex flex-col gap-1 pt-2">
				{#each released as appointment (appointment.id)}
					<button
						type="button"
						class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
						onclick={() => openAppointment(appointment)}
					>
						<span class="w-16 shrink-0 text-muted-foreground tabular-nums">
							{formatZonedTime(appointment.startAt, data.timeZone)}
						</span>
						<span class="min-w-0 flex-1 truncate">
							{appointment.customer?.name ?? 'Walk-in'} ·
							{appointment.services.map((s) => s.name).join(', ')}
						</span>
						<Badge variant={STATUS_BADGE_VARIANT[appointment.status]} class="shrink-0">
							{STATUS_LABEL[appointment.status]}
						</Badge>
					</button>
				{/each}
			</Collapsible.Content>
		</Collapsible.Root>
	{/if}
</PageShell>

<BookingDialog
	bind:open={bookingOpen}
	businessId={data.businessId}
	timeZone={data.timeZone}
	dateKey={data.date}
	services={data.services}
	staff={data.staff}
	{schedulePath}
	onBooked={refresh}
/>

<AppointmentDialog
	bind:open={detailOpen}
	businessId={data.businessId}
	timeZone={data.timeZone}
	{basePath}
	currency={data.currency}
	appointment={selected}
	staff={data.staff}
	onChanged={refresh}
/>
