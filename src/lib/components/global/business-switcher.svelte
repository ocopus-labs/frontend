<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StoreIcon from '@lucide/svelte/icons/store';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import { goto } from '$app/navigation';
	import type { Business, Franchise } from '$lib/api/types';

	let {
		businesses = [],
		franchises = [],
		currentBusiness
	}: { businesses: Business[]; franchises?: Franchise[]; currentBusiness?: Business } = $props();
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

	// Group businesses: franchise businesses grouped, independent businesses separate
	interface BusinessGroup {
		type: 'franchise' | 'independent';
		franchise?: Franchise;
		businesses: Business[];
	}

	const groupedBusinesses = $derived.by(() => {
		const groups: BusinessGroup[] = [];
		const franchiseMap = new Map<string, Franchise>();
		const franchiseBizIds = new Set<string>();

		// Build franchise lookup (from the franchise data which includes business IDs)
		for (const f of franchises ?? []) {
			franchiseMap.set(f.id, f);
		}

		// Group businesses by franchiseId (if available on the business object)
		const franchiseGroups = new Map<string, Business[]>();
		const independent: Business[] = [];

		for (const biz of businesses) {
			const fId = (biz as any).franchiseId;
			if (fId && franchiseMap.has(fId)) {
				if (!franchiseGroups.has(fId)) {
					franchiseGroups.set(fId, []);
				}
				franchiseGroups.get(fId)!.push(biz);
			} else {
				independent.push(biz);
			}
		}

		// Add franchise groups
		for (const [fId, bizList] of franchiseGroups) {
			groups.push({
				type: 'franchise',
				franchise: franchiseMap.get(fId),
				businesses: bizList,
			});
		}

		// Add independent businesses
		if (independent.length > 0) {
			groups.push({
				type: 'independent',
				businesses: independent,
			});
		}

		return groups;
	});

	// Flat list for keyboard shortcuts
	const allBusinesses = $derived(businesses);
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
							class="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground"
						>
							{#if currentBusiness?.logo}
								<img
									src={currentBusiness.logo}
									alt={currentBusiness.name}
									loading="lazy"
									class="object-contain"
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
				{#each groupedBusinesses as group}
					{#if group.type === 'franchise' && group.franchise}
						<DropdownMenu.Label class="text-xs text-muted-foreground">
							<Building2Icon class="mr-1 inline size-3" />
							{group.franchise.name}
						</DropdownMenu.Label>
						{#each group.businesses as business (business.id)}
							<DropdownMenu.Item
								onSelect={() => switchBusiness(business)}
								class="gap-2 p-2 pl-4"
								disabled={business.slug === currentBusiness?.slug}
							>
								<div class="flex size-6 items-center justify-center rounded-md border">
									{#if business.logo}
										<img
											src={business.logo}
											alt={business.name}
											loading="lazy"
											class="size-3.5 object-contain"
										/>
									{:else}
										<span class="text-xs font-medium"
											>{getInitial(business.name)}</span
										>
									{/if}
								</div>
								<span class="flex-1 truncate">{business.name}</span>
								<span class="text-xs text-muted-foreground capitalize"
									>{business.type}</span
								>
							</DropdownMenu.Item>
						{/each}
						<DropdownMenu.Separator />
					{:else}
						<DropdownMenu.Label class="text-xs text-muted-foreground"
							>Independent</DropdownMenu.Label
						>
						{#each group.businesses as business, index (business.id)}
							<DropdownMenu.Item
								onSelect={() => switchBusiness(business)}
								class="gap-2 p-2"
								disabled={business.slug === currentBusiness?.slug}
							>
								<div class="flex size-6 items-center justify-center rounded-md border">
									{#if business.logo}
										<img
											src={business.logo}
											alt={business.name}
											loading="lazy"
											class="size-3.5 object-contain"
										/>
									{:else}
										<span class="text-xs font-medium"
											>{getInitial(business.name)}</span
										>
									{/if}
								</div>
								<span class="flex-1 truncate">{business.name}</span>
								<span class="text-xs text-muted-foreground capitalize"
									>{business.type}</span
								>
							</DropdownMenu.Item>
						{/each}
						<DropdownMenu.Separator />
					{/if}
				{/each}
				{#if businesses.length === 0}
					<DropdownMenu.Item disabled class="gap-2 p-2 text-muted-foreground">
						No businesses found
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
				{/if}
				<DropdownMenu.Item class="gap-2 p-2" onSelect={goToAllBusinesses}>
					<div
						class="flex size-6 items-center justify-center rounded-md border bg-transparent"
					>
						<LayoutGridIcon class="size-4" />
					</div>
					<div class="font-medium text-muted-foreground">All businesses</div>
				</DropdownMenu.Item>
				<DropdownMenu.Item class="gap-2 p-2" onSelect={addBusiness}>
					<div
						class="flex size-6 items-center justify-center rounded-md border bg-transparent"
					>
						<PlusIcon class="size-4" />
					</div>
					<div class="font-medium text-muted-foreground">Add business</div>
				</DropdownMenu.Item>
				{#if (franchises ?? []).length > 0}
					<DropdownMenu.Item
						class="gap-2 p-2"
						onSelect={() => goto('/franchise')}
					>
						<div
							class="flex size-6 items-center justify-center rounded-md border bg-transparent"
						>
							<Building2Icon class="size-4" />
						</div>
						<div class="font-medium text-muted-foreground">My Franchises</div>
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
