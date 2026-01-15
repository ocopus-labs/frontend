<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import NavUser from './nav-user.svelte';
	import BusinessSwitcher from './business-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { sidebarData } from '$lib/constants/sidebar-data';
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';
	import type { Business } from '$lib/api/types';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		businesses = [],
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { businesses?: Business[] } = $props();

	// Get business type and slug from URL
	const businessType = $derived($page.params.business || 'restaurant');
	const slug = $derived($page.params.slug || '');

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

	const projectItems = $derived(
		rawData.projects.map((project) => ({
			...project,
			url: replaceUrlPlaceholders(project.url)
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
		<NavMain items={navMainItems} />
		<NavProjects projects={projectItems} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
