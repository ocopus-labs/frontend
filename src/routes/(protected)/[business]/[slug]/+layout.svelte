<script lang="ts">
	import type { LayoutData } from './$types';
	import ReadOnlyBanner from '$lib/components/global/read-only-banner.svelte';
	import OfflineIndicator from '$lib/components/global/offline-indicator.svelte';

	export let data: LayoutData;

	// Pass business context down to child pages
	$: businessContext = {
		businessType: data.businessType,
		business: data.business,
		config: data.config
	};
</script>

<ReadOnlyBanner role={data.userRole} />
<OfflineIndicator businessId={(data.business as any)?.id ?? ''} />
<slot {businessContext} />
