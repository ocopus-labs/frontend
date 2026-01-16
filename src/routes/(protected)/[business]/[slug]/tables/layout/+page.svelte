<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2 } from '@lucide/svelte';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconUsers,
		IconClock
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		createTable,
		updateTable,
		updateTableStatus,
		deleteTable as deleteTableApi,
		type Table,
		type TableStatus,
		type CreateTablePayload
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let tables = $state<Table[]>(data.tables || []);
	let showAddDialog = $state(false);
	let editingTable = $state<Table | null>(null);
	let isSubmitting = $state(false);

	let newTable = $state<{
		tableNumber: string;
		displayName: string;
		capacity: number;
		section: string;
	}>({
		tableNumber: '',
		displayName: '',
		capacity: 4,
		section: 'Main Hall'
	});

	const sections = ['Main Hall', 'Patio', 'Bar', 'VIP'];

	const stats = $derived({
		total: tables.length,
		available: tables.filter((t) => t.status === 'available').length,
		occupied: tables.filter((t) => t.status === 'occupied').length,
		reserved: tables.filter((t) => t.status === 'reserved').length,
		maintenance: tables.filter((t) => t.status === 'maintenance').length
	});

	function getStatusColor(status: TableStatus) {
		switch (status) {
			case 'available':
				return 'bg-green-500';
			case 'occupied':
				return 'bg-red-500';
			case 'reserved':
				return 'bg-yellow-500';
			case 'maintenance':
				return 'bg-orange-500';
			case 'out_of_service':
				return 'bg-gray-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusBadge(status: TableStatus) {
		switch (status) {
			case 'available':
				return { variant: 'default' as const, text: 'Available' };
			case 'occupied':
				return { variant: 'destructive' as const, text: 'Occupied' };
			case 'reserved':
				return { variant: 'secondary' as const, text: 'Reserved' };
			case 'maintenance':
				return { variant: 'outline' as const, text: 'Maintenance' };
			case 'out_of_service':
				return { variant: 'outline' as const, text: 'Out of Service' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	async function addTable() {
		if (!newTable.tableNumber.trim()) {
			toast.error('Table number is required');
			return;
		}
		if (!newTable.displayName.trim()) {
			toast.error('Display name is required');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateTablePayload = {
				tableNumber: newTable.tableNumber,
				displayName: newTable.displayName,
				capacity: newTable.capacity,
				position: {
					x: Math.random() * 300 + 50,
					y: Math.random() * 300 + 50,
					section: newTable.section
				}
			};

			const result = await createTable(data.businessId, payload);
			tables = [...tables, result.table];
			toast.success('Table added successfully');
			showAddDialog = false;
			newTable = { tableNumber: '', displayName: '', capacity: 4, section: 'Main Hall' };
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add table');
		} finally {
			isSubmitting = false;
		}
	}

	function editTable(table: Table) {
		editingTable = { ...table };
	}

	async function saveTable() {
		if (!editingTable) return;

		isSubmitting = true;
		try {
			const result = await updateTable(data.businessId, editingTable.id, {
				tableNumber: editingTable.tableNumber,
				displayName: editingTable.displayName,
				capacity: editingTable.capacity,
				position: editingTable.position
			});
			tables = tables.map((t) => (t.id === editingTable!.id ? result.table : t));
			toast.success('Table updated successfully');
			editingTable = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update table');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDeleteTable(tableId: string) {
		const table = tables.find((t) => t.id === tableId);
		if (table?.status === 'occupied') {
			toast.error('Cannot delete occupied table');
			return;
		}

		try {
			await deleteTableApi(data.businessId, tableId);
			tables = tables.filter((t) => t.id !== tableId);
			toast.success('Table deleted successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete table');
		}
	}

	async function handleStatusChange(tableId: string, status: TableStatus) {
		try {
			const result = await updateTableStatus(data.businessId, tableId, { status });
			tables = tables.map((t) => (t.id === tableId ? result.table : t));
			toast.success('Table status updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update status');
		}
	}

	function getSection(table: Table): string {
		return table.position?.section || 'Main Hall';
	}

	function formatTime(dateString?: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
			<div class="flex flex-wrap gap-4 px-6">
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
				<div class="flex items-center gap-2">
					<div class="h-4 w-4 rounded-full bg-orange-500"></div>
					<span class="text-sm">Maintenance</span>
				</div>
			</div>

			<!-- Empty State -->
			{#if tables.length === 0}
				<div class="flex flex-col items-center justify-center gap-4 py-12">
					<IconUsers class="h-12 w-12 text-muted-foreground" />
					<div class="text-center">
						<h3 class="font-semibold">No tables yet</h3>
						<p class="text-sm text-muted-foreground">Add your first table to get started</p>
					</div>
					<Button onclick={() => (showAddDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Add Table
					</Button>
				</div>
			{:else}
				<!-- Tables by Section -->
				{#each sections as section}
					{@const sectionTables = tables.filter((t) => getSection(t) === section)}
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
												: table.status === 'maintenance'
													? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950'
													: ''}"
									>
										<Card.Content class="p-4">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<div class="h-3 w-3 rounded-full {getStatusColor(table.status)}"></div>
													<span class="font-bold">{table.displayName}</span>
												</div>
												<Badge variant={getStatusBadge(table.status).variant} class="text-xs">
													{getStatusBadge(table.status).text}
												</Badge>
											</div>

											<div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
												<IconUsers class="h-4 w-4" />
												<span>{table.capacity} seats</span>
											</div>

											{#if table.status === 'occupied' && table.currentSession}
												<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
													<IconClock class="h-3 w-3" />
													<span>Since {formatTime(table.currentSession.startedAt)}</span>
												</div>
												<div class="mt-1 text-xs text-muted-foreground">
													Order: {table.currentSession.orderNumber}
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
													onclick={() => handleDeleteTable(table.id)}
													disabled={table.status === 'occupied'}
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
			{/if}
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
				<label for="tableNumber" class="text-sm font-medium">Table Number</label>
				<Input id="tableNumber" bind:value={newTable.tableNumber} placeholder="e.g., T-16" />
			</div>
			<div class="grid gap-2">
				<label for="displayName" class="text-sm font-medium">Display Name</label>
				<Input id="displayName" bind:value={newTable.displayName} placeholder="e.g., Table 16" />
			</div>
			<div class="grid gap-2">
				<label for="capacity" class="text-sm font-medium">Capacity</label>
				<Input id="capacity" type="number" min="1" max="100" bind:value={newTable.capacity} />
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
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addTable} disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Table
			</Button>
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
					<label for="edit-tableNumber" class="text-sm font-medium">Table Number</label>
					<Input id="edit-tableNumber" bind:value={editingTable.tableNumber} />
				</div>
				<div class="grid gap-2">
					<label for="edit-displayName" class="text-sm font-medium">Display Name</label>
					<Input id="edit-displayName" bind:value={editingTable.displayName} />
				</div>
				<div class="grid gap-2">
					<label for="edit-capacity" class="text-sm font-medium">Capacity</label>
					<Input
						id="edit-capacity"
						type="number"
						min="1"
						max="100"
						bind:value={editingTable.capacity}
					/>
				</div>
				<div class="grid gap-2">
					<label for="edit-section" class="text-sm font-medium">Section</label>
					<select
						id="edit-section"
						bind:value={editingTable.position.section}
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
						value={editingTable.status}
						onchange={(e) => handleStatusChange(editingTable!.id, e.currentTarget.value as TableStatus)}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="available">Available</option>
						<option value="occupied">Occupied</option>
						<option value="reserved">Reserved</option>
						<option value="maintenance">Maintenance</option>
						<option value="out_of_service">Out of Service</option>
					</select>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingTable = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveTable} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
