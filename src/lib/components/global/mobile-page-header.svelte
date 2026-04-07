<script lang="ts">
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	const isMobile = new IsMobile();

	let { title, backHref }: { title: string; backHref?: string } = $props();
</script>

{#if isMobile.current && backHref}
	<div class="flex items-center gap-3 border-b px-4 py-3 md:hidden">
		<a href={backHref} class="-ml-1 rounded-lg p-1 hover:bg-muted active:scale-95 transition-transform">
			<ArrowLeftIcon class="h-5 w-5" />
		</a>
		<h1 class="truncate text-lg font-semibold">{title}</h1>
	</div>
{/if}
