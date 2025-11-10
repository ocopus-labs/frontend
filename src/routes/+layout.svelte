<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// import { ProgressBar } from '@prgm/sveltekit-progress-bar';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<!-- <ProgressBar class="text-red-500" /> -->
{@render children()}
