<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
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
	import { EmptyState, StatusPill } from '$lib/components/data-display';
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
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	let reservations = $state<Reservation[]>(data.reservations || []);
	let tables = $state<TableType[]>(data.tables || []);
	let searchQuery = $state('');
	let dateFilter = $state('upcoming');
	let statusFilter = $state<'all' | ReservationStatus>('all');
	let showAddDialog = $state(false);
	let editingReservation = $state<Reservation | null>(null);
	let isSubmitting = $state(false);

	// Confirm dialog state
	let cancelDialogOpen = $state(false);
	let cancelTargetId = $state('');
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

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

	// Display labels for filter selects
	const dateFilterLabel = $derived(
		({ today: 'Today', upcoming: 'Upcoming', past: 'Past', all: 'All Time' } as Record<string, string>)[dateFilter] || dateFilter
	);

	const statusFilterLabel = $derived(
		({ all: 'All Status', confirmed: 'Confirmed', pending: 'Pending', seated: 'Seated', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>)[statusFilter] || statusFilter
	);

	// Display label for table selects
	const newReservationTableLabel = $derived(
		newReservation.tableId
			? (tables.find((t) => t.id === newReservation.tableId)?.displayName || 'Select table')
			: 'Select table'
	);

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
				return { variant: 'default' as const, text: 'Seated', class: 'bg-info/10 text-info' };
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
			toast.error(userFriendlyError(error, 'Failed to create reservation'));
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
			toast.error(userFriendlyError(error, 'Failed to confirm reservation'));
		}
	}

	function handleCancel(id: string) {
		cancelTargetId = id;
		cancelDialogOpen = true;
	}

	async function confirmCancel(reason?: string) {
		try {
			const result = await cancelReservationApi(data.businessId, cancelTargetId, reason || undefined);
			reservations = reservations.map((r) => (r.id === cancelTargetId ? result.reservation : r));
			toast.success('Reservation cancelled');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to cancel reservation'));
		}
	}

	function handleDelete(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		try {
			await deleteReservationApi(data.businessId, deleteTargetId);
			reservations = reservations.filter((r) => r.id !== deleteTargetId);
			toast.success('Reservation deleted');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete reservation'));
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
			toast.error(userFriendlyError(error, 'Failed to update reservation'));
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
						<div class="text-2xl font-bold text-warning">{stats.pending}</div>
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
					<Select.Root type="single" bind:value={dateFilter}>
						<Select.Trigger class="w-[140px]">
							{dateFilterLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="today">Today</Select.Item>
							<Select.Item value="upcoming">Upcoming</Select.Item>
							<Select.Item value="past">Past</Select.Item>
							<Select.Item value="all">All Time</Select.Item>
						</Select.Content>
					</Select.Root>

					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger class="w-[140px]">
							{statusFilterLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Status</Select.Item>
							<Select.Item value="confirmed">Confirmed</Select.Item>
							<Select.Item value="pending">Pending</Select.Item>
							<Select.Item value="seated">Seated</Select.Item>
							<Select.Item value="completed">Completed</Select.Item>
							<Select.Item value="cancelled">Cancelled</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Reservations Table -->
			{#if filteredReservations.length > 0}
				<div class="px-6">
					<div class="overflow-x-auto rounded-md border">
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
											<StatusPill
												label={getStatusBadge(reservation.status).text}
												status={({ confirmed: "success", pending: "warning", cancelled: "error", completed: "info", no_show: "neutral", seated: "primary" } as Record<string, "success" | "warning" | "error" | "info" | "neutral" | "primary">)[reservation.status] || 'neutral'}
											/>
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
														size="icon"
														class="h-8 w-8 p-0 text-success"
														onclick={() => handleConfirm(reservation.id)}
													aria-label="Confirm reservation"
													>
														<IconCheck class="h-4 w-4" />
													</Button>
												{/if}
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 p-0"
													onclick={() => editReservation(reservation)}
												aria-label="Edit reservation"
												>
													<IconPencil class="h-4 w-4" />
												</Button>
												{#if reservation.status !== 'cancelled' && reservation.status !== 'completed'}
													<Button
														variant="ghost"
														size="icon"
														class="h-8 w-8 p-0 text-destructive"
														onclick={() => handleCancel(reservation.id)}
													aria-label="Cancel reservation"
													>
														<IconX class="h-4 w-4" />
													</Button>
												{/if}
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 p-0 text-destructive"
													onclick={() => handleDelete(reservation.id)}
												aria-label="Delete reservation"
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
				<EmptyState
					type={reservations.length === 0 ? 'empty' : 'no-results'}
					title={reservations.length === 0 ? 'No reservations yet' : 'No reservations found'}
					description={reservations.length === 0 ? 'Create your first reservation to get started.' : 'Try adjusting your filters.'}
					actionLabel="New Reservation"
					onAction={() => (showAddDialog = true)}
				/>
			{/if}
			<div class="px-6">
						<div class="flex items-center justify-between border-t pt-4">
				<p class="text-sm text-muted-foreground">
					Showing {Math.min((data.page - 1) * data.limit + 1, data.total)} to {Math.min(data.page * data.limit, data.total)} of {data.total} results
				</p>
				<div class="flex gap-1">
					<Button size="sm" variant="outline" disabled={data.page <= 1}
						onclick={() => goto(`?page=${data.page - 1}&limit=${data.limit}`)}>Previous</Button>
					<Button size="sm" variant="outline" disabled={data.page >= data.totalPages}
						onclick={() => goto(`?page=${data.page + 1}&limit=${data.limit}`)}>Next</Button>
				</div>
			</div>
			</div>
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
					<Input id="name" autofocus bind:value={newReservation.customerName} placeholder="Name" />
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
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium">Table</label>
					<Select.Root type="single" bind:value={newReservation.tableId}>
						<Select.Trigger class="w-full">
							{newReservationTableLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">Select table</Select.Item>
							{#each tables as table}
								<Select.Item value={table.id}>{table.displayName}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
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
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
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
						<Input id="edit-name" autofocus bind:value={editingReservation.customerName} />
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
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-sm font-medium">Table</label>
						<Select.Root type="single" bind:value={editingReservation.tableId}>
							<Select.Trigger class="w-full">
								{editingReservation.tableId ? (tables.find((t) => t.id === editingReservation?.tableId)?.displayName || 'Select table') : 'Select table'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">Select table</Select.Item>
								{#each tables as table}
									<Select.Item value={table.id}>{table.displayName}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
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
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={cancelDialogOpen}
	title="Cancel Reservation"
	description="Are you sure you want to cancel this reservation? You can optionally provide a reason."
	confirmLabel="Cancel Reservation"
	variant="destructive"
	showInput={true}
	inputLabel="Cancellation reason"
	inputPlaceholder="Enter reason (optional)"
	onConfirm={confirmCancel}
/>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Reservation"
	description="Are you sure you want to delete this reservation? This action cannot be undone."
	confirmLabel="Delete Reservation"
	variant="destructive"
	onConfirm={confirmDelete}
/>
