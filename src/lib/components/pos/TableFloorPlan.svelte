<script lang="ts">
	import type { Table, TableStatus } from '$lib/api';
	import FloorPlanTable from './FloorPlanTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import {
		IconZoomIn,
		IconZoomOut,
		IconFocusCentered,
		IconEdit,
		IconDeviceFloppy,
		IconGridDots
	} from '@tabler/icons-svelte';

	interface Props {
		tables: Table[];
		sections?: string[];
		selectedSection?: string;
		isEditMode?: boolean;
		showGrid?: boolean;
		onTableSelect?: (table: Table) => void;
		onTablePositionChange?: (tableId: string, position: { x: number; y: number }) => void;
		onOpenOrder?: (table: Table) => void;
		onStatusChange?: (table: Table, status: TableStatus) => void;
		onEditModeChange?: (isEdit: boolean) => void;
	}

	let {
		tables,
		sections = ['Main Hall', 'Patio', 'Bar', 'VIP'],
		selectedSection = $bindable(''),
		isEditMode = $bindable(false),
		showGrid = $bindable(true),
		onTableSelect,
		onTablePositionChange,
		onOpenOrder,
		onStatusChange,
		onEditModeChange
	}: Props = $props();

	let canvasRef: HTMLDivElement | undefined = $state();
	let scale = $state(1);
	let panOffset = $state({ x: 0, y: 0 });
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });
	let selectedTableId = $state<string | null>(null);
	let draggingTable = $state<Table | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let focusedTableIndex = $state(-1);

	const CANVAS_WIDTH = 1200;
	const CANVAS_HEIGHT = 800;
	const GRID_SIZE = 20;
	const MIN_SCALE = 0.5;
	const MAX_SCALE = 2;
	const ROW_BAND = 80;

	const filteredTables = $derived(
		selectedSection ? tables.filter((t) => t.position?.section === selectedSection) : tables
	);

	// Spatial sort: row-major ordering by Y coordinate bands, then X coordinate
	const sortedTables = $derived(
		[...filteredTables].sort((a, b) => {
			const rowA = Math.floor((a.position?.y ?? 0) / ROW_BAND);
			const rowB = Math.floor((b.position?.y ?? 0) / ROW_BAND);
			if (rowA !== rowB) return rowA - rowB;
			return (a.position?.x ?? 0) - (b.position?.x ?? 0);
		})
	);

	// Map from table id to its index in sortedTables for quick lookup
	const sortedTableIndexById = $derived(
		new Map(sortedTables.map((t, i) => [t.id, i]))
	);

	const stats = $derived({
		total: filteredTables.length,
		available: filteredTables.filter((t) => t.status === 'available').length,
		occupied: filteredTables.filter((t) => t.status === 'occupied').length,
		reserved: filteredTables.filter((t) => t.status === 'reserved').length
	});

	function handleZoomIn() {
		scale = Math.min(scale + 0.1, MAX_SCALE);
	}

	function handleZoomOut() {
		scale = Math.max(scale - 0.1, MIN_SCALE);
	}

	function handleResetView() {
		scale = 1;
		panOffset = { x: 0, y: 0 };
	}

	function handleKeyDown(e: KeyboardEvent) {
		const tableCount = sortedTables.length;
		if (tableCount === 0) return;

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown': {
				e.preventDefault();
				if (focusedTableIndex < 0) {
					focusedTableIndex = 0;
				} else {
					focusedTableIndex = (focusedTableIndex + 1) % tableCount;
				}
				break;
			}
			case 'ArrowLeft':
			case 'ArrowUp': {
				e.preventDefault();
				if (focusedTableIndex < 0) {
					focusedTableIndex = tableCount - 1;
				} else {
					focusedTableIndex = (focusedTableIndex - 1 + tableCount) % tableCount;
				}
				break;
			}
			case 'Enter':
			case ' ': {
				e.preventDefault();
				if (focusedTableIndex >= 0 && focusedTableIndex < tableCount) {
					const focusedTable = sortedTables[focusedTableIndex];
					handleTableSelect(focusedTable);
				}
				break;
			}
			case '+':
			case '=': {
				e.preventDefault();
				handleZoomIn();
				break;
			}
			case '-': {
				e.preventDefault();
				handleZoomOut();
				break;
			}
			case '0': {
				e.preventDefault();
				handleResetView();
				break;
			}
			default:
				break;
		}
	}

	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			const delta = e.deltaY > 0 ? -0.1 : 0.1;
			scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
		}
	}

	function handleCanvasPointerDown(e: PointerEvent) {
		if (e.target === canvasRef && !draggingTable) {
			isPanning = true;
			panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		}
	}

	function handleCanvasPointerMove(e: PointerEvent) {
		if (isPanning) {
			panOffset = {
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y
			};
		} else if (draggingTable && canvasRef) {
			const rect = canvasRef.getBoundingClientRect();
			let newX = (e.clientX - rect.left - panOffset.x) / scale - dragOffset.x;
			let newY = (e.clientY - rect.top - panOffset.y) / scale - dragOffset.y;

			if (showGrid) {
				newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
				newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
			}

			newX = Math.max(50, Math.min(CANVAS_WIDTH - 50, newX));
			newY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, newY));

			draggingTable = {
				...draggingTable,
				position: { ...draggingTable.position, x: newX, y: newY }
			};
		}
	}

	function handleCanvasPointerUp(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		}
		if (draggingTable) {
			onTablePositionChange?.(draggingTable.id, {
				x: draggingTable.position.x,
				y: draggingTable.position.y
			});
			draggingTable = null;
		}
	}

	function handleTableDragStart(table: Table, e: PointerEvent) {
		if (!isEditMode || !canvasRef) return;

		const rect = canvasRef.getBoundingClientRect();
		const mouseX = (e.clientX - rect.left - panOffset.x) / scale;
		const mouseY = (e.clientY - rect.top - panOffset.y) / scale;

		dragOffset = {
			x: mouseX - table.position.x,
			y: mouseY - table.position.y
		};
		draggingTable = { ...table };
	}

	function handleTableSelect(table: Table) {
		selectedTableId = table.id;
		onTableSelect?.(table);
	}

	function toggleEditMode() {
		isEditMode = !isEditMode;
		onEditModeChange?.(isEditMode);
	}

	function getDisplayTable(table: Table): Table {
		if (draggingTable?.id === table.id) {
			return draggingTable;
		}
		return table;
	}
</script>

<div class="flex h-full flex-col overflow-hidden rounded-lg border bg-background">
	<!-- Toolbar -->
	<div class="flex flex-wrap items-center justify-between gap-2 border-b p-3">
		<div class="flex items-center gap-2">
			<!-- Section Filter -->
			<Select.Root type="single" bind:value={selectedSection}>
				<Select.Trigger class="w-36">
					{selectedSection || 'All Sections'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">All Sections</Select.Item>
					{#each sections as section}
						<Select.Item value={section}>{section}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<!-- Stats -->
			<div class="hidden items-center gap-2 sm:flex">
				<Badge variant="outline" class="gap-1">
					<span class="h-2 w-2 rounded-full bg-green-500"></span>
					{stats.available}
				</Badge>
				<Badge variant="outline" class="gap-1">
					<span class="h-2 w-2 rounded-full bg-red-500"></span>
					{stats.occupied}
				</Badge>
				<Badge variant="outline" class="gap-1">
					<span class="h-2 w-2 rounded-full bg-yellow-500"></span>
					{stats.reserved}
				</Badge>
			</div>
		</div>

		<div class="flex items-center gap-1">
			<!-- Grid Toggle -->
			<Button
				variant={showGrid ? 'secondary' : 'ghost'}
				size="icon"
				onclick={() => (showGrid = !showGrid)}
				title="Toggle Grid"
			>
				<IconGridDots class="h-4 w-4" />
			</Button>

			<!-- Zoom Controls -->
			<Button variant="ghost" size="icon" onclick={handleZoomOut} disabled={scale <= MIN_SCALE}>
				<IconZoomOut class="h-4 w-4" />
			</Button>
			<span class="w-12 text-center text-sm text-muted-foreground">
				{Math.round(scale * 100)}%
			</span>
			<Button variant="ghost" size="icon" onclick={handleZoomIn} disabled={scale >= MAX_SCALE}>
				<IconZoomIn class="h-4 w-4" />
			</Button>
			<Button variant="ghost" size="icon" onclick={handleResetView} title="Reset View">
				<IconFocusCentered class="h-4 w-4" />
			</Button>

			<!-- Edit Mode -->
			<div class="ml-2 border-l pl-2">
				<Button
					variant={isEditMode ? 'default' : 'outline'}
					size="sm"
					onclick={toggleEditMode}
					class="gap-1"
				>
					{#if isEditMode}
						<IconDeviceFloppy class="h-4 w-4" />
						Done
					{:else}
						<IconEdit class="h-4 w-4" />
						Edit Layout
					{/if}
				</Button>
			</div>
		</div>
	</div>

	<!-- Canvas -->
	<div class="relative flex-1 overflow-hidden bg-muted/30">
		<div
			bind:this={canvasRef}
			class="absolute inset-0 cursor-grab overflow-hidden select-none {isPanning
				? 'cursor-grabbing'
				: ''}"
			role="application"
			aria-label="Table floor plan. Use arrow keys to navigate tables."
			tabindex="0"
			onkeydown={handleKeyDown}
			onwheel={handleWheel}
			onpointerdown={handleCanvasPointerDown}
			onpointermove={handleCanvasPointerMove}
			onpointerup={handleCanvasPointerUp}
			onpointerleave={handleCanvasPointerUp}
		>
			<!-- Transformed Content -->
			<div
				class="relative origin-top-left"
				style="width: 100%; height: 100%; transform: translate({panOffset.x}px, {panOffset.y}px) scale({scale});"
			>
				<!-- Grid Background -->
				{#if showGrid}
					<svg class="pointer-events-none absolute inset-0 h-full w-full">
						<defs>
							<pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
								<path
									d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}"
									fill="none"
									stroke="currentColor"
									stroke-width="0.5"
									class="text-muted-foreground/20"
								/>
							</pattern>
							<pattern
								id="grid-large"
								width={GRID_SIZE * 5}
								height={GRID_SIZE * 5}
								patternUnits="userSpaceOnUse"
							>
								<rect width={GRID_SIZE * 5} height={GRID_SIZE * 5} fill="url(#grid)" />
								<path
									d="M {GRID_SIZE * 5} 0 L 0 0 0 {GRID_SIZE * 5}"
									fill="none"
									stroke="currentColor"
									stroke-width="1"
									class="text-muted-foreground/30"
								/>
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#grid-large)" />
					</svg>
				{/if}

				<!-- Tables -->
				{#each filteredTables as table (table.id)}
					{@const displayTable = getDisplayTable(table)}
					{@const sortedIdx = sortedTableIndexById.get(table.id) ?? -1}
					<FloorPlanTable
						table={displayTable}
						isSelected={selectedTableId === table.id}
						isDragging={draggingTable?.id === table.id}
						isFocused={focusedTableIndex >= 0 && sortedIdx === focusedTableIndex}
						{isEditMode}
						onSelect={handleTableSelect}
						onDragStart={handleTableDragStart}
						{onOpenOrder}
						{onStatusChange}
					/>
				{/each}
			</div>
		</div>

		<!-- Legend -->
		<div
			class="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg border bg-background/95 p-2 text-xs backdrop-blur-sm"
		>
			<div class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded-full border-2 border-green-500 bg-green-100"></span>
				<span>Available</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded-full border-2 border-red-500 bg-red-100"></span>
				<span>Occupied</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded-full border-2 border-yellow-500 bg-yellow-100"></span>
				<span>Reserved</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded-full border-2 border-orange-500 bg-orange-100"></span>
				<span>Maintenance</span>
			</div>
		</div>

		<!-- Edit Mode Indicator -->
		{#if isEditMode}
			<div
				class="absolute top-3 right-3 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
			>
				Drag tables to reposition
			</div>
		{/if}
	</div>
</div>
