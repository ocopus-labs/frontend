<script lang="ts">
	import type { LayoutData } from './$types';
	import ReadOnlyBanner from '$lib/components/global/read-only-banner.svelte';
	import OfflineIndicator from '$lib/components/global/offline-indicator.svelte';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Show toast when redirected from a disabled feature route
	$effect(() => {
		if (!browser) return;
		const disabledFeature = $page.url.searchParams.get('feature_disabled');
		if (disabledFeature) {
			toast.error(`The "${disabledFeature}" feature is not enabled. Enable it in Settings > Features.`);
			const url = new URL($page.url);
			url.searchParams.delete('feature_disabled');
			window.history.replaceState({}, '', url.pathname + (url.search || ''));
		}
	});

	// Pass business context down to child pages
	const businessContext = $derived({
		businessType: data.businessType,
		business: data.business,
		config: data.config
	});
</script>

<ReadOnlyBanner role={data.userRole} />
<OfflineIndicator businessId={(data.business as any)?.id ?? ''} />
{@render children()}
