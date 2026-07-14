<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { Snippet } from 'svelte';

	// Slim, mobile-only top bar. On desktop (>= md) it is hidden entirely because the
	// sidebar owns the collapse trigger and search. On mobile the sidebar is an
	// off-canvas sheet, so we keep a persistent hamburger here to open it, plus an
	// optional trailing action (e.g. search) supplied by the host layout.
	let { trailing }: { trailing?: Snippet } = $props();
</script>

<header
	class="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 md:hidden"
>
	<Sidebar.Trigger class="-ml-1" />
	{#if trailing}
		<div class="flex items-center gap-1">
			{@render trailing()}
		</div>
	{/if}
</header>
