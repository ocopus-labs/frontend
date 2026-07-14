<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	type Variant = 'page' | 'list' | 'card' | 'inline';

	interface Props {
		/**
		 * - `page`   — a page-title skeleton plus a few content blocks (default)
		 * - `list`   — `rows` stacked row skeletons (tables/lists)
		 * - `card`   — a responsive grid of `count` card skeletons
		 * - `inline` — a centered spinner with an optional label (small regions)
		 */
		variant?: Variant;
		/** Row count for `list`. */
		rows?: number;
		/** Card count for `card`. */
		count?: number;
		/** Accessible label announced to screen readers. */
		label?: string;
		class?: string;
	}

	let {
		variant = 'page',
		rows = 5,
		count = 4,
		label = 'Loading',
		class: className = ''
	}: Props = $props();
</script>

<div role="status" aria-label={label} class="w-full {className}">
	<span class="sr-only">{label}…</span>

	{#if variant === 'inline'}
		<div class="flex items-center justify-center gap-2 py-6 text-muted-foreground">
			<Spinner class="size-5" />
			<span class="text-sm">{label}…</span>
		</div>
	{:else if variant === 'list'}
		<div class="flex flex-col gap-3">
			{#each Array(rows) as _, i (i)}
				<div class="flex items-center gap-3">
					<Skeleton class="size-10 shrink-0 rounded-full" />
					<div class="flex flex-1 flex-col gap-2">
						<Skeleton class="h-4 w-1/3" />
						<Skeleton class="h-3 w-1/2" />
					</div>
					<Skeleton class="h-8 w-16 shrink-0" />
				</div>
			{/each}
		</div>
	{:else if variant === 'card'}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(count) as _, i (i)}
				<div class="flex flex-col gap-3 rounded-lg border p-4">
					<Skeleton class="h-4 w-2/3" />
					<Skeleton class="h-8 w-1/2" />
					<Skeleton class="h-3 w-full" />
				</div>
			{/each}
		</div>
	{:else}
		<!-- page -->
		<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<Skeleton class="h-7 w-48" />
				<Skeleton class="h-4 w-72" />
			</div>
			<div class="flex flex-col gap-3">
				{#each Array(rows) as _, i (i)}
					<Skeleton class="h-16 w-full" />
				{/each}
			</div>
		</div>
	{/if}
</div>
