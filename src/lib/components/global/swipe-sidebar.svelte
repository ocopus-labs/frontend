<script lang="ts">
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';

	const sidebar = useSidebar();

	let touchStartX = 0;
	let touchStartY = 0;

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function onTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

		// Right swipe from left edge (within 30px) to open sidebar
		if (touchStartX < 30 && dx > 80 && dy < 50) {
			sidebar.setOpenMobile(true);
		}
	}
</script>

<svelte:window ontouchstart={onTouchStart} ontouchend={onTouchEnd} />
