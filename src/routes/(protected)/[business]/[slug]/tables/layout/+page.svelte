<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Loader2 } from '@lucide/svelte';
	import { IconPlus, IconUsers } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { TableFloorPlan } from '$lib/components/pos';
	import {
		createTable,
		updateTable,
		updateTableStatus,
		type Table,
		type TableStatus,
		type CreateTablePayload
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let tables = $state<Table[]>(data.tables || []);
	let showAddDialog = $state(false);
	let editingTable = $state<Table | null>(null);
	let isSubmitting = $state(false);
	let selectedSection = $state('');

	let newTable = $state<{
		tableNumber: string;
		displayName: string;
		capacity: number;
		section: string;
		shape: 'square' | 'round' | 'rectangle';
	}>({
		tableNumber: '',
		displayName: '',
		capacity: 4,
		section: 'Main Hall',
		shape: 'square'
	});

	const sections = ['Main Hall', 'Patio', 'Bar', 'VIP'];

	const stats = $derived({
		total: tables.length,
		available: tables.filter((t) => t.status === 'available').length,
		occupied: tables.filter((t) => t.status === 'occupied').length,
		reserved: tables.filter((t) => t.status === 'reserved').length,
		maintenance: tables.filter((t) => t.status === 'maintenance').length
	});

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
			const existingInSection = tables.filter(
				(t) => t.position?.section === newTable.section
			).length;
			const row = Math.floor(existingInSection / 4);
			const col = existingInSection % 4;

			const payload: CreateTablePayload = {
				tableNumber: newTable.tableNumber,
				displayName: newTable.displayName,
				capacity: newTable.capacity,
				shape: newTable.shape,
				position: {
					x: 100 + col * 120,
					y: 100 + row * 120,
					section: newTable.section
				}
			};

			const result = await createTable(data.businessId, payload);
			tables = [...tables, result.table];
			toast.success('Table added successfully');
			showAddDialog = false;
			newTable = {
				tableNumber: '',
				displayName: '',
				capacity: 4,
				section: 'Main Hall',
				shape: 'square'
			};
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add table');
		} finally {
			isSubmitting = false;
		}
	}

	function handleTableSelect(table: Table) {
		editingTable = { ...table };
	}

	async function handlePositionChange(tableId: string, position: { x: number; y: number }) {
		const table = tables.find((t) => t.id === tableId);
		if (!table) return;

		try {
			const result = await updateTable(data.businessId, tableId, {
				position: { ...table.position, ...position }
			});
			tables = tables.map((t) => (t.id === tableId ? result.table : t));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update position');
		}
	}

	async function handleOpenOrder(table: Table) {
		const business = $page.params.business;
		const slug = $page.params.slug;

		if (table.status === 'available') {
			goto(`/${business}/${slug}/pos?table=${table.id}`);
		} else if (table.status === 'occupied' && table.currentSession?.orderId) {
			goto(`/${business}/${slug}/orders/${table.currentSession.orderId}`);
		} else if (table.status === 'reserved') {
			try {
				await updateTableStatus(data.businessId, table.id, { status: 'occupied' });
				tables = tables.map((t) =>
					t.id === table.id ? { ...t, status: 'occupied' as TableStatus } : t
				);
				goto(`/${business}/${slug}/pos?table=${table.id}`);
			} catch (error) {
				toast.error('Failed to seat party');
			}
		}
	}

	async function handleStatusChange(table: Table, status: TableStatus) {
		try {
			const result = await updateTableStatus(data.businessId, table.id, { status });
			tables = tables.map((t) => (t.id === table.id ? result.table : t));
			toast.success('Table status updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update status');
		}
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

	async function handleStatusChangeInDialog(status: TableStatus) {
		if (!editingTable) return;
		try {
			const result = await updateTableStatus(data.businessId, editingTable.id, { status });
			tables = tables.map((t) => (t.id === editingTable!.id ? result.table : t));
			editingTable = { ...editingTable, status };
			toast.success('Table status updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update status');
		}
	}
</script>

<div class="flex h-full flex-1 flex-col">
	<div class="flex flex-1 flex-col gap-4">
		<!-- Header -->
		<div class="flex flex-col gap-4 px-6 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
		<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-5">
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Total</Card.Title>
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
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Maintenance</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Floor Plan -->
		{#if tables.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6">
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
			<div class="flex-1 px-6 pb-6">
				<TableFloorPlan
					{tables}
					{sections}
					bind:selectedSection
					onTableSelect={handleTableSelect}
					onTablePositionChange={handlePositionChange}
					onOpenOrder={handleOpenOrder}
					onStatusChange={handleStatusChange}
				/>
			</div>
		{/if}
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
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="capacity" class="text-sm font-medium">Capacity</label>
					<Input id="capacity" type="number" min="1" max="20" bind:value={newTable.capacity} />
				</div>
				<div class="grid gap-2">
					<label for="shape" class="text-sm font-medium">Shape</label>
					<select
						id="shape"
						bind:value={newTable.shape}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="square">Square</option>
						<option value="round">Round</option>
						<option value="rectangle">Rectangle</option>
					</select>
				</div>
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
						max="20"
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
						onchange={(e) => handleStatusChangeInDialog(e.currentTarget.value as TableStatus)}
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
