<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import {
		IconPlus,
		IconUsers,
		IconExternalLink,
		IconQrcode,
		IconDownload,
		IconPrinter,
		IconArmchair,
		IconCircleCheck,
		IconToolsKitchen2,
		IconCalendar
	} from '@tabler/icons-svelte';
	import { EmptyState } from '$lib/components/data-display';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import KpiGrid from '$lib/components/global/kpi-grid.svelte';
	import KpiCard from '$lib/components/global/kpi-card.svelte';
	import { toast } from 'svelte-sonner';
	import { TableServiceGrid } from '$lib/components/pos';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import * as Select from '$lib/components/ui/select';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		createTable,
		updateTable,
		updateTableStatus,
		deleteTable,
		endTableSession,
		type Table,
		type TableStatus,
		type CreateTablePayload,
		generateTableQr,
		generateAllTableQrs,
		type TableQrCode
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	let tables = $state<Table[]>(data.tables || []);
	let showAddDialog = $state(false);
	let editingTable = $state<Table | null>(null);
	let isSubmitting = $state(false);
	// Retained for the parked floor plan (see the render block below) — the card
	// grid has its own Area filter, so nothing reads this while it's out.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let selectedSection = $state('');

	// Structural narrowing rather than `as any` (which the orders pages still use):
	// `settings` isn't on the generated PageData type, but it doesn't need `any`.
	const currency = $derived(
		((data.business as { settings?: { currency?: string } } | undefined)?.settings?.currency ||
			'USD') as CurrencyCode
	);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

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

	// QR code state
	let editTableQr = $state<TableQrCode | null>(null);
	let isGeneratingQr = $state(false);
	let isGeneratingAllQrs = $state(false);

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
	function getNextTableNumber(existingTables: Table[]): {
		tableNumber: string;
		displayName: string;
	} {
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

	// Batch drag-and-drop saves (Issue 1.4)
	// Only the floor plan repositions tables, so this is unreferenced while that
	// view is parked. Kept — with `saveLayout`/`hasPendingChanges`, which it feeds
	// — so restoring the floor plan is re-adding its render block and nothing else.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

	// Auto-end session when changing occupied table to available
	async function handleStatusChangeInDialog(status: TableStatus) {
		if (!editingTable) return;

		// If changing from occupied to available, end the session first
		if (
			editingTable.status === 'occupied' &&
			status === 'available' &&
			editingTable.currentSession
		) {
			await handleEndSession();
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

	async function handleEndSession() {
		if (!editingTable) return;
		try {
			const result = await endTableSession(data.businessId, editingTable.id);
			tables = tables.map((t) => (t.id === editingTable!.id ? result.table : t));
			editingTable = {
				...editingTable,
				status: 'available' as TableStatus,
				currentSession: undefined
			};
			toast.success('Table session ended');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to end session'));
		}
	}

	// QR code functions
	async function handleGenerateTableQr(tableId: string) {
		isGeneratingQr = true;
		try {
			const result = await generateTableQr(data.businessId, tableId);
			editTableQr = {
				url: result.url,
				dataUrl: result.dataUrl,
				generatedAt: new Date().toISOString()
			};
			toast.success('QR code generated');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to generate QR'));
		} finally {
			isGeneratingQr = false;
		}
	}

	async function handleGenerateAllQrs() {
		isGeneratingAllQrs = true;
		try {
			const result = await generateAllTableQrs(data.businessId);
			toast.success(`Generated QR codes for ${result.count} tables`);
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to generate QR codes'));
		} finally {
			isGeneratingAllQrs = false;
		}
	}

	function downloadQr(dataUrl: string, tableName: string) {
		const link = document.createElement('a');
		link.href = dataUrl;
		link.download = `qr-${tableName}.png`;
		link.click();
	}

	function printQr(dataUrl: string, tableName: string) {
		const win = window.open('', '_blank');
		if (!win) return;
		win.document.write(`
			<html>
				<head><title>QR Code - ${tableName}</title></head>
				<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
					<h2>${tableName}</h2>
					<img src="${dataUrl}" style="width:300px;height:300px;" />
					<p style="color:#666;margin-top:16px;">Scan to order</p>
				</body>
			</html>
		`);
		win.document.close();
		win.focus();
		win.print();
	}

	// Load QR when editing a table
	function handleTableSelect(table: Table) {
		editingTable = { ...table };
		editTableQr = table.qrCode || null;
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

<PageShell title="Table Layout" description="Manage your restaurant floor plan">
	{#snippet actions()}
		{#if hasPendingChanges}
			<Badge variant="secondary">{pendingPositionChanges.size} unsaved</Badge>
			<Button variant="outline" size="sm" onclick={discardLayoutChanges}>Discard</Button>
			<Button size="sm" onclick={saveLayout} disabled={isSavingLayout}>
				{#if isSavingLayout}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Save Layout
			</Button>
		{/if}
		<Button
			variant="outline"
			onclick={handleGenerateAllQrs}
			disabled={isGeneratingAllQrs || tables.length === 0}
		>
			{#if isGeneratingAllQrs}
				<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
			{:else}
				<IconQrcode class="mr-2 h-4 w-4" />
			{/if}
			Generate All QRs
		</Button>
		<Button onclick={handleOpenAddDialog}>
			<IconPlus class="mr-2 h-4 w-4" />
			Add Table
		</Button>
	{/snippet}

	<!-- Stats -->
	<KpiGrid columns={5}>
		<KpiCard label="Total" value={stats.total} icon={IconArmchair} accent="muted" />
		<KpiCard
			label="Available"
			value={stats.available}
			icon={IconCircleCheck}
			accent="success"
			emphasize
		/>
		<KpiCard
			label="Occupied"
			value={stats.occupied}
			icon={IconUsers}
			accent="destructive"
			emphasize
		/>
		<KpiCard
			label="Reserved"
			value={stats.reserved}
			icon={IconCalendar}
			accent="warning"
			emphasize
		/>
		<KpiCard
			label="Maintenance"
			value={stats.maintenance}
			icon={IconToolsKitchen2}
			accent="chart-4"
		/>
	</KpiGrid>

	{#if tables.length === 0}
		<EmptyState
			type="empty"
			title="No tables"
			description="Add tables to set up your floor plan."
		/>
	{:else}
		<!--
			Cards only for now — the floor plan is parked, not deleted.
			`TableFloorPlan` and its handlers (`handlePositionChange`, `saveLayout`,
			`selectedSection`) are left intact so restoring it is re-adding this
			block. Note that while it's out, nothing edits `position.x/y`, so table
			coordinates stay frozen at whatever they were.
		-->
		<TableServiceGrid
			{tables}
			{sections}
			{formatCurrency}
			onSelect={handleTableSelect}
			onOpenOrder={handleOpenOrder}
			onStatusChange={handleStatusChange}
			onGenerateQr={(table) => {
				// Open the detail dialog first — that's where the generated code is
				// rendered, so generating without it would produce an invisible QR.
				handleTableSelect(table);
				handleGenerateTableQr(table.id);
			}}
			onDelete={(table) => triggerDeleteTable(table.id)}
		/>
	{/if}
</PageShell>

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
				<Input
					id="tableNumber"
					autofocus
					bind:value={newTable.tableNumber}
					placeholder="e.g., T-16"
				/>
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
							class="flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors {newTable.shape ===
							'square'
								? 'border-primary bg-primary/10 text-primary'
								: 'border-input hover:bg-accent'}"
							onclick={() => (newTable.shape = 'square')}
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<rect
									x="4"
									y="4"
									width="16"
									height="16"
									rx="2"
									stroke="currentColor"
									stroke-width="2"
								/>
							</svg>
							Square
						</button>
						<button
							type="button"
							class="flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors {newTable.shape ===
							'round'
								? 'border-primary bg-primary/10 text-primary'
								: 'border-input hover:bg-accent'}"
							onclick={() => (newTable.shape = 'round')}
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							</svg>
							Round
						</button>
						<button
							type="button"
							class="flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors {newTable.shape ===
							'rectangle'
								? 'border-primary bg-primary/10 text-primary'
								: 'border-input hover:bg-accent'}"
							onclick={() => (newTable.shape = 'rectangle')}
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<rect
									x="2"
									y="6"
									width="20"
									height="12"
									rx="2"
									stroke="currentColor"
									stroke-width="2"
								/>
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
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
									<span class="text-muted-foreground">
										&middot; {formatRelativeTime(editingTable.currentSession.startedAt)}</span
									>
								{/if}
								{#if editingTable.currentSession.customerCount}
									<span class="text-muted-foreground">
										&middot; {editingTable.currentSession.customerCount} guests</span
									>
								{/if}
							</div>
							<a
								href="/{$page.params.business}/{$page.params.slug}/orders/{editingTable
									.currentSession.orderId}"
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
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium">Status</label>
					<Select.Root
						type="single"
						value={editingTable.status}
						onValueChange={(v) => handleStatusChangeInDialog(v as TableStatus)}
					>
						<Select.Trigger class="w-full">
							{(
								{
									available: 'Available',
									occupied: 'Occupied',
									reserved: 'Reserved',
									maintenance: 'Maintenance',
									out_of_service: 'Out of Service'
								} as Record<string, string>
							)[editingTable.status] || editingTable.status}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="available">Available</Select.Item>
							<Select.Item value="occupied">Occupied</Select.Item>
							<Select.Item value="reserved">Reserved</Select.Item>
							<Select.Item value="maintenance">Maintenance</Select.Item>
							<Select.Item value="out_of_service">Out of Service</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				{#if editingTable.status === 'occupied' && editingTable.currentSession}
					<div>
						<Button variant="outline" size="sm" class="w-full" onclick={handleEndSession}>
							End Session &amp; Free Table
						</Button>
					</div>
				{/if}

				<!-- QR Code Section -->
				<div class="grid gap-2">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium">QR Code</label>
					{#if editTableQr?.dataUrl}
						<div
							class="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4"
						>
							<img src={editTableQr.dataUrl} alt="Table QR Code" class="h-[160px] w-[160px]" />
							<p class="text-xs text-muted-foreground">
								{editTableQr.url}
							</p>
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() =>
										downloadQr(
											editTableQr!.dataUrl,
											editingTable!.displayName || editingTable!.tableNumber
										)}
								>
									<IconDownload class="mr-1 h-3.5 w-3.5" />
									Download
								</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={() =>
										printQr(
											editTableQr!.dataUrl,
											editingTable!.displayName || editingTable!.tableNumber
										)}
								>
									<IconPrinter class="mr-1 h-3.5 w-3.5" />
									Print
								</Button>
							</div>
						</div>
					{:else}
						<p class="text-xs text-muted-foreground">No QR code generated yet.</p>
					{/if}
					<Button
						variant="outline"
						size="sm"
						onclick={() => handleGenerateTableQr(editingTable!.id)}
						disabled={isGeneratingQr}
					>
						{#if isGeneratingQr}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<IconQrcode class="mr-2 h-4 w-4" />
						{/if}
						{editTableQr ? 'Regenerate QR' : 'Generate QR'}
					</Button>
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
