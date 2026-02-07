<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import { IconPlus, IconUsers, IconExternalLink } from '@tabler/icons-svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { TableFloorPlan } from '$lib/components/pos';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		createTable,
		updateTable,
		updateTableStatus,
		deleteTable,
		type Table,
		type TableStatus,
		type CreateTablePayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	let tables = $state<Table[]>(data.tables || []);
	let showAddDialog = $state(false);
	let editingTable = $state<Table | null>(null);
	let isSubmitting = $state(false);
	let selectedSection = $state('');

	// Delete dialog state (Issue 1.1)
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state<string | null>(null);

	// Reserved table seat confirmation (Issue 1.6)
	let seatDialogOpen = $state(false);
	let seatTargetTable = $state<Table | null>(null);

	// Batch position changes (Issue 1.4)
	let pendingPositionChanges = $state<Map<string, { x: number; y: number }>>(new Map());
	let isSavingLayout = $state(false);

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

	// Dynamic sections from existing tables + defaults (Issue 1.2)
	const sections = $derived([
		...new Set([
			...tables.map((t) => t.position?.section).filter((s): s is string => Boolean(s)),
			'Main Hall'
		])
	]);

	// Use server stats when available, fallback to client calculation (Issue 1.7)
	const stats = $derived({
		total: tables.length,
		available: tables.filter((t) => t.status === 'available').length,
		occupied: tables.filter((t) => t.status === 'occupied').length,
		reserved: tables.filter((t) => t.status === 'reserved').length,
		maintenance: tables.filter((t) => t.status === 'maintenance').length
	});

	const hasPendingChanges = $derived(pendingPositionChanges.size > 0);

	// Auto-generate next table number (Issue 1.9)
	function getNextTableNumber(existingTables: Table[]): { tableNumber: string; displayName: string } {
		let maxNum = 0;
		for (const t of existingTables) {
			const match = t.tableNumber.match(/(\d+)$/);
			if (match) {
				const num = parseInt(match[1], 10);
				if (num > maxNum) maxNum = num;
			}
		}
		const next = maxNum + 1;
		return { tableNumber: `T-${next}`, displayName: `Table ${next}` };
	}

	// Position overlap detection (Issue 1.3)
	function findFreePosition(existingTables: Table[], section: string): { x: number; y: number } {
		const sectionTables = existingTables.filter((t) => t.position?.section === section);
		const SPACING = 120;
		const MIN_DISTANCE = 80;
		const COLS = 4;

		for (let i = 0; i < 100; i++) {
			const row = Math.floor(i / COLS);
			const col = i % COLS;
			const x = 100 + col * SPACING;
			const y = 100 + row * SPACING;

			const hasOverlap = sectionTables.some((t) => {
				const dx = Math.abs((t.position?.x || 0) - x);
				const dy = Math.abs((t.position?.y || 0) - y);
				return dx < MIN_DISTANCE && dy < MIN_DISTANCE;
			});

			if (!hasOverlap) {
				return { x, y };
			}
		}

		// Fallback: place far right
		return { x: 100 + sectionTables.length * SPACING, y: 100 };
	}

	function handleOpenAddDialog() {
		const suggested = getNextTableNumber(tables);
		newTable = {
			tableNumber: suggested.tableNumber,
			displayName: suggested.displayName,
			capacity: 4,
			section: sections[0] || 'Main Hall',
			shape: 'square'
		};
		showAddDialog = true;
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
			const position = findFreePosition(tables, newTable.section);

			const payload: CreateTablePayload = {
				tableNumber: newTable.tableNumber,
				displayName: newTable.displayName,
				capacity: newTable.capacity,
				shape: newTable.shape,
				position: {
					x: position.x,
					y: position.y,
					section: newTable.section
				}
			};

			const result = await createTable(data.businessId, payload);
			tables = [...tables, result.table];
			toast.success('Table added successfully');
			showAddDialog = false;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add table'));
		} finally {
			isSubmitting = false;
		}
	}

	// Delete table (Issue 1.1)
	function triggerDeleteTable(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}

	async function confirmDeleteTable() {
		if (!deleteTargetId) return;
		try {
			await deleteTable(data.businessId, deleteTargetId);
			tables = tables.filter((t) => t.id !== deleteTargetId);
			toast.success('Table deleted successfully');
			editingTable = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete table'));
		}
		deleteTargetId = null;
	}

	function handleTableSelect(table: Table) {
		editingTable = { ...table };
	}

	// Batch drag-and-drop saves (Issue 1.4)
	async function handlePositionChange(tableId: string, position: { x: number; y: number }) {
		// Store in pending changes map instead of saving immediately
		const newMap = new Map(pendingPositionChanges);
		newMap.set(tableId, position);
		pendingPositionChanges = newMap;

		// Update local state optimistically
		tables = tables.map((t) =>
			t.id === tableId ? { ...t, position: { ...t.position, ...position } } : t
		);
	}

	async function saveLayout() {
		if (pendingPositionChanges.size === 0) return;
		isSavingLayout = true;
		try {
			const results = await Promise.allSettled(
				Array.from(pendingPositionChanges.entries()).map(([tableId, position]) => {
					const table = tables.find((t) => t.id === tableId);
					if (!table) return Promise.resolve();
					return updateTable(data.businessId, tableId, {
						position: { ...table.position, ...position }
					});
				})
			);

			const failed = results.filter((r) => r.status === 'rejected').length;
			if (failed > 0) {
				toast.error(`${failed} position update(s) failed`);
			} else {
				toast.success('Layout saved successfully');
			}
			pendingPositionChanges = new Map();
		} catch (error) {
			toast.error('Failed to save layout');
		} finally {
			isSavingLayout = false;
		}
	}

	function discardLayoutChanges() {
		// Re-fetch from original data
		tables = [...(data.tables || [])];
		pendingPositionChanges = new Map();
		toast.info('Layout changes discarded');
	}

	async function handleOpenOrder(table: Table) {
		const business = $page.params.business;
		const slug = $page.params.slug;

		if (table.status === 'available') {
			goto(`/${business}/${slug}/pos/new-order?table=${table.id}`);
		} else if (table.status === 'occupied' && table.currentSession?.orderId) {
			goto(`/${business}/${slug}/orders/${table.currentSession.orderId}`);
		} else if (table.status === 'reserved') {
			// Show confirmation dialog for reserved tables (Issue 1.6)
			seatTargetTable = table;
			seatDialogOpen = true;
		}
	}

	async function confirmSeatReserved() {
		if (!seatTargetTable) return;
		const business = $page.params.business;
		const slug = $page.params.slug;

		try {
			await updateTableStatus(data.businessId, seatTargetTable.id, { status: 'occupied' });
			tables = tables.map((t) =>
				t.id === seatTargetTable!.id ? { ...t, status: 'occupied' as TableStatus } : t
			);
			goto(`/${business}/${slug}/pos/new-order?table=${seatTargetTable.id}`);
		} catch (error) {
			toast.error('Failed to seat party');
		}
		seatTargetTable = null;
	}

	async function handleStatusChange(table: Table, status: TableStatus) {
		try {
			const result = await updateTableStatus(data.businessId, table.id, { status });
			tables = tables.map((t) => (t.id === table.id ? result.table : t));
			toast.success('Table status updated');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update status'));
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
			toast.error(userFriendlyError(error, 'Failed to update table'));
		} finally {
			isSubmitting = false;
		}
	}

	// Prevent occupied → available when active session exists (Issue 1.5)
	async function handleStatusChangeInDialog(status: TableStatus) {
		if (!editingTable) return;

		if (
			editingTable.status === 'occupied' &&
			status === 'available' &&
			editingTable.currentSession?.orderId
		) {
			toast.error('This table has an active order. End the session first.');
			return;
		}

		try {
			const result = await updateTableStatus(data.businessId, editingTable.id, { status });
			tables = tables.map((t) => (t.id === editingTable!.id ? result.table : t));
			editingTable = { ...editingTable, status };
			toast.success('Table status updated');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update status'));
		}
	}

	// Format relative time for session display (Issue 1.11)
	function formatRelativeTime(isoString: string): string {
		const diff = Date.now() - new Date(isoString).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m ago`;
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
			<div class="flex items-center gap-2">
				{#if hasPendingChanges}
					<Badge variant="secondary">{pendingPositionChanges.size} unsaved</Badge>
					<Button variant="outline" size="sm" onclick={discardLayoutChanges}>
						Discard
					</Button>
					<Button size="sm" onclick={saveLayout} disabled={isSavingLayout}>
						{#if isSavingLayout}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Save Layout
					</Button>
				{/if}
				<Button onclick={handleOpenAddDialog}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Table
				</Button>
			</div>
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
					<div class="text-2xl font-bold text-success">{stats.available}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Occupied</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-destructive">{stats.occupied}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Reserved</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-warning">{stats.reserved}</div>
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
			<EmptyState type="empty" title="No tables" description="Add tables to set up your floor plan." />
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
				<Input id="tableNumber" autofocus bind:value={newTable.tableNumber} placeholder="e.g., T-16" />
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
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium">Shape</label>
					<!-- Visual shape selector (Issue 1.10) -->
					<div class="flex gap-2">
						<button
							type="button"
							class="flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors {newTable.shape === 'square' ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'}"
							onclick={() => (newTable.shape = 'square')}
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" />
							</svg>
							Square
						</button>
						<button
							type="button"
							class="flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors {newTable.shape === 'round' ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'}"
							onclick={() => (newTable.shape = 'round')}
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							</svg>
							Round
						</button>
						<button
							type="button"
							class="flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors {newTable.shape === 'rectangle' ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'}"
							onclick={() => (newTable.shape = 'rectangle')}
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="2" />
							</svg>
							Rect
						</button>
					</div>
				</div>
			</div>
			<div class="grid gap-2">
				<label for="section" class="text-sm font-medium">Section</label>
				<!-- Combo-box pattern: input with datalist for suggestions (Issue 1.2) -->
				<Input
					id="section"
					bind:value={newTable.section}
					placeholder="Type or select a section"
					list="section-suggestions"
				/>
				<datalist id="section-suggestions">
					{#each sections as section}
						<option value={section}>{section}</option>
					{/each}
				</datalist>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addTable} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
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
				<!-- Order info for occupied tables (Issue 1.11) -->
				{#if editingTable.status === 'occupied' && editingTable.currentSession}
					<div class="rounded-md border border-destructive/20 bg-destructive/5 p-3">
						<div class="mb-1 text-xs font-medium text-destructive">Active Order</div>
						<div class="flex items-center justify-between">
							<div class="text-sm">
								<span class="font-medium">#{editingTable.currentSession.orderNumber}</span>
								{#if editingTable.currentSession.startedAt}
									<span class="text-muted-foreground"> &middot; {formatRelativeTime(editingTable.currentSession.startedAt)}</span>
								{/if}
								{#if editingTable.currentSession.customerCount}
									<span class="text-muted-foreground"> &middot; {editingTable.currentSession.customerCount} guests</span>
								{/if}
							</div>
							<a
								href="/{$page.params.business}/{$page.params.slug}/orders/{editingTable.currentSession.orderId}"
								class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
							>
								View <IconExternalLink class="h-3 w-3" />
							</a>
						</div>
					</div>
				{/if}

				<div class="grid gap-2">
					<label for="edit-tableNumber" class="text-sm font-medium">Table Number</label>
					<Input id="edit-tableNumber" autofocus bind:value={editingTable.tableNumber} />
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
					<Input
						id="edit-section"
						bind:value={editingTable.position.section}
						placeholder="Type or select a section"
						list="edit-section-suggestions"
					/>
					<datalist id="edit-section-suggestions">
						{#each sections as section}
							<option value={section}>{section}</option>
						{/each}
					</datalist>
				</div>
				<div class="grid gap-2">
					<label for="edit-status" class="text-sm font-medium">Status</label>
					<select
						id="edit-status"
						value={editingTable.status}
						onchange={(e) => handleStatusChangeInDialog(e.currentTarget.value as TableStatus)}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="available" disabled={editingTable.status === 'occupied' && !!editingTable.currentSession?.orderId}>
							Available {editingTable.status === 'occupied' && editingTable.currentSession?.orderId ? '(end session first)' : ''}
						</option>
						<option value="occupied">Occupied</option>
						<option value="reserved">Reserved</option>
						<option value="maintenance">Maintenance</option>
						<option value="out_of_service">Out of Service</option>
					</select>
				</div>
			</div>
			<Dialog.Footer class="flex-col gap-2 sm:flex-row">
				<Button
					variant="destructive"
					size="sm"
					onclick={() => triggerDeleteTable(editingTable!.id)}
					class="sm:mr-auto"
					disabled={editingTable.status === 'occupied'}
				>
					Delete Table
				</Button>
				<Button variant="outline" onclick={() => (editingTable = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveTable} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Table Confirm Dialog (Issue 1.1) -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Table"
	description="Are you sure you want to delete this table? This action cannot be undone."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={confirmDeleteTable}
/>

<!-- Seat Reserved Table Confirm Dialog (Issue 1.6) -->
<ConfirmDialog
	bind:open={seatDialogOpen}
	title="Seat Reserved Table"
	description="This table has a reservation. Seat the party and create a new order?"
	confirmLabel="Seat Party"
	onConfirm={confirmSeatReserved}
/>
