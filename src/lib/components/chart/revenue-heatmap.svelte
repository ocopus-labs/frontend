<script lang="ts">
	export interface HeatmapCell {
		day: string;
		hour: number;
		revenue: number;
	}

	let {
		data = [] as HeatmapCell[],
		formatRevenue = (v: number) => `$${v.toFixed(2)}`
	}: {
		data?: HeatmapCell[];
		formatRevenue?: (value: number) => string;
	} = $props();

	const HOURS = Array.from({ length: 24 }, (_, i) => i);

	// Ordered days of the week — Sunday first (matches JS Date.getDay())
	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Build a lookup map  day+hour → revenue
	const revenueMap = $derived(() => {
		const map = new Map<string, number>();
		for (const cell of data) {
			map.set(`${cell.day}-${cell.hour}`, cell.revenue);
		}
		return map;
	});

	// Find the max revenue value to normalise cell colours
	const maxRevenue = $derived(() => {
		if (data.length === 0) return 1;
		return Math.max(...data.map((c) => c.revenue), 1);
	});

	function cellRevenue(day: string, hour: number): number {
		return revenueMap().get(`${day}-${hour}`) ?? 0;
	}

	function cellOpacity(revenue: number): number {
		const max = maxRevenue();
		if (max === 0) return 0;
		// Minimum opacity 0.08 so empty cells are still visible; max 0.9
		return revenue > 0 ? 0.08 + (revenue / max) * 0.82 : 0;
	}

	// Tooltip state
	let tooltip = $state<{ visible: boolean; x: number; y: number; day: string; hour: number; revenue: number }>({
		visible: false,
		x: 0,
		y: 0,
		day: '',
		hour: 0,
		revenue: 0
	});

	function hourLabel(h: number): string {
		if (h === 0) return '12a';
		if (h === 12) return '12p';
		return h > 12 ? `${h - 12}p` : `${h}a`;
	}

	function showTooltip(event: MouseEvent, day: string, hour: number, revenue: number) {
		tooltip = { visible: true, x: event.clientX, y: event.clientY, day, hour, revenue };
	}

	function hideTooltip() {
		tooltip = { ...tooltip, visible: false };
	}

	function moveTooltip(event: MouseEvent) {
		if (tooltip.visible) {
			tooltip = { ...tooltip, x: event.clientX, y: event.clientY };
		}
	}
</script>

<div class="relative w-full overflow-x-auto" role="img" aria-label="Revenue heatmap by day and hour">
	<!-- Hour column headers -->
	<div class="mb-1 flex" style="padding-left: 2.75rem;">
		{#each HOURS as hour}
			<div class="flex-1 text-center text-[9px] text-muted-foreground leading-none select-none">
				{#if hour % 3 === 0}
					{hourLabel(hour)}
				{/if}
			</div>
		{/each}
	</div>

	<!-- Heatmap rows -->
	{#each DAYS as day}
		<div class="mb-0.5 flex items-center gap-0">
			<!-- Day label -->
			<div class="w-10 shrink-0 text-right pr-2 text-xs text-muted-foreground select-none">
				{day}
			</div>
			<!-- Hour cells -->
			{#each HOURS as hour}
				{@const rev = cellRevenue(day, hour)}
				{@const opacity = cellOpacity(rev)}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<div
					class="flex-1 aspect-square rounded-[2px] cursor-default transition-transform hover:scale-110 hover:z-10 relative"
					style="background-color: rgba(34,197,94,{opacity}); min-width: 12px; min-height: 12px;"
					onmouseenter={(e) => showTooltip(e, day, hour, rev)}
					onmouseleave={hideTooltip}
					onmousemove={moveTooltip}
					role="gridcell"
					tabindex="-1"
					aria-label="{day} {hourLabel(hour)}: {formatRevenue(rev)}"
				></div>
			{/each}
		</div>
	{/each}

	<!-- Legend -->
	<div class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
		<span>Low</span>
		<div class="flex gap-0.5">
			{#each [0.08, 0.25, 0.42, 0.59, 0.76, 0.9] as op}
				<div class="h-3 w-4 rounded-[2px]" style="background-color: rgba(34,197,94,{op})"></div>
			{/each}
		</div>
		<span>High</span>
	</div>
</div>

<!-- Tooltip (fixed-position, renders outside the scroll container) -->
{#if tooltip.visible}
	<div
		class="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
		style="left: {tooltip.x + 12}px; top: {tooltip.y - 36}px;"
	>
		<span class="font-medium">{tooltip.day} {hourLabel(tooltip.hour)}</span>
		&mdash;
		{formatRevenue(tooltip.revenue)}
	</div>
{/if}
