<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CustomerPicker from '$lib/components/pos/customer-picker.svelte';
	import {
		getAvailability,
		createAppointment,
		type AvailabilitySlot,
		type Customer
	} from '$lib/api';
	import type { MenuItem } from '$lib/types/menu';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import { zonedMinutesOfDay, minutesToWallClock, formatDateKey } from '$lib/utils/timezone';
	import type { CalendarStaff } from './day-calendar.svelte';
	import CalendarXIcon from '@lucide/svelte/icons/calendar-x';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		open: boolean;
		businessId: string;
		/** The outlet's IANA zone — the slot times below are read in it. */
		timeZone: string;
		/** Day the calendar is showing; the dialog opens on it. */
		dateKey: string;
		/** Catalog rows that can be booked, i.e. those with a duration. */
		services: MenuItem[];
		staff: CalendarStaff[];
		/** Path to the roster, for when the day has no shifts to book against. */
		schedulePath: string;
		onBooked?: () => void;
	}

	let {
		open = $bindable(false),
		businessId,
		timeZone,
		dateKey,
		services,
		staff,
		schedulePath,
		onBooked
	}: Props = $props();

	let serviceId = $state('');
	let staffId = $state('');
	// Seeded from `dateKey` by the reset effect below rather than here, so
	// reopening the dialog follows the calendar instead of the day it first
	// mounted on.
	let date = $state('');
	let customer = $state<Customer | null>(null);
	let notes = $state('');
	let selectedTime = $state('');
	let slots = $state<AvailabilitySlot[]>([]);
	let loadingSlots = $state(false);
	let slotError = $state('');
	let booking = $state(false);

	const selectedService = $derived(services.find((s) => s.id === serviceId));

	/**
	 * Slots come back one per staff member per time. The front desk picks a time
	 * first and a person second, so they are collapsed onto the wall clock and
	 * the candidates kept alongside — "10:30, 3 free" rather than three 10:30s.
	 */
	const times = $derived.by(() => {
		// A plain array rather than a Map: `svelte/prefer-svelte-reactivity` bans
		// the built-in inside a component, and a SvelteMap would be reactive
		// machinery around a value that is rebuilt from scratch on every change.
		const groups: { time: string; candidates: AvailabilitySlot[] }[] = [];
		for (const slot of slots) {
			const time = minutesToWallClock(zonedMinutesOfDay(slot.startAt, timeZone));
			const existing = groups.find((g) => g.time === time);
			if (existing) existing.candidates.push(slot);
			else groups.push({ time, candidates: [slot] });
		}
		return groups.sort((a, b) => a.time.localeCompare(b.time));
	});

	const chosen = $derived(times.find((t) => t.time === selectedTime));

	// Reset when the dialog is opened, so a previous booking's leftovers never
	// become the next customer's appointment.
	$effect(() => {
		if (!open) return;
		serviceId = '';
		staffId = '';
		date = dateKey;
		customer = null;
		notes = '';
		selectedTime = '';
		slots = [];
		slotError = '';
	});

	$effect(() => {
		const service = serviceId;
		const day = date;
		const only = staffId;
		if (!open || !service || !day) {
			slots = [];
			return;
		}

		let cancelled = false;
		loadingSlots = true;
		slotError = '';
		selectedTime = '';

		getAvailability(businessId, {
			date: day,
			serviceId: service,
			...(only ? { staffId: only } : {})
		})
			.then((result) => {
				if (cancelled) return;
				slots = result.slots;
			})
			.catch((error: unknown) => {
				if (cancelled) return;
				slots = [];
				slotError = userFriendlyError(error, 'Could not load available times');
			})
			.finally(() => {
				if (!cancelled) loadingSlots = false;
			});

		return () => {
			cancelled = true;
		};
	});

	async function book() {
		if (!serviceId) {
			toast.error('Pick a service');
			return;
		}
		if (!chosen) {
			toast.error('Pick a time');
			return;
		}

		booking = true;
		try {
			await createAppointment(businessId, {
				date,
				startTime: chosen.time,
				services: [{ menuItemId: serviceId }],
				// The slot carries the person it belongs to. Booking the time
				// without them would leave the appointment unassigned, and an
				// unassigned booking holds no chair — the exclusion constraint
				// only applies where `staff_id` is not null.
				staffId: chosen.candidates[0].staffId,
				// And the room, when the service needs one. Sent back rather
				// than left to the server to re-pick: the slot was offered on
				// the basis that *this* room was free, and re-deriving it a
				// moment later could land the booking somewhere else.
				...(chosen.candidates[0].resourceId ? { resourceId: chosen.candidates[0].resourceId } : {}),
				...(customer ? { customerId: customer.id } : {}),
				...(notes.trim() ? { notes: notes.trim() } : {})
			});
			toast.success('Appointment booked');
			open = false;
			onBooked?.();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Could not book that appointment'));
		} finally {
			booking = false;
		}
	}

	function staffName(id: string): string {
		return staff.find((s) => s.id === id)?.name ?? 'Team member';
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>New appointment</Dialog.Title>
			<Dialog.Description>
				Times are shown in the business's own timezone ({timeZone}).
			</Dialog.Description>
		</Dialog.Header>

		<Field.Group>
			<Field.Field>
				<Field.Label for="booking-service">Service</Field.Label>
				<NativeSelect id="booking-service" bind:value={serviceId} class="w-full">
					<NativeSelectOption value="">Choose a service…</NativeSelectOption>
					{#each services as service (service.id)}
						<NativeSelectOption value={service.id}>
							{service.name} · {service.durationMinutes} min
						</NativeSelectOption>
					{/each}
				</NativeSelect>
				{#if services.length === 0}
					<Field.Description>
						No service in the catalog has a duration yet. A service needs one before it can be
						booked.
					</Field.Description>
				{/if}
			</Field.Field>

			<Field.Field>
				<Field.Label for="booking-staff">With</Field.Label>
				<NativeSelect id="booking-staff" bind:value={staffId} class="w-full">
					<NativeSelectOption value="">Anyone available</NativeSelectOption>
					{#each staff as member (member.id)}
						<NativeSelectOption value={member.id}>{member.name}</NativeSelectOption>
					{/each}
				</NativeSelect>
			</Field.Field>

			<Field.Field>
				<Field.Label for="booking-date">Date</Field.Label>
				<Input id="booking-date" type="date" bind:value={date} />
				<Field.Description>{formatDateKey(date)}</Field.Description>
			</Field.Field>
		</Field.Group>

		{#if serviceId}
			<div class="flex flex-col gap-2">
				<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					Available times
				</span>

				{#if loadingSlots}
					<div class="grid grid-cols-4 gap-1.5">
						{#each Array.from({ length: 12 }, (_, i) => i) as placeholder (placeholder)}
							<Skeleton class="h-8 w-full" />
						{/each}
					</div>
				{:else if slotError}
					<p class="text-xs text-destructive">{slotError}</p>
				{:else if times.length === 0}
					<div
						class="flex flex-col items-center gap-2 rounded-md border border-dashed p-4 text-center"
					>
						<CalendarXIcon class="size-5 text-muted-foreground" />
						<p class="text-xs text-muted-foreground">
							Nothing free on {formatDateKey(date)}.
						</p>
						<!-- Almost always the roster rather than a full diary: availability
						     is built from each person's shifts for the day, so a team with
						     no shifts booked has no bookable time at all. -->
						<p class="text-xs text-muted-foreground">
							Availability comes from the roster — if nobody is rostered on this day, there is
							nothing to offer.
						</p>
						<Button variant="outline" size="sm" href={schedulePath}>Open the roster</Button>
					</div>
				{:else}
					<div class="grid grid-cols-4 gap-1.5">
						{#each times as option (option.time)}
							<Button
								variant={selectedTime === option.time ? 'default' : 'outline'}
								size="sm"
								class="h-8 flex-col gap-0 tabular-nums"
								onclick={() => (selectedTime = option.time)}
							>
								<span>{option.time}</span>
								{#if !staffId && option.candidates.length > 1}
									<span class="text-[9px] opacity-70">{option.candidates.length} free</span>
								{/if}
							</Button>
						{/each}
					</div>
					{#if chosen}
						<p class="text-xs text-muted-foreground">
							{chosen.time} with {staffName(chosen.candidates[0].staffId)}
							{#if selectedService}
								· {selectedService.durationMinutes} min
							{/if}
						</p>
					{/if}
				{/if}
			</div>
		{/if}

		<CustomerPicker {businessId} bind:selectedCustomer={customer} />

		<Field.Field>
			<Field.Label for="booking-notes">Notes</Field.Label>
			<Textarea
				id="booking-notes"
				bind:value={notes}
				rows={2}
				placeholder="Anything the stylist should know"
			/>
			<Field.Description>
				Operational notes only — contact details belong on the customer record, which encrypts them.
			</Field.Description>
		</Field.Field>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={book} disabled={booking || !chosen}>
				{#if booking}
					<Loader2Icon class="size-3.5 animate-spin" />
				{/if}
				Book
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
