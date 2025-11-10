<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import NavUser from './nav-user.svelte';
	import TeamSwitcher from './business-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { sidebarData } from '$lib/constants/sidebar-data';
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	// Get business type from URL
	const businessType = $derived($page.params.business || 'restaurant');

	// Get sidebar data for current business type
	const data = $derived(
		sidebarData[businessType as keyof typeof sidebarData] || sidebarData.restaurant
	);
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher teams={data.teams} />
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		<NavProjects projects={data.projects} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
