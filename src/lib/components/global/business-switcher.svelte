<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StoreIcon from '@lucide/svelte/icons/store';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import { goto } from '$app/navigation';
	import type { Business } from '$lib/api/types';

	let {
		businesses = [],
		currentBusiness
	}: { businesses: Business[]; currentBusiness?: Business } = $props();
	const sidebar = useSidebar();

	// Get display name - first letter capitalized
	function getInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	// Navigate to a different business
	function switchBusiness(business: Business) {
		goto(`/${business.type}/${business.slug}/dashboard`);
	}

	// Navigate to add new business
	function addBusiness() {
		goto('/business/setup');
	}

	// Navigate back to all businesses
	function goToAllBusinesses() {
		goto('/dashboard');
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<div
							class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
						>
							{#if currentBusiness?.logo}
								<img
									src={currentBusiness.logo}
									alt={currentBusiness.name}
									class="size-4 object-contain"
								/>
							{:else}
								<StoreIcon class="size-4" />
							{/if}
						</div>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">
								{currentBusiness?.name || 'Select Business'}
							</span>
							<span class="truncate text-xs capitalize"
								>{currentBusiness?.type || 'No business selected'}</span
							>
						</div>
						<ChevronsUpDownIcon class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				align="start"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				sideOffset={4}
			>
				<DropdownMenu.Label class="text-xs text-muted-foreground"
					>Your Businesses</DropdownMenu.Label
				>
				{#each businesses as business, index (business.id)}
					<DropdownMenu.Item
						onSelect={() => switchBusiness(business)}
						class="gap-2 p-2"
						disabled={business.slug === currentBusiness?.slug}
					>
						<div class="flex size-6 items-center justify-center rounded-md border">
							{#if business.logo}
								<img src={business.logo} alt={business.name} class="size-3.5 object-contain" />
							{:else}
								<span class="text-xs font-medium">{getInitial(business.name)}</span>
							{/if}
						</div>
						<span class="flex-1 truncate">{business.name}</span>
						<span class="text-xs text-muted-foreground capitalize">{business.type}</span>
						{#if index < 9}
							<DropdownMenu.Shortcut>⌘{index + 1}</DropdownMenu.Shortcut>
						{/if}
					</DropdownMenu.Item>
				{/each}
				{#if businesses.length === 0}
					<DropdownMenu.Item disabled class="gap-2 p-2 text-muted-foreground">
						No businesses found
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2 p-2" onSelect={goToAllBusinesses}>
					<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
						<LayoutGridIcon class="size-4" />
					</div>
					<div class="font-medium text-muted-foreground">All businesses</div>
				</DropdownMenu.Item>
				<DropdownMenu.Item class="gap-2 p-2" onSelect={addBusiness}>
					<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
						<PlusIcon class="size-4" />
					</div>
					<div class="font-medium text-muted-foreground">Add business</div>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
