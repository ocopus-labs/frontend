<script lang="ts">
	import type { Table, TableStatus } from '$lib/api';
	import { IconUsers, IconClock, IconReceipt } from '@tabler/icons-svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		table: Table;
		isSelected?: boolean;
		isDragging?: boolean;
		isEditMode?: boolean;
		onSelect?: (table: Table) => void;
		onDragStart?: (table: Table, e: PointerEvent) => void;
		onOpenOrder?: (table: Table) => void;
		onStatusChange?: (table: Table, status: TableStatus) => void;
	}

	let {
		table,
		isSelected = false,
		isDragging = false,
		isEditMode = false,
		onSelect,
		onDragStart,
		onOpenOrder,
		onStatusChange
	}: Props = $props();

	const statusColors: Record<TableStatus, { bg: string; border: string; text: string }> = {
		available: {
			bg: 'bg-green-100 dark:bg-green-950',
			border: 'border-green-500',
			text: 'text-green-700 dark:text-green-400'
		},
		occupied: {
			bg: 'bg-red-100 dark:bg-red-950',
			border: 'border-red-500',
			text: 'text-red-700 dark:text-red-400'
		},
		reserved: {
			bg: 'bg-yellow-100 dark:bg-yellow-950',
			border: 'border-yellow-500',
			text: 'text-yellow-700 dark:text-yellow-400'
		},
		maintenance: {
			bg: 'bg-orange-100 dark:bg-orange-950',
			border: 'border-orange-500',
			text: 'text-orange-700 dark:text-orange-400'
		},
		out_of_service: {
			bg: 'bg-gray-100 dark:bg-gray-900',
			border: 'border-gray-500',
			text: 'text-gray-700 dark:text-gray-400'
		}
	};

	const colors = $derived(statusColors[table.status] || statusColors.available);

	const shapeClasses = $derived(() => {
		switch (table.shape) {
			case 'round':
			case 'oval':
				return 'rounded-full';
			case 'rectangle':
				return 'rounded-lg';
			case 'square':
			default:
				return 'rounded-lg';
		}
	});

	const sizeClasses = $derived(() => {
		const capacity = table.capacity;
		if (capacity <= 2) return 'w-16 h-16';
		if (capacity <= 4) return 'w-20 h-20';
		if (capacity <= 6) return 'w-24 h-24';
		if (capacity <= 8) return 'w-28 h-20';
		return 'w-32 h-24';
	});

	function getElapsedTime(startedAt?: string): string {
		if (!startedAt) return '';
		const start = new Date(startedAt);
		const now = new Date();
		const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
		if (diff < 60) return `${diff}m`;
		const hours = Math.floor(diff / 60);
		const mins = diff % 60;
		return `${hours}h ${mins}m`;
	}

	function handlePointerDown(e: PointerEvent) {
		if (isEditMode && onDragStart) {
			onDragStart(table, e);
		}
	}

	function handleClick() {
		if (!isEditMode && onSelect) {
			onSelect(table);
		}
	}
</script>

<Popover.Root>
	<Popover.Trigger asChild>
		{#snippet child({ props })}
			<button
				{...props}
				class="absolute flex flex-col items-center justify-center border-2 shadow-md transition-all
					{shapeClasses()} {sizeClasses()} {colors.bg} {colors.border}
					{isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
					{isDragging ? 'opacity-70 scale-105 cursor-grabbing z-50' : ''}
					{isEditMode ? 'cursor-grab hover:scale-105' : 'cursor-pointer hover:shadow-lg'}
					focus:outline-none focus:ring-2 focus:ring-primary"
				style="left: {table.position.x}px; top: {table.position.y}px; transform: translate(-50%, -50%);"
				onpointerdown={handlePointerDown}
				onclick={handleClick}
			>
				<span class="text-sm font-bold {colors.text}">{table.displayName}</span>

				<div class="flex items-center gap-0.5 text-xs {colors.text}">
					<IconUsers class="h-3 w-3" />
					<span>{table.capacity}</span>
				</div>

				{#if table.status === 'occupied' && table.currentSession}
					<div class="mt-0.5 flex items-center gap-0.5 text-[10px] {colors.text}">
						<IconClock class="h-2.5 w-2.5" />
						<span>{getElapsedTime(table.currentSession.startedAt)}</span>
					</div>
				{/if}
			</button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-56 p-3" align="center" side="top">
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<span class="font-semibold">{table.displayName}</span>
				<span
					class="rounded-full px-2 py-0.5 text-xs font-medium capitalize {colors.bg} {colors.text}"
				>
					{table.status.replace('_', ' ')}
				</span>
			</div>

			<div class="space-y-1 text-sm text-muted-foreground">
				<div class="flex items-center gap-2">
					<IconUsers class="h-4 w-4" />
					<span>{table.capacity} seats</span>
				</div>

				{#if table.currentSession}
					<div class="flex items-center gap-2">
						<IconReceipt class="h-4 w-4" />
						<span>Order #{table.currentSession.orderNumber}</span>
					</div>
					<div class="flex items-center gap-2">
						<IconClock class="h-4 w-4" />
						<span>Seated {getElapsedTime(table.currentSession.startedAt)}</span>
					</div>
				{/if}
			</div>

			<div class="flex flex-wrap gap-1">
				{#if table.status === 'available'}
					<Button size="sm" class="flex-1" onclick={() => onOpenOrder?.(table)}>
						Start Order
					</Button>
				{:else if table.status === 'occupied'}
					<Button size="sm" variant="outline" class="flex-1" onclick={() => onOpenOrder?.(table)}>
						View Order
					</Button>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => onStatusChange?.(table, 'available')}
					>
						Close
					</Button>
				{:else if table.status === 'reserved'}
					<Button size="sm" class="flex-1" onclick={() => onOpenOrder?.(table)}>
						Seat Party
					</Button>
				{/if}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
