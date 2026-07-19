<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		/** Max columns at the widest breakpoint. Steps up 1 → 2 → n responsively. */
		columns?: 2 | 3 | 4 | 5;
		class?: string;
		children: Snippet;
	}

	let { columns = 4, class: className = '', children }: Props = $props();

	// Literal strings so Tailwind picks up the grid utilities.
	const columnClass: Record<2 | 3 | 4 | 5, string> = {
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
		4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
		5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
	};
</script>

<div class={cn('grid gap-4', columnClass[columns], className)}>
	{@render children()}
</div>
