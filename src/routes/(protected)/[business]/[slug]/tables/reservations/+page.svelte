<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2 } from '@lucide/svelte';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconSearch,
		IconCalendar,
		IconUsers,
		IconPhone,
		IconCheck,
		IconX
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		createReservation,
		updateReservation,
		confirmReservation as confirmReservationApi,
		cancelReservation as cancelReservationApi,
		deleteReservation as deleteReservationApi,
		type Reservation,
		type ReservationStatus,
		type Table as TableType,
		type CreateReservationPayload
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let reservations = $state<Reservation[]>(data.reservations || []);
	let tables = $state<TableType[]>(data.tables || []);
	let searchQuery = $state('');
	let dateFilter = $state('upcoming');
	let statusFilter = $state<'all' | ReservationStatus>('all');
	let showAddDialog = $state(false);
	let editingReservation = $state<Reservation | null>(null);
	let isSubmitting = $state(false);

	let newReservation = $state<{
		customerName: string;
		customerPhone: string;
		customerEmail: string;
		reservationDate: string;
		reservationTime: string;
		partySize: number;
		tableId: string;
		notes: string;
	}>({
		customerName: '',
		customerPhone: '',
		customerEmail: '',
		reservationDate: '',
		reservationTime: '',
		partySize: 2,
		tableId: '',
		notes: ''
	});

	const today = new Date().toISOString().split('T')[0];

	const stats = $derived({
		today: reservations.filter((r) => r.reservationDate === today && r.status !== 'cancelled').length,
		upcoming: reservations.filter((r) => r.reservationDate > today && r.status !== 'cancelled').length,
		pending: reservations.filter((r) => r.status === 'pending').length
	});

	const filteredReservations = $derived(
		reservations.filter((res) => {
			const matchesSearch =
				res.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(res.customerPhone?.includes(searchQuery) ?? false);

			const matchesStatus = statusFilter === 'all' || res.status === statusFilter;

			let matchesDate = true;
			if (dateFilter === 'today') {
				matchesDate = res.reservationDate === today;
			} else if (dateFilter === 'upcoming') {
				matchesDate = res.reservationDate >= today;
			} else if (dateFilter === 'past') {
				matchesDate = res.reservationDate < today;
			}

			return matchesSearch && matchesStatus && matchesDate;
		})
	);

	function getTableName(tableId?: string): string {
		if (!tableId) return 'Not assigned';
		return tables.find((t) => t.id === tableId)?.displayName || tableId;
	}

	function getStatusBadge(status: ReservationStatus) {
		switch (status) {
			case 'confirmed':
				return { variant: 'default' as const, text: 'Confirmed' };
			case 'pending':
				return { variant: 'secondary' as const, text: 'Pending' };
			case 'seated':
				return { variant: 'default' as const, text: 'Seated', class: 'bg-blue-100 text-blue-800' };
			case 'completed':
				return { variant: 'outline' as const, text: 'Completed' };
			case 'cancelled':
				return { variant: 'destructive' as const, text: 'Cancelled' };
			case 'no_show':
				return { variant: 'destructive' as const, text: 'No Show' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function addReservation() {
		if (!newReservation.customerName.trim() || !newReservation.reservationDate || !newReservation.reservationTime) {
			toast.error('Please fill in all required fields');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateReservationPayload = {
				customerName: newReservation.customerName,
				customerPhone: newReservation.customerPhone || undefined,
				customerEmail: newReservation.customerEmail || undefined,
				reservationDate: newReservation.reservationDate,
				reservationTime: newReservation.reservationTime,
				partySize: newReservation.partySize,
				tableId: newReservation.tableId || undefined,
				notes: newReservation.notes || undefined
			};

			const result = await createReservation(data.businessId, payload);
			reservations = [...reservations, result.reservation];
			toast.success('Reservation created successfully');
			showAddDialog = false;
			newReservation = {
				customerName: '',
				customerPhone: '',
				customerEmail: '',
				reservationDate: '',
				reservationTime: '',
				partySize: 2,
				tableId: '',
				notes: ''
			};
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create reservation');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleConfirm(id: string) {
		try {
			const result = await confirmReservationApi(data.businessId, id);
			reservations = reservations.map((r) => (r.id === id ? result.reservation : r));
			toast.success('Reservation confirmed');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to confirm reservation');
		}
	}

	async function handleCancel(id: string) {
		const reason = prompt('Please enter cancellation reason (optional):');
		try {
			const result = await cancelReservationApi(data.businessId, id, reason || undefined);
			reservations = reservations.map((r) => (r.id === id ? result.reservation : r));
			toast.success('Reservation cancelled');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to cancel reservation');
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this reservation?')) return;
		try {
			await deleteReservationApi(data.businessId, id);
			reservations = reservations.filter((r) => r.id !== id);
			toast.success('Reservation deleted');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete reservation');
		}
	}

	function editReservation(reservation: Reservation) {
		editingReservation = { ...reservation };
	}

	async function saveReservation() {
		if (!editingReservation) return;

		isSubmitting = true;
		try {
			const result = await updateReservation(data.businessId, editingReservation.id, {
				customerName: editingReservation.customerName,
				customerPhone: editingReservation.customerPhone,
				customerEmail: editingReservation.customerEmail,
				reservationDate: editingReservation.reservationDate,
				reservationTime: editingReservation.reservationTime,
				partySize: editingReservation.partySize,
				tableId: editingReservation.tableId,
				notes: editingReservation.notes
			});
			reservations = reservations.map((r) => (r.id === editingReservation!.id ? result.reservation : r));
			toast.success('Reservation updated');
			editingReservation = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update reservation');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Reservations</h1>
					<p class="text-muted-foreground">Manage table reservations</p>
				</div>
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					New Reservation
				</Button>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-3 gap-4 px-6">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Today</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.today}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Upcoming</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.upcoming}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Pending</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-yellow-600">{stats.pending}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<div class="relative max-w-sm flex-1">
					<IconSearch
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input placeholder="Search reservations..." bind:value={searchQuery} class="pl-9" />
				</div>

				<div class="flex gap-2">
					<select
						bind:value={dateFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="today">Today</option>
						<option value="upcoming">Upcoming</option>
						<option value="past">Past</option>
						<option value="all">All Time</option>
					</select>

					<select
						bind:value={statusFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Status</option>
						<option value="confirmed">Confirmed</option>
						<option value="pending">Pending</option>
						<option value="seated">Seated</option>
						<option value="completed">Completed</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</div>
			</div>

			<!-- Reservations Table -->
			{#if filteredReservations.length > 0}
				<div class="px-6">
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Customer</Table.Head>
									<Table.Head>Date & Time</Table.Head>
									<Table.Head>Party Size</Table.Head>
									<Table.Head>Table</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Notes</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredReservations as reservation (reservation.id)}
									<Table.Row>
										<Table.Cell>
											<div>
												<div class="font-medium">{reservation.customerName}</div>
												{#if reservation.customerPhone}
													<div class="flex items-center gap-1 text-sm text-muted-foreground">
														<IconPhone class="h-3 w-3" />
														{reservation.customerPhone}
													</div>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-1">
												<IconCalendar class="h-4 w-4 text-muted-foreground" />
												<div>
													<div>{formatDate(reservation.reservationDate)}</div>
													<div class="text-sm text-muted-foreground">{reservation.reservationTime}</div>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-1">
												<IconUsers class="h-4 w-4 text-muted-foreground" />
												{reservation.partySize}
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline">{getTableName(reservation.tableId)}</Badge>
										</Table.Cell>
										<Table.Cell>
											<Badge variant={getStatusBadge(reservation.status).variant}>
												{getStatusBadge(reservation.status).text}
											</Badge>
										</Table.Cell>
										<Table.Cell>
											<span class="max-w-[150px] truncate text-sm text-muted-foreground">
												{reservation.notes || '-'}
											</span>
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												{#if reservation.status === 'pending'}
													<Button
														variant="ghost"
														size="sm"
														class="h-8 w-8 p-0 text-green-600"
														onclick={() => handleConfirm(reservation.id)}
													>
														<IconCheck class="h-4 w-4" />
													</Button>
												{/if}
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => editReservation(reservation)}
												>
													<IconPencil class="h-4 w-4" />
												</Button>
												{#if reservation.status !== 'cancelled' && reservation.status !== 'completed'}
													<Button
														variant="ghost"
														size="sm"
														class="h-8 w-8 p-0 text-destructive"
														onclick={() => handleCancel(reservation.id)}
													>
														<IconX class="h-4 w-4" />
													</Button>
												{/if}
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive"
													onclick={() => handleDelete(reservation.id)}
												>
													<IconTrash class="h-4 w-4" />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconCalendar class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No reservations found</h3>
					<p class="text-muted-foreground">Try adjusting your filters or create a new reservation.</p>
					<Button class="mt-4" onclick={() => (showAddDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						New Reservation
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Reservation Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>New Reservation</Dialog.Title>
			<Dialog.Description>Create a new table reservation</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="name" class="text-sm font-medium">Customer Name *</label>
					<Input id="name" bind:value={newReservation.customerName} placeholder="Name" />
				</div>
				<div class="grid gap-2">
					<label for="phone" class="text-sm font-medium">Phone</label>
					<Input id="phone" bind:value={newReservation.customerPhone} placeholder="+1 555-0123" />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="email" class="text-sm font-medium">Email</label>
				<Input id="email" type="email" bind:value={newReservation.customerEmail} placeholder="email@example.com" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="date" class="text-sm font-medium">Date *</label>
					<Input id="date" type="date" bind:value={newReservation.reservationDate} />
				</div>
				<div class="grid gap-2">
					<label for="time" class="text-sm font-medium">Time *</label>
					<Input id="time" type="time" bind:value={newReservation.reservationTime} />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="party" class="text-sm font-medium">Party Size</label>
					<Input id="party" type="number" min="1" max="20" bind:value={newReservation.partySize} />
				</div>
				<div class="grid gap-2">
					<label for="table" class="text-sm font-medium">Table</label>
					<select
						id="table"
						bind:value={newReservation.tableId}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Select table</option>
						{#each tables as table}
							<option value={table.id}>{table.displayName}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid gap-2">
				<label for="notes" class="text-sm font-medium">Notes</label>
				<Input id="notes" bind:value={newReservation.notes} placeholder="Special requests..." />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>Cancel</Button>
			<Button onclick={addReservation} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Reservation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Reservation Dialog -->
<Dialog.Root open={!!editingReservation} onOpenChange={(open) => !open && (editingReservation = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Reservation</Dialog.Title>
			<Dialog.Description>Update reservation details</Dialog.Description>
		</Dialog.Header>
		{#if editingReservation}
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-name" class="text-sm font-medium">Customer Name</label>
						<Input id="edit-name" bind:value={editingReservation.customerName} />
					</div>
					<div class="grid gap-2">
						<label for="edit-phone" class="text-sm font-medium">Phone</label>
						<Input id="edit-phone" bind:value={editingReservation.customerPhone} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-date" class="text-sm font-medium">Date</label>
						<Input id="edit-date" type="date" bind:value={editingReservation.reservationDate} />
					</div>
					<div class="grid gap-2">
						<label for="edit-time" class="text-sm font-medium">Time</label>
						<Input id="edit-time" type="time" bind:value={editingReservation.reservationTime} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-party" class="text-sm font-medium">Party Size</label>
						<Input id="edit-party" type="number" min="1" max="20" bind:value={editingReservation.partySize} />
					</div>
					<div class="grid gap-2">
						<label for="edit-table" class="text-sm font-medium">Table</label>
						<select
							id="edit-table"
							bind:value={editingReservation.tableId}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">Select table</option>
							{#each tables as table}
								<option value={table.id}>{table.displayName}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-notes" class="text-sm font-medium">Notes</label>
					<Input id="edit-notes" bind:value={editingReservation.notes} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingReservation = null)} disabled={isSubmitting}>Cancel</Button>
				<Button onclick={saveReservation} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
