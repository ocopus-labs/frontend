<script lang="ts">
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	// Pass business context down to child pages
	$: businessContext = {
		businessType: data.businessType,
		business: data.business,
		config: data.config
	};
</script>

<slot {businessContext} />
