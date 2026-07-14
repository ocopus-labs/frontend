<script lang="ts">
	import UserDashboardSidebar from '$lib/components/global/user-dashboard-sidebar.svelte';
	import ImpersonationBanner from '$lib/components/global/impersonation-banner.svelte';
	import AnnouncementBanner from '$lib/components/global/announcement-banner.svelte';
	import SubscriptionBanner from '$lib/components/global/subscription-banner.svelte';
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
	<UserDashboardSidebar businesses={data.businesses} subscription={data.subscription} />
	<Sidebar.Inset id="main-content">
		<AnnouncementBanner />
		<SubscriptionBanner />
		<MobileTopBar />
		<div class="flex-1 overflow-auto p-4 pt-2">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
