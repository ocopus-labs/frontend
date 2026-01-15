<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconUsers,
		IconClock
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';

	// Dummy tables data
	let tables = $state([
		{ id: 1, name: 'T-01', capacity: 2, status: 'available', section: 'Main Hall', x: 50, y: 50 },
		{
			id: 2,
			name: 'T-02',
			capacity: 4,
			status: 'occupied',
			section: 'Main Hall',
			x: 150,
			y: 50,
			order: 'ORD-201',
			occupiedSince: '14:30'
		},
		{ id: 3, name: 'T-03', capacity: 4, status: 'available', section: 'Main Hall', x: 250, y: 50 },
		{
			id: 4,
			name: 'T-04',
			capacity: 6,
			status: 'reserved',
			section: 'Main Hall',
			x: 350,
			y: 50,
			reservedFor: 'Smith Party',
			reservedTime: '18:00'
		},
		{
			id: 5,
			name: 'T-05',
			capacity: 2,
			status: 'occupied',
			section: 'Main Hall',
			x: 50,
			y: 150,
			order: 'ORD-202',
			occupiedSince: '14:25'
		},
		{ id: 6, name: 'T-06', capacity: 4, status: 'available', section: 'Main Hall', x: 150, y: 150 },
		{
			id: 7,
			name: 'T-07',
			capacity: 8,
			status: 'occupied',
			section: 'Main Hall',
			x: 250,
			y: 150,
			order: 'ORD-203',
			occupiedSince: '14:10'
		},
		{ id: 8, name: 'T-08', capacity: 4, status: 'available', section: 'Main Hall', x: 350, y: 150 },
		{ id: 9, name: 'P-01', capacity: 4, status: 'available', section: 'Patio', x: 50, y: 280 },
		{
			id: 10,
			name: 'P-02',
			capacity: 6,
			status: 'occupied',
			section: 'Patio',
			x: 150,
			y: 280,
			order: 'ORD-204',
			occupiedSince: '13:45'
		},
		{
			id: 11,
			name: 'P-03',
			capacity: 4,
			status: 'reserved',
			section: 'Patio',
			x: 250,
			y: 280,
			reservedFor: 'Johnson',
			reservedTime: '19:00'
		},
		{ id: 12, name: 'P-04', capacity: 2, status: 'available', section: 'Patio', x: 350, y: 280 },
		{ id: 13, name: 'B-01', capacity: 4, status: 'available', section: 'Bar', x: 50, y: 410 },
		{ id: 14, name: 'B-02', capacity: 4, status: 'available', section: 'Bar', x: 150, y: 410 },
		{
			id: 15,
			name: 'VIP-01',
			capacity: 10,
			status: 'reserved',
			section: 'VIP',
			x: 250,
			y: 410,
			reservedFor: 'Corporate Event',
			reservedTime: '19:30'
		}
	]);

	let showAddDialog = $state(false);
	let editingTable = $state<(typeof tables)[0] | null>(null);
	let newTable = $state({
		name: '',
		capacity: 4,
		section: 'Main Hall'
	});

	const sections = ['Main Hall', 'Patio', 'Bar', 'VIP'];

	const stats = $derived({
		total: tables.length,
		available: tables.filter((t) => t.status === 'available').length,
		occupied: tables.filter((t) => t.status === 'occupied').length,
		reserved: tables.filter((t) => t.status === 'reserved').length
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'available':
				return 'bg-green-500';
			case 'occupied':
				return 'bg-red-500';
			case 'reserved':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'available':
				return { variant: 'default' as const, text: 'Available' };
			case 'occupied':
				return { variant: 'destructive' as const, text: 'Occupied' };
			case 'reserved':
				return { variant: 'secondary' as const, text: 'Reserved' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function addTable() {
		if (!newTable.name.trim()) {
			toast.error('Table name is required');
			return;
		}

		tables = [
			...tables,
			{
				id: Math.max(...tables.map((t) => t.id)) + 1,
				name: newTable.name,
				capacity: newTable.capacity,
				status: 'available',
				section: newTable.section,
				x: Math.random() * 300 + 50,
				y: Math.random() * 300 + 50
			}
		];

		toast.success('Table added successfully');
		showAddDialog = false;
		newTable = { name: '', capacity: 4, section: 'Main Hall' };
	}

	function editTable(table: (typeof tables)[0]) {
		editingTable = { ...table };
	}

	function saveTable() {
		if (!editingTable) return;

		tables = tables.map((t) => (t.id === editingTable!.id ? editingTable! : t));
		toast.success('Table updated successfully');
		editingTable = null;
	}

	function deleteTable(tableId: number) {
		const table = tables.find((t) => t.id === tableId);
		if (table?.status === 'occupied') {
			toast.error('Cannot delete occupied table');
			return;
		}

		tables = tables.filter((t) => t.id !== tableId);
		toast.success('Table deleted successfully');
	}

	function setTableStatus(tableId: number, status: string) {
		tables = tables.map((t) => (t.id === tableId ? { ...t, status } : t));
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Table Layout</h1>
					<p class="text-muted-foreground">Manage your restaurant floor plan</p>
				</div>
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Table
				</Button>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Tables</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.total}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Available</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-green-600">{stats.available}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Occupied</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-red-600">{stats.occupied}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Reserved</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Legend -->
			<div class="flex gap-4 px-6">
				<div class="flex items-center gap-2">
					<div class="h-4 w-4 rounded-full bg-green-500"></div>
					<span class="text-sm">Available</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-4 w-4 rounded-full bg-red-500"></div>
					<span class="text-sm">Occupied</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-4 w-4 rounded-full bg-yellow-500"></div>
					<span class="text-sm">Reserved</span>
				</div>
			</div>

			<!-- Tables by Section -->
			{#each sections as section}
				{@const sectionTables = tables.filter((t) => t.section === section)}
				{#if sectionTables.length > 0}
					<div class="px-6">
						<h2 class="mb-3 text-lg font-semibold">{section}</h2>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
							{#each sectionTables as table (table.id)}
								<Card.Root
									class="cursor-pointer transition-shadow hover:shadow-md {table.status ===
									'occupied'
										? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
										: table.status === 'reserved'
											? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950'
											: ''}"
								>
									<Card.Content class="p-4">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<div class="h-3 w-3 rounded-full {getStatusColor(table.status)}"></div>
												<span class="font-bold">{table.name}</span>
											</div>
											<Badge variant={getStatusBadge(table.status).variant} class="text-xs">
												{getStatusBadge(table.status).text}
											</Badge>
										</div>

										<div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
											<IconUsers class="h-4 w-4" />
											<span>{table.capacity} seats</span>
										</div>

										{#if table.status === 'occupied' && table.occupiedSince}
											<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
												<IconClock class="h-3 w-3" />
												<span>Since {table.occupiedSince}</span>
											</div>
										{/if}

										{#if table.status === 'reserved' && table.reservedFor}
											<div class="mt-1 text-xs text-muted-foreground">
												<div>{table.reservedFor}</div>
												<div>at {table.reservedTime}</div>
											</div>
										{/if}

										<div class="mt-3 flex gap-1">
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0"
												onclick={() => editTable(table)}
											>
												<IconPencil class="h-3 w-3" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0 text-destructive hover:text-destructive"
												onclick={() => deleteTable(table.id)}
											>
												<IconTrash class="h-3 w-3" />
											</Button>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

<!-- Add Table Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Table</Dialog.Title>
			<Dialog.Description>Add a new table to your floor plan</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="name" class="text-sm font-medium">Table Name</label>
				<Input id="name" bind:value={newTable.name} placeholder="e.g., T-16" />
			</div>
			<div class="grid gap-2">
				<label for="capacity" class="text-sm font-medium">Capacity</label>
				<Input id="capacity" type="number" min="1" max="20" bind:value={newTable.capacity} />
			</div>
			<div class="grid gap-2">
				<label for="section" class="text-sm font-medium">Section</label>
				<select
					id="section"
					bind:value={newTable.section}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					{#each sections as section}
						<option value={section}>{section}</option>
					{/each}
				</select>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addTable}>Add Table</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Table Dialog -->
<Dialog.Root open={!!editingTable} onOpenChange={(open) => !open && (editingTable = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Table</Dialog.Title>
			<Dialog.Description>Update table details</Dialog.Description>
		</Dialog.Header>
		{#if editingTable}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-name" class="text-sm font-medium">Table Name</label>
					<Input id="edit-name" bind:value={editingTable.name} />
				</div>
				<div class="grid gap-2">
					<label for="edit-capacity" class="text-sm font-medium">Capacity</label>
					<Input
						id="edit-capacity"
						type="number"
						min="1"
						max="20"
						bind:value={editingTable.capacity}
					/>
				</div>
				<div class="grid gap-2">
					<label for="edit-section" class="text-sm font-medium">Section</label>
					<select
						id="edit-section"
						bind:value={editingTable.section}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{#each sections as section}
							<option value={section}>{section}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-2">
					<label for="edit-status" class="text-sm font-medium">Status</label>
					<select
						id="edit-status"
						bind:value={editingTable.status}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="available">Available</option>
						<option value="occupied">Occupied</option>
						<option value="reserved">Reserved</option>
					</select>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingTable = null)}>Cancel</Button>
				<Button onclick={saveTable}>Save Changes</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
