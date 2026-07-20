<script lang="ts" module>
	export type TableSort = 'number' | 'longest' | 'highest';
</script>

<script lang="ts">
	import type { Table, TableStatus } from '$lib/api';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { StatusPill } from '$lib/components/data-display';
	import {
		IconClock,
		IconDotsVertical,
		IconPencil,
		IconQrcode,
		IconSearch,
		IconTrash
	} from '@tabler/icons-svelte';

	interface Props {
		tables: Table[];
		/** Section/area names, for the Area filter. */
		sections?: string[];
		/** Formats money in the business's currency. Supplied by the page. */
		formatCurrency: (amount: number) => string;
		/** Opens the table's detail/edit dialog. */
		onSelect?: (table: Table) => void;
		/** Primary action: start a new order, or open the running one. */
		onOpenOrder?: (table: Table) => void;
		/** Free the table (settle/close out the session). */
		onStatusChange?: (table: Table, status: TableStatus) => void;
		onGenerateQr?: (table: Table) => void;
		onDelete?: (table: Table) => void;
	}

	let {
		tables,
		sections = [],
		formatCurrency,
		onSelect,
		onOpenOrder,
		onStatusChange,
		onGenerateQr,
		onDelete
	}: Props = $props();

	/** Status drives the one action worth a full-width button on the card. */
	function primaryAction(table: Table): { label: string; variant: 'default' | 'outline' } | null {
		switch (table.status) {
			case 'available':
				return { label: 'Start Order', variant: 'default' };
			case 'occupied':
				return { label: 'View Order', variant: 'outline' };
			case 'reserved':
				return { label: 'Seat Party', variant: 'default' };
			default:
				// Maintenance / out of service — nothing to start or settle.
				return null;
		}
	}

	let search = $state('');
	let statusFilter = $state('all');
	let areaFilter = $state('all');
	let sort = $state<TableSort>('number');

	const sortLabels: Record<TableSort, string> = {
		number: 'Table number',
		longest: 'Longest seated',
		highest: 'Highest bill'
	};

	/**
	 * Ticks seated durations without a refetch. The money figure deliberately
	 * does not age here — it comes from the server, and silently advancing a
	 * bill in place would be worse than showing a stale-but-fetched one.
	 */
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(id);
	});

	function elapsedMinutes(table: Table): number {
		const startedAt = table.currentSession?.startedAt;
		if (!startedAt) return 0;
		return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000));
	}

	function formatElapsed(minutes: number): string {
		if (minutes < 60) return `${minutes}m`;
		return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	}

	/** Small / Medium / Large, matching the seat bands the glyph draws. */
	function sizeLabel(capacity: number): string {
		if (capacity <= 4) return 'Small';
		if (capacity <= 6) return 'Medium';
		return 'Large';
	}

	const statusPill: Record<TableStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
		available: 'success',
		occupied: 'error',
		// Amber, not the mockup's blue — this has to agree with the Reserved KPI
		// card above it, and in our palette blue is spoken for (delivery/info).
		reserved: 'warning',
		// `info` here is StatusPill's own variant, which is defined. Don't reach
		// for the bare `text-info`/`bg-info` utilities — those aren't real tokens.
		maintenance: 'info',
		out_of_service: 'neutral'
	};

	/** Tint for the seat glyph, keyed to status so the card reads at a glance. */
	const glyphTint: Record<TableStatus, string> = {
		available: 'text-success',
		occupied: 'text-destructive',
		reserved: 'text-warning',
		maintenance: 'text-muted-foreground',
		out_of_service: 'text-muted-foreground'
	};

	/**
	 * Seat positions for the little table diagram. Chairs go on the long sides
	 * first and only spill to the ends past 6, which is how the real furniture
	 * works and keeps a 2-top visually distinct from an 8-top.
	 */
	function seatLayout(capacity: number) {
		const n = Math.max(1, Math.min(capacity, 10));
		const ends = n >= 8 ? 1 : 0;
		const remaining = n - ends * 2;
		const top = Math.ceil(remaining / 2);
		const bottom = remaining - top;
		return { top, bottom, ends };
	}

	function seatXs(count: number): number[] {
		if (count <= 0) return [];
		// Spread evenly across the table body (x from 10 to 30).
		const span = 20;
		const step = span / count;
		return Array.from({ length: count }, (_, i) => 10 + step * (i + 0.5));
	}

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const rows = tables.filter((t) => {
			const matchesSearch =
				!q || t.displayName.toLowerCase().includes(q) || t.tableNumber.toLowerCase().includes(q);
			const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
			const matchesArea = areaFilter === 'all' || t.position?.section === areaFilter;
			return matchesSearch && matchesStatus && matchesArea;
		});

		switch (sort) {
			case 'longest':
				// Unseated tables have no duration, so a descending sort parks them
				// after the seated ones rather than floating 0s to the top.
				return rows.sort((a, b) => elapsedMinutes(b) - elapsedMinutes(a));
			case 'highest':
				return rows.sort(
					(a, b) => (b.currentSession?.currentTotal ?? -1) - (a.currentSession?.currentTotal ?? -1)
				);
			default:
				return rows.sort((a, b) =>
					a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
				);
		}
	});
</script>

{#snippet seatGlyph(capacity: number, tint: string)}
	{@const seats = seatLayout(capacity)}
	<svg viewBox="0 0 40 32" class="h-8 w-10 shrink-0 {tint}" fill="currentColor" aria-hidden="true">
		{#each seatXs(seats.top) as x, i (i)}
			<rect x={x - 2} y="3" width="4" height="5" rx="1.5" opacity="0.55" />
		{/each}
		{#each seatXs(seats.bottom) as x, i (i)}
			<rect x={x - 2} y="24" width="4" height="5" rx="1.5" opacity="0.55" />
		{/each}
		{#if seats.ends}
			<rect x="3" y="13" width="4" height="6" rx="1.5" opacity="0.55" />
			<rect x="33" y="13" width="4" height="6" rx="1.5" opacity="0.55" />
		{/if}
		<rect x="9" y="11" width="22" height="10" rx="2.5" opacity="0.9" />
	</svg>
{/snippet}

<div class="flex flex-col gap-4">
	<!-- Filters -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
		<div class="relative max-w-sm flex-1">
			<IconSearch class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={search} placeholder="Search tables..." class="pl-9" />
		</div>
		<div class="flex flex-wrap gap-2 sm:ml-auto">
			<Select.Root type="single" bind:value={statusFilter}>
				<Select.Trigger class="w-36 capitalize">
					{statusFilter === 'all' ? 'All Statuses' : statusFilter.replace('_', ' ')}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all">All Statuses</Select.Item>
					<Select.Item value="available">Available</Select.Item>
					<Select.Item value="occupied">Occupied</Select.Item>
					<Select.Item value="reserved">Reserved</Select.Item>
					<Select.Item value="maintenance">Maintenance</Select.Item>
					<Select.Item value="out_of_service">Out of service</Select.Item>
				</Select.Content>
			</Select.Root>

			{#if sections.length > 0}
				<Select.Root type="single" bind:value={areaFilter}>
					<Select.Trigger class="w-36">
						{areaFilter === 'all' ? 'All Areas' : areaFilter}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">All Areas</Select.Item>
						{#each sections as section (section)}
							<Select.Item value={section}>{section}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}

			<Select.Root type="single" bind:value={sort}>
				<Select.Trigger class="w-40">{sortLabels[sort]}</Select.Trigger>
				<Select.Content>
					<Select.Item value="number">Table number</Select.Item>
					<Select.Item value="longest">Longest seated</Select.Item>
					<Select.Item value="highest">Highest bill</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each filtered as table (table.id)}
			{@const session = table.currentSession}
			{@const action = primaryAction(table)}
			<Card.Root class="gap-0 overflow-hidden p-0">
				<!--
					Only the summary is a button. The action row below sits outside it —
					nesting buttons is invalid HTML, and wrapping the card in one would
					force every action to preventDefault its way back out.
				-->
				<button
					type="button"
					class="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/50"
					onclick={() => onSelect?.(table)}
				>
					<div class="flex items-center justify-between gap-2">
						<div class="flex min-w-0 items-center gap-2">
							{@render seatGlyph(table.capacity, glyphTint[table.status])}
							<span class="truncate text-sm font-semibold" title={table.displayName}>
								{table.displayName}
							</span>
						</div>
						<!--
							No dot: the pill is already tinted and the word says it. Dot +
							colour + label is the same fact three times.
						-->
						<StatusPill
							size="sm"
							dot={false}
							label={table.status.replace('_', ' ')}
							status={statusPill[table.status]}
							class="shrink-0 capitalize"
						/>
					</div>

					<div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
						<div class="flex min-w-0 items-center gap-3">
							<span>{sizeLabel(table.capacity)}</span>
							<span>{table.capacity} Person</span>
							{#if session}
								<span class="flex items-center gap-1">
									<IconClock class="h-3.5 w-3.5" />
									{formatElapsed(elapsedMinutes(table))}
								</span>
							{/if}
						</div>

						<!--
							Only seated tables carry an amount. The reference design shows a
							price on every tile, but an available table has no bill — printing
							one would be inventing a number.
						-->
						{#if session}
							<span class="shrink-0 text-sm font-semibold text-foreground tabular-nums">
								{#if typeof session.currentTotal === 'number'}
									{formatCurrency(session.currentTotal)}
								{:else}
									<!-- Never 0 — the order didn't resolve, so the amount is unknown. -->
									<span class="text-muted-foreground">—</span>
								{/if}
							</span>
						{/if}
					</div>
				</button>

				<div class="flex items-center gap-2 border-t border-border px-4 py-3">
					{#if action}
						<Button
							size="sm"
							variant={action.variant}
							class="flex-1"
							onclick={() => onOpenOrder?.(table)}
						>
							{action.label}
						</Button>
					{/if}
					{#if table.status === 'occupied'}
						<Button
							size="sm"
							variant="secondary"
							onclick={() => onStatusChange?.(table, 'available')}
						>
							Free
						</Button>
					{/if}

					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="icon"
									class="size-8 shrink-0 {action ? '' : 'ml-auto'}"
									aria-label="Actions for {table.displayName}"
								>
									<IconDotsVertical class="h-4 w-4" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={() => onSelect?.(table)}>
								<IconPencil class="mr-2 size-4" />
								Edit table
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => onGenerateQr?.(table)}>
								<IconQrcode class="mr-2 size-4" />
								QR code
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								disabled={table.status === 'occupied'}
								onclick={() => onDelete?.(table)}
							>
								<IconTrash class="mr-2 size-4" />
								Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</Card.Root>
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="py-8 text-center text-sm text-muted-foreground">No tables match these filters.</p>
	{/if}
</div>
