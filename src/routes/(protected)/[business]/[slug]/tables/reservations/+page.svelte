<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
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

	// Dummy reservations data
	let reservations = $state([
		{
			id: 1,
			customerName: 'Smith Family',
			phone: '+1 555-0123',
			email: 'smith@email.com',
			date: '2024-11-06',
			time: '18:00',
			partySize: 4,
			table: 'T-04',
			status: 'confirmed',
			notes: 'Anniversary dinner, need cake'
		},
		{
			id: 2,
			customerName: 'Johnson Party',
			phone: '+1 555-0456',
			email: 'johnson@email.com',
			date: '2024-11-06',
			time: '19:00',
			partySize: 6,
			table: 'P-03',
			status: 'confirmed',
			notes: 'Birthday celebration'
		},
		{
			id: 3,
			customerName: 'Corporate Event',
			phone: '+1 555-0789',
			email: 'corp@business.com',
			date: '2024-11-06',
			time: '19:30',
			partySize: 10,
			table: 'VIP-01',
			status: 'confirmed',
			notes: 'Business dinner, need private area'
		},
		{
			id: 4,
			customerName: 'Davis Couple',
			phone: '+1 555-0111',
			email: 'davis@email.com',
			date: '2024-11-07',
			time: '18:30',
			partySize: 2,
			table: 'T-01',
			status: 'pending',
			notes: ''
		},
		{
			id: 5,
			customerName: 'Wilson Group',
			phone: '+1 555-0222',
			email: 'wilson@email.com',
			date: '2024-11-07',
			time: '20:00',
			partySize: 8,
			table: 'T-07',
			status: 'pending',
			notes: 'Vegetarian options needed'
		},
		{
			id: 6,
			customerName: 'Brown Anniversary',
			phone: '+1 555-0333',
			email: 'brown@email.com',
			date: '2024-11-05',
			time: '19:00',
			partySize: 2,
			table: 'P-01',
			status: 'completed',
			notes: ''
		}
	]);

	let searchQuery = $state('');
	let dateFilter = $state('upcoming');
	let statusFilter = $state('all');
	let showAddDialog = $state(false);
	let editingReservation = $state<(typeof reservations)[0] | null>(null);

	let newReservation = $state({
		customerName: '',
		phone: '',
		email: '',
		date: '',
		time: '',
		partySize: 2,
		table: '',
		notes: ''
	});

	const availableTables = [
		'T-01',
		'T-02',
		'T-03',
		'T-04',
		'T-05',
		'T-06',
		'T-07',
		'T-08',
		'P-01',
		'P-02',
		'P-03',
		'P-04',
		'B-01',
		'B-02',
		'VIP-01'
	];

	const filteredReservations = $derived(
		reservations.filter((res) => {
			const matchesSearch =
				res.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				res.phone.includes(searchQuery) ||
				res.table.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesStatus = statusFilter === 'all' || res.status === statusFilter;

			let matchesDate = true;
			const today = '2024-11-06';
			if (dateFilter === 'today') {
				matchesDate = res.date === today;
			} else if (dateFilter === 'upcoming') {
				matchesDate = res.date >= today;
			} else if (dateFilter === 'past') {
				matchesDate = res.date < today;
			}

			return matchesSearch && matchesStatus && matchesDate;
		})
	);

	const stats = $derived({
		today: reservations.filter((r) => r.date === '2024-11-06' && r.status !== 'cancelled').length,
		upcoming: reservations.filter((r) => r.date > '2024-11-06' && r.status !== 'cancelled').length,
		pending: reservations.filter((r) => r.status === 'pending').length
	});

	function getStatusBadge(status: string) {
		switch (status) {
			case 'confirmed':
				return { variant: 'default' as const, text: 'Confirmed' };
			case 'pending':
				return { variant: 'secondary' as const, text: 'Pending' };
			case 'completed':
				return { variant: 'outline' as const, text: 'Completed' };
			case 'cancelled':
				return { variant: 'destructive' as const, text: 'Cancelled' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function addReservation() {
		if (!newReservation.customerName.trim() || !newReservation.date || !newReservation.time) {
			toast.error('Please fill in all required fields');
			return;
		}

		reservations = [
			...reservations,
			{
				id: Math.max(...reservations.map((r) => r.id)) + 1,
				...newReservation,
				status: 'pending'
			}
		];

		toast.success('Reservation created successfully');
		showAddDialog = false;
		newReservation = {
			customerName: '',
			phone: '',
			email: '',
			date: '',
			time: '',
			partySize: 2,
			table: '',
			notes: ''
		};
	}

	function confirmReservation(id: number) {
		reservations = reservations.map((r) => (r.id === id ? { ...r, status: 'confirmed' } : r));
		toast.success('Reservation confirmed');
	}

	function cancelReservation(id: number) {
		reservations = reservations.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r));
		toast.success('Reservation cancelled');
	}

	function deleteReservation(id: number) {
		reservations = reservations.filter((r) => r.id !== id);
		toast.success('Reservation deleted');
	}

	function editReservation(reservation: (typeof reservations)[0]) {
		editingReservation = { ...reservation };
	}

	function saveReservation() {
		if (!editingReservation) return;

		reservations = reservations.map((r) =>
			r.id === editingReservation!.id ? editingReservation! : r
		);
		toast.success('Reservation updated');
		editingReservation = null;
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
						<option value="completed">Completed</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</div>
			</div>

			<!-- Reservations Table -->
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
											<div class="flex items-center gap-1 text-sm text-muted-foreground">
												<IconPhone class="h-3 w-3" />
												{reservation.phone}
											</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-1">
											<IconCalendar class="h-4 w-4 text-muted-foreground" />
											<div>
												<div>{reservation.date}</div>
												<div class="text-sm text-muted-foreground">{reservation.time}</div>
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
										<Badge variant="outline">{reservation.table}</Badge>
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
													onclick={() => confirmReservation(reservation.id)}
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
													onclick={() => cancelReservation(reservation.id)}
												>
													<IconX class="h-4 w-4" />
												</Button>
											{/if}
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0 text-destructive"
												onclick={() => deleteReservation(reservation.id)}
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

			{#if filteredReservations.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconCalendar class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No reservations found</h3>
					<p class="text-muted-foreground">Try adjusting your filters or create a new reservation.</p>
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
					<Input id="phone" bind:value={newReservation.phone} placeholder="+1 555-0123" />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="email" class="text-sm font-medium">Email</label>
				<Input id="email" type="email" bind:value={newReservation.email} placeholder="email@example.com" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="date" class="text-sm font-medium">Date *</label>
					<Input id="date" type="date" bind:value={newReservation.date} />
				</div>
				<div class="grid gap-2">
					<label for="time" class="text-sm font-medium">Time *</label>
					<Input id="time" type="time" bind:value={newReservation.time} />
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
						bind:value={newReservation.table}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Select table</option>
						{#each availableTables as table}
							<option value={table}>{table}</option>
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
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addReservation}>Create Reservation</Button>
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
						<Input id="edit-phone" bind:value={editingReservation.phone} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-date" class="text-sm font-medium">Date</label>
						<Input id="edit-date" type="date" bind:value={editingReservation.date} />
					</div>
					<div class="grid gap-2">
						<label for="edit-time" class="text-sm font-medium">Time</label>
						<Input id="edit-time" type="time" bind:value={editingReservation.time} />
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
							bind:value={editingReservation.table}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{#each availableTables as table}
								<option value={table}>{table}</option>
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
				<Button variant="outline" onclick={() => (editingReservation = null)}>Cancel</Button>
				<Button onclick={saveReservation}>Save Changes</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
