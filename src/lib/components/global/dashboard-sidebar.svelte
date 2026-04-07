<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import BusinessSwitcher from './business-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { sidebarData } from '$lib/constants/sidebar-data';
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';
	import type { Business } from '$lib/api/types';
	import type { Subscription } from '$lib/api/subscription';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		businesses = [],
		subscription = null,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		businesses?: Business[];
		subscription?: Subscription | null;
	} = $props();

	// Get business type and slug from URL
	const businessType = $derived($page.params.business || 'restaurant');
	const slug = $derived($page.params.slug || '');

	// Get userRole from nested [slug] layout data
	const userRole = $derived(($page.data.userRole as string) || null);

	// Get enabled features from layout data (loaded in [slug]/+layout.server.ts)
	const enabledFeatures = $derived(
		($page.data.enabledFeatures as string[] | undefined) ??
		($page.data.features?.enabledFeatures as string[] | undefined) ??
		null
	);

	// Use business-level subscription from [slug] layout (owner's subscription)
	// instead of the user's personal subscription from parent layout
	const businessSubscription = $derived(
		($page.data.subscription as Subscription | null) ?? subscription
	);

	// Helper function to replace URL placeholders with actual values
	function replaceUrlPlaceholders(url: string): string {
		return url.replace('[business]', businessType).replace('[slug]', slug);
	}

	// Get sidebar data for current business type
	const rawData = $derived(
		sidebarData[businessType as keyof typeof sidebarData] || sidebarData.restaurant
	);

	// Process nav items to replace URL placeholders
	const navMainItems = $derived(
		rawData.navMain.map((item) => ({
			...item,
			url: replaceUrlPlaceholders(item.url),
			items: item.items?.map((subItem) => ({
				...subItem,
				url: replaceUrlPlaceholders(subItem.url)
			}))
		}))
	);

	// Get current business from the list
	const currentBusiness = $derived(businesses.find((b) => b.slug === slug));
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<BusinessSwitcher {businesses} {currentBusiness} />
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={navMainItems} subscription={businessSubscription} {userRole} {enabledFeatures} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser subscription={businessSubscription} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
