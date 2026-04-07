<script lang="ts">
	import AppSidebar from '$lib/components/global/dashboard-sidebar.svelte';
	import BottomNav from '$lib/components/global/bottom-nav.svelte';
	import ImpersonationBanner from '$lib/components/global/impersonation-banner.svelte';
	import AnnouncementBanner from '$lib/components/global/announcement-banner.svelte';
	import SubscriptionBanner from '$lib/components/global/subscription-banner.svelte';
	import GlobalSearch from '$lib/components/search/global-search.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { connectSocket, joinBusiness, leaveBusiness, onSubscriptionPlanChanged } from '$lib/socket';
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

	// Generate breadcrumbs from current path
	const breadcrumbs = $derived(
		$page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, index, array) => {
				const href = '/' + array.slice(0, index + 1).join('/');
				const label = segment
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				return { label, href };
			})
	);

	// Hide breadcrumbs on POS new order page
	const showBreadcrumbs = $derived(!$page.url.pathname.includes('/pos/new-order'));
</script>

<ImpersonationBanner />
<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg">
	Skip to main content
</a>
<Sidebar.Provider>
	<AppSidebar businesses={data.businesses} subscription={$page.data.subscription} />
	<Sidebar.Inset id="main-content">
		<AnnouncementBanner />
		<SubscriptionBanner />
		<header
			class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex flex-1 items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
				{#if showBreadcrumbs}
					<Breadcrumb.Root>
						<Breadcrumb.List>
							{#each breadcrumbs as crumb, index}
								{#if index < breadcrumbs.length - 1}
									<Breadcrumb.Item class="hidden md:block">
										<Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
									</Breadcrumb.Item>
									<Breadcrumb.Separator class="hidden md:block" />
								{:else}
									<Breadcrumb.Item>
										<Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
									</Breadcrumb.Item>
								{/if}
							{/each}
						</Breadcrumb.List>
					</Breadcrumb.Root>
				{/if}
			</div>
			<div class="pr-4">
				{#if businessId}
					<GlobalSearch {businessId} {basePath} />
				{/if}
			</div>
		</header>
		<div class="pb-20 md:pb-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
	<BottomNav
		userRole={$page.data.userRole}
		enabledFeatures={$page.data.enabledFeatures ?? $page.data.features?.enabledFeatures ?? []}
		businessBase={basePath}
	/>
</Sidebar.Provider>
