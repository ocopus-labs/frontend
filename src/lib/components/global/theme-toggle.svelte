<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { Button } from '$lib/components/ui/button/index.js';

	let dark = $state(false);

	function init() {
		if (typeof window === 'undefined') return;
		dark =
			localStorage.getItem('theme') === 'dark' ||
			(!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
	}

	init();

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}
</script>

<Button variant="ghost" size="icon" onclick={toggle} aria-label="Toggle dark mode">
	{#if dark}
		<SunIcon class="size-4" />
	{:else}
		<MoonIcon class="size-4" />
	{/if}
</Button>
