<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import { setShimmerConfig } from '@shimmer-from-structure/svelte';
	import ScrollToTop from '$lib/components/global/scroll-to-top.svelte';
	import PwaUpdatePrompt from '$lib/components/global/pwa-update-prompt.svelte';
	import CookieConsent from '$lib/components/global/cookie-consent.svelte';

	let { children } = $props();

	// App-wide skeleton theming for <Shimmer>. The colors are CSS vars (defined
	// in app.css for both light and dark), so shimmer skeletons automatically
	// follow the active theme instead of the library's white-on-white defaults.
	setShimmerConfig({
		backgroundColor: 'var(--shimmer-base)',
		shimmerColor: 'var(--shimmer-highlight)',
		duration: 1.4
	});
</script>

<Toaster position="top-center" />
{@render children()}
<ScrollToTop />
<PwaUpdatePrompt />
<CookieConsent />
