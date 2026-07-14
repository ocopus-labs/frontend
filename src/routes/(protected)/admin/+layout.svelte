<script lang="ts">
	import AdminSidebar from '$lib/components/admin/admin-sidebar.svelte';
	import ImpersonationBanner from '$lib/components/global/impersonation-banner.svelte';
	import MobileTopBar from '$lib/components/global/mobile-top-bar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<ImpersonationBanner />
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
>
	Skip to main content
</a>
<Sidebar.Provider>
	<AdminSidebar stats={data.stats} />
	<Sidebar.Inset id="main-content">
		<MobileTopBar />
		<div class="flex-1 overflow-auto p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
