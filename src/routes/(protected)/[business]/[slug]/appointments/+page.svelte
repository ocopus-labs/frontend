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
		STATUS_BADGE_VARIANT,
		STATUS_LABEL,
		occupiesChair
	} from '$lib/components/appointments';
	import type { Appointment } from '$lib/api';
	import { canModify } from '$lib/utils/permissions';
	import { formatDateKey, formatZonedTime, shiftDateKey, todayInZone } from '$lib/utils/timezone';
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

	// The day lives in the URL, so back/forward work and a day can be linked.
	function goToDate(date: string) {
		goto(`?date=${date}`, { keepFocus: true, noScroll: true });
	}

	function refresh() {
		invalidate('app:appointments');
	}

	function openAppointment(appointment: Appointment) {
		selected = appointment;
		detailOpen = true;
	}
</script>

<PageShell title="Appointments" description={formatDateKey(data.date)}>
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
			aria-label="Previous day"
			onclick={() => goToDate(shiftDateKey(data.date, -1))}
		>
			<ChevronLeftIcon />
		</Button>
		<Button
			variant="outline"
			size="icon"
			aria-label="Next day"
			onclick={() => goToDate(shiftDateKey(data.date, 1))}
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

	<DayCalendar
		appointments={data.appointments}
		staff={data.staff}
		timeZone={data.timeZone}
		dateKey={data.date}
		onSelect={openAppointment}
	/>

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
