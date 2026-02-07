<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// import { ProgressBar } from '@prgm/sveltekit-progress-bar';

	import { Toaster } from 'svelte-sonner';
	import ScrollToTop from '$lib/components/global/scroll-to-top.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster />
<!-- <ProgressBar class="text-red-500" /> -->
{@render children()}
<ScrollToTop />
