<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import {
		rescheduleAppointment,
		updateAppointmentStatus,
		type Appointment,
		type AppointmentStatus
	} from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import {
		formatZonedTime,
		zonedDateKey,
		zonedMinutesOfDay,
		minutesToWallClock
	} from '$lib/utils/timezone';
	import {
		ALLOWED_TRANSITIONS,
		STATUS_BADGE_VARIANT,
		STATUS_LABEL,
		TRANSITION_LABEL,
		canReschedule
	} from './status';
	import type { CalendarStaff } from './day-calendar.svelte';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		open: boolean;
		businessId: string;
		timeZone: string;
		appointment: Appointment | null;
		staff: CalendarStaff[];
		onChanged?: () => void;
	}

	let {
		open = $bindable(false),
		businessId,
		timeZone,
		appointment,
		staff,
		onChanged
	}: Props = $props();

	let pending = $state<AppointmentStatus | null>(null);
	let reason = $state('');
	let moving = $state(false);
	let moveDate = $state('');
	let moveTime = $state('');
	let moveStaffId = $state('');

	// Seed the reschedule fields from the booking every time one is opened.
	$effect(() => {
		if (!open || !appointment) return;
		moveDate = zonedDateKey(appointment.startAt, timeZone);
		moveTime = minutesToWallClock(zonedMinutesOfDay(appointment.startAt, timeZone));
		moveStaffId = appointment.staffId ?? '';
		reason = '';
	});

	const transitions = $derived(appointment ? ALLOWED_TRANSITIONS[appointment.status] : []);
	const total = $derived(
		appointment ? appointment.services.reduce((sum, s) => sum + s.durationMinutes, 0) : 0
	);
	/** Cancelling or marking a no-show is where a reason is worth capturing. */
	const wantsReason = $derived(
		pending !== null && (pending === 'cancelled' || pending === 'no_show')
	);

	async function applyStatus(status: AppointmentStatus) {
		if (!appointment) return;
		pending = status;
		try {
			await updateAppointmentStatus(businessId, appointment.id, {
				status,
				...(reason.trim() ? { reason: reason.trim() } : {})
			});
			toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}`);
			open = false;
			onChanged?.();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Could not update that appointment'));
		} finally {
			pending = null;
		}
	}

	async function move() {
		if (!appointment) return;
		moving = true;
		try {
			await rescheduleAppointment(businessId, appointment.id, {
				date: moveDate,
				startTime: moveTime,
				...(moveStaffId ? { staffId: moveStaffId } : {})
			});
			toast.success('Appointment moved');
			open = false;
			onChanged?.();
		} catch (error) {
			// A clash comes back as a 409 from the exclusion constraint with a
			// message written for the front desk, so it is shown as-is.
			toast.error(userFriendlyError(error, 'Could not move that appointment'));
		} finally {
			moving = false;
		}
	}

	function staffName(id: string | null): string {
		if (!id) return 'Unassigned';
		return staff.find((s) => s.id === id)?.name ?? 'Former team member';
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-md">
		{#if appointment}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					{appointment.customer?.name ?? 'Walk-in'}
					<Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
						{STATUS_LABEL[appointment.status]}
					</Badge>
				</Dialog.Title>
				<Dialog.Description>
					{formatZonedTime(appointment.startAt, timeZone)} – {formatZonedTime(
						appointment.endAt,
						timeZone
					)} · {total} min · {staffName(appointment.staffId)}
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-1 text-sm">
				{#each appointment.services as service (service.menuItemId)}
					<div class="flex items-baseline justify-between gap-3">
						<span class="truncate">{service.name}</span>
						<span class="shrink-0 text-xs text-muted-foreground">
							{service.durationMinutes} min
						</span>
					</div>
				{/each}
			</div>

			{#if appointment.notes}
				<p class="rounded-md bg-muted p-2 text-xs text-muted-foreground">{appointment.notes}</p>
			{/if}

			{#if appointment.cancellationReason}
				<p class="text-xs text-destructive">{appointment.cancellationReason}</p>
			{/if}

			<p class="text-[11px] text-muted-foreground">
				{appointment.appointmentNumber} · booked via {appointment.source.replace('_', ' ')}
			</p>

			{#if transitions.length > 0}
				<Separator />
				{#if wantsReason}
					<Field.Field>
						<Field.Label for="appointment-reason">Reason (optional)</Field.Label>
						<Input id="appointment-reason" bind:value={reason} placeholder="Called to cancel" />
					</Field.Field>
				{/if}
				<div class="flex flex-wrap gap-1.5">
					{#each transitions as status (status)}
						<Button
							variant={status === 'cancelled' || status === 'no_show' ? 'destructive' : 'outline'}
							size="sm"
							disabled={pending !== null}
							onclick={() => applyStatus(status)}
						>
							{#if pending === status}
								<Loader2Icon class="size-3 animate-spin" />
							{/if}
							{TRANSITION_LABEL[status]}
						</Button>
					{/each}
				</div>
			{/if}

			{#if canReschedule(appointment.status)}
				<Separator />
				<!--
					A free time entry rather than the slot grid the booking dialog uses.
					Availability lists what is *free*, and this booking is occupying its
					own slot — so its current time would be missing from the grid and
					moving it by ten minutes would look impossible. The exclusion
					constraint is the authority either way: a real clash comes back as a
					409 with a message for the front desk.
				-->
				<Field.Group>
					<Field.Field>
						<Field.Label for="move-date">Move to</Field.Label>
						<div class="flex gap-2">
							<Input id="move-date" type="date" bind:value={moveDate} class="flex-1" />
							<Input type="time" bind:value={moveTime} class="w-28" aria-label="New time" />
						</div>
					</Field.Field>
					<Field.Field>
						<Field.Label for="move-staff">With</Field.Label>
						<NativeSelect id="move-staff" bind:value={moveStaffId} class="w-full">
							<NativeSelectOption value="">Unassigned</NativeSelectOption>
							{#each staff as member (member.id)}
								<NativeSelectOption value={member.id}>{member.name}</NativeSelectOption>
							{/each}
						</NativeSelect>
					</Field.Field>
				</Field.Group>
				<Button variant="secondary" onclick={move} disabled={moving || !moveDate || !moveTime}>
					{#if moving}
						<Loader2Icon class="size-3.5 animate-spin" />
					{/if}
					Reschedule
				</Button>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
