<script lang="ts">
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import { Button } from '$lib/components/ui/button/index.js';

	let visible = $state(false);

	function handleScroll() {
		visible = window.scrollY > 400;
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:window onscroll={handleScroll} />

{#if visible}
	<Button
		variant="secondary"
		size="icon"
		class="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
		onclick={scrollToTop}
		aria-label="Scroll to top"
	>
		<ArrowUpIcon class="size-4" />
	</Button>
{/if}
