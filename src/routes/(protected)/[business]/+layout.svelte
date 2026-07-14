<script lang="ts">
	import AppSidebar from '$lib/components/global/dashboard-sidebar.svelte';
	import BottomNav from '$lib/components/global/bottom-nav.svelte';
	import SwipeSidebar from '$lib/components/global/swipe-sidebar.svelte';
	import ImpersonationBanner from '$lib/components/global/impersonation-banner.svelte';
	import AnnouncementBanner from '$lib/components/global/announcement-banner.svelte';
	import SubscriptionBanner from '$lib/components/global/subscription-banner.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		connectSocket,
		joinBusiness,
		leaveBusiness,
		onSubscriptionPlanChanged
	} from '$lib/socket';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Derive businessId from page data (populated by [slug]/+layout.server.ts)
	const businessId = $derived($page.data.businessId as string | undefined);
	const basePath = $derived(`/${$page.params.business}/${$page.params.slug}`);

	// WebSocket: listen for subscription plan changes and notify the user
	let subscriptionCleanup: (() => void) | null = null;

	onMount(async () => {
		const socket = await connectSocket();
		if (!socket) return;

		socket.on('connect', async () => {
			const bid = $page.data.businessId as string | undefined;
			if (bid) await joinBusiness(bid);
		});

		if (socket.connected) {
			const bid = $page.data.businessId as string | undefined;
			if (bid) await joinBusiness(bid);
		}

		subscriptionCleanup = await onSubscriptionPlanChanged(async (event) => {
			if (event.isUpgrade) {
				toast.success(`Your plan has been upgraded to ${event.newPlan}! Enjoy the new features.`);
			} else {
				toast.info(`Your plan has been changed to ${event.newPlan}.`);
			}
			await invalidateAll();
		});
	});

	onDestroy(() => {
		subscriptionCleanup?.();
		const bid = $page.data.businessId as string | undefined;
		if (bid) leaveBusiness(bid);
	});
</script>

<ImpersonationBanner />
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
>
	Skip to main content
</a>
<Sidebar.Provider>
	<SwipeSidebar />
	<AppSidebar businesses={data.businesses} subscription={$page.data.subscription} />
	<Sidebar.Inset id="main-content">
		<AnnouncementBanner />
		<SubscriptionBanner />
		<div class="pb-20 md:pb-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
	<BottomNav
		userRole={$page.data.userRole}
		enabledFeatures={$page.data.enabledFeatures ?? $page.data.features?.enabledFeatures ?? []}
		businessBase={basePath}
		businessId={businessId ?? ''}
	/>
</Sidebar.Provider>
