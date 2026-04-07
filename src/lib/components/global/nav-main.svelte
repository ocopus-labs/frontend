<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Subscription } from '$lib/api/subscription';
	import type { NavItem, SidebarRole } from '$lib/constants/sidebar-data';
	import UpgradePromptDialog from './upgrade-prompt-dialog.svelte';
	import { page } from '$app/stores';

	let {
		items,
		subscription = null,
		userRole = null,
		enabledFeatures = null
	}: {
		items: NavItem[];
		subscription?: Subscription | null;
		userRole?: string | null;
		enabledFeatures?: string[] | null;
	} = $props();

	// State for upgrade dialog
	let upgradeDialogOpen = $state(false);
	let selectedFeatureName = $state('');
	let selectedRequiredPlan = $state<'PRO' | 'ENTERPRISE'>('PRO');

	const pathname = $derived($page.url.pathname);

	// Whether the current user can manage subscription (owners only)
	const canManageSubscription = $derived(
		!userRole || userRole === 'owner' || userRole === 'restaurant_owner'
	);

	// Filter items based on user role, subscription, and enabled features
	const visibleItems = $derived(
		items.filter((item) => {
			// Role-based filtering: hide management pages from non-permitted roles
			if (item.allowedRoles) {
				if (userRole && !item.allowedRoles.includes(userRole as SidebarRole)) {
					return false;
				}
			}

			// Dynamic feature filtering: if the business has an enabledFeatures list,
			// hide items whose requiredFeature is not in that list.
			// This applies to all roles — if a feature is off, the nav item is hidden.
			if (enabledFeatures !== null && item.requiredFeature) {
				if (!enabledFeatures.includes(item.requiredFeature as string)) {
					return false;
				}
			}

			// Subscription-based filtering for non-owners:
			// If a plan-locked feature and user can't manage subscription, hide it entirely
			// (no point showing upgrade prompts to staff who can't upgrade)
			if (!canManageSubscription && item.requiredPlan) {
				return !isItemLocked(item);
			}
			return true;
		})
	);

	// Check if a parent group should be open (current path starts with its base url)
	function isGroupActive(item: NavItem): boolean {
		return pathname.startsWith(item.url);
	}

	// Check if a sub-item is the current page
	function isSubItemActive(subItem: { url: string }): boolean {
		return pathname === subItem.url;
	}

	// Check if a nav item is locked based on subscription tier (only relevant for owners)
	function isItemLocked(item: NavItem): boolean {
		if (!item.requiredPlan) return false;
		if (item.requiredPlan === 'ENTERPRISE') {
			return !subscription?.plan || subscription.plan.slug !== 'enterprise';
		}
		return !subscription?.plan || subscription.plan.slug === 'free';
	}

	// Handle clicking on a locked item
	function handleLockedClick(item: NavItem, event: MouseEvent) {
		if (isItemLocked(item)) {
			event.preventDefault();
			event.stopPropagation();
			selectedFeatureName = item.title;
			selectedRequiredPlan = item.requiredPlan || 'PRO';
			upgradeDialogOpen = true;
		}
	}
</script>

<UpgradePromptDialog
	bind:open={upgradeDialogOpen}
	featureName={selectedFeatureName}
	requiredPlan={selectedRequiredPlan}
/>

<Sidebar.Group>
	<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each visibleItems as item (item.title)}
			{@const locked = isItemLocked(item)}
			{@const groupActive = isGroupActive(item)}
			{@const hasSubItems = item.items && item.items.length > 0}
			{#if hasSubItems}
				<Collapsible.Root open={groupActive && !locked} class="group/collapsible">
					{#snippet child({ props })}
						<Sidebar.MenuItem {...props}>
							<Collapsible.Trigger onclick={(e) => locked && handleLockedClick(item, e)}>
								{#snippet child({ props })}
									<Sidebar.MenuButton
										{...props}
										isActive={groupActive}
										tooltipContent={locked
											? `${item.title} (${item.requiredPlan} plan required)`
											: item.title}
										class={locked ? 'opacity-60' : ''}
									>
										{#if locked}
											<LockIcon class="size-4 text-muted-foreground" />
										{:else if item.icon}
											<item.icon />
										{/if}
										<span class={locked ? 'text-muted-foreground' : ''}>{item.title}</span>
										{#if locked && item.requiredPlan}
											<Badge variant="outline" class="ml-auto mr-1 text-[10px] px-1.5 py-0">
												{item.requiredPlan}
											</Badge>
										{:else}
											<ChevronRightIcon
												class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
											/>
										{/if}
									</Sidebar.MenuButton>
								{/snippet}
							</Collapsible.Trigger>
							{#if !locked}
								<Collapsible.Content>
									<Sidebar.MenuSub>
										{#each item.items ?? [] as subItem (subItem.title)}
											<Sidebar.MenuSubItem>
												<Sidebar.MenuSubButton isActive={isSubItemActive(subItem)}>
													{#snippet child({ props })}
														<a href={subItem.url} {...props}>
															<span>{subItem.title}</span>
														</a>
													{/snippet}
												</Sidebar.MenuSubButton>
											</Sidebar.MenuSubItem>
										{/each}
									</Sidebar.MenuSub>
								</Collapsible.Content>
							{/if}
						</Sidebar.MenuItem>
					{/snippet}
				</Collapsible.Root>
			{:else}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={groupActive}
						tooltipContent={locked
							? `${item.title} (${item.requiredPlan} plan required)`
							: item.title}
						class={locked ? 'opacity-60' : ''}
						onclick={(e) => locked && handleLockedClick(item, e)}
					>
						{#snippet child({ props })}
							<a href={locked ? '#' : item.url} {...props}>
								{#if locked}
									<LockIcon class="size-4 text-muted-foreground" />
								{:else if item.icon}
									<item.icon />
								{/if}
								<span class={locked ? 'text-muted-foreground' : ''}>{item.title}</span>
								{#if locked && item.requiredPlan}
									<Badge variant="outline" class="ml-auto mr-1 text-[10px] px-1.5 py-0">
										{item.requiredPlan}
									</Badge>
								{/if}
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
