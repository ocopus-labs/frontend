<script lang="ts">
	import '../app.css';
	// import { ProgressBar } from '@prgm/sveltekit-progress-bar';

	import { Toaster } from 'svelte-sonner';
	import ScrollToTop from '$lib/components/global/scroll-to-top.svelte';
	import PwaUpdatePrompt from '$lib/components/global/pwa-update-prompt.svelte';

	let { children } = $props();
</script>

<Toaster position="top-center" />
<!-- <ProgressBar class="text-red-500" /> -->
{@render children()}
<ScrollToTop />
<PwaUpdatePrompt />
