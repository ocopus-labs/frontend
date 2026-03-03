<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import ScrollToTop from '$lib/components/global/scroll-to-top.svelte';
	import PwaUpdatePrompt from '$lib/components/global/pwa-update-prompt.svelte';

	let { children } = $props();
</script>

<Toaster position="top-center" />
{@render children()}
<ScrollToTop />
<PwaUpdatePrompt />
