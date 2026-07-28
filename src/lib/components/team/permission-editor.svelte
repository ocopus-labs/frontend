<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { IconLoader2, IconChevronDown, IconChevronRight } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { updateMemberPermissions } from '$lib/api/team';
	import { userFriendlyError } from '$lib/utils/error';
	import type { PermissionTree, TeamMember } from '$lib/api/team';

	let {
		open = $bindable(false),
		member,
		permissionTree,
		businessId,
		onSaved
	}: {
		open: boolean;
		member: TeamMember | null;
		permissionTree: PermissionTree | null;
		businessId: string;
		onSaved?: () => void;
	} = $props();

	let customPermissions = $state<Set<string>>(new Set());
	let saving = $state(false);
	let expandedCategories = $state<Set<string>>(new Set());

	// When member changes, load their current permissions
	$effect(() => {
		if (member) {
			customPermissions = new Set(member.permissions || []);
			// Expand all categories by default
			if (permissionTree) {
				expandedCategories = new Set(permissionTree.categories.map((c) => c.category));
			}
		}
	});

	// Get default permissions for the member's role
	const rolePermissions = $derived(
		member && permissionTree
			? new Set(permissionTree.roleDefaults[member.role] || [])
			: new Set<string>()
	);

	// Check if a permission is currently granted (either by role default or custom)
	function isGranted(permKey: string): boolean {
		return rolePermissions.has(permKey) || customPermissions.has(permKey);
	}

	// Check if permission comes from role (not custom override)
	function isRoleDefault(permKey: string): boolean {
		return rolePermissions.has(permKey);
	}

	// Count how many permissions in a category are granted
	function categoryGrantedCount(categoryPermissions: { key: string }[]): number {
		return categoryPermissions.filter((p) => isGranted(p.key)).length;
	}

	function togglePermission(permKey: string) {
		const next = new Set(customPermissions);
		if (next.has(permKey)) {
			next.delete(permKey);
		} else {
			next.add(permKey);
		}
		customPermissions = next;
	}

	function toggleCategory(catKey: string) {
		const next = new Set(expandedCategories);
		if (next.has(catKey)) {
			next.delete(catKey);
		} else {
			next.add(catKey);
		}
		expandedCategories = next;
	}

	function resetToDefaults() {
		customPermissions = new Set();
	}

	// Check if there are any custom overrides
	const hasCustomOverrides = $derived(() => {
		if (!permissionTree) return false;
		for (const perm of customPermissions) {
			if (!rolePermissions.has(perm)) return true;
		}
		return false;
	});

	async function save() {
		if (!member) return;
		saving = true;
		try {
			await updateMemberPermissions(businessId, member.id, {
				permissions: [...customPermissions]
			});
			toast.success('Permissions updated');
			open = false;
			onSaved?.();
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to update permissions'));
		} finally {
			saving = false;
		}
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-[400px] sm:w-[540px]">
		<Sheet.Header>
			<Sheet.Title>Edit Permissions</Sheet.Title>
			<Sheet.Description>
				{#if member}
					<div class="mt-1 flex items-center gap-2">
						<span class="font-medium text-foreground">{member.user.name}</span>
						<Badge variant="secondary">{member.role}</Badge>
					</div>
					<p class="mt-1 text-xs">Customize permissions beyond the default role settings.</p>
				{/if}
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 overflow-y-auto px-4 py-2">
			{#if permissionTree && member}
				<div class="space-y-1">
					{#each permissionTree.categories as category (category.category)}
						{@const granted = categoryGrantedCount(category.permissions)}
						{@const total = category.permissions.length}
						{@const isExpanded = expandedCategories.has(category.category)}

						<Collapsible.Root
							open={isExpanded}
							onOpenChange={() => toggleCategory(category.category)}
						>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
							>
								<div class="flex items-center gap-2">
									{#if isExpanded}
										<IconChevronDown class="h-4 w-4 text-muted-foreground" />
									{:else}
										<IconChevronRight class="h-4 w-4 text-muted-foreground" />
									{/if}
									<span>{category.label}</span>
									{#if category.businessLabel}
										<Badge variant="outline" class="text-xs font-normal"
											>{category.businessLabel}</Badge
										>
									{/if}
								</div>
								<span class="text-xs text-muted-foreground">{granted}/{total}</span>
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div class="ml-6 space-y-1 pb-2">
									{#each category.permissions as perm (perm.key)}
										{@const granted = isGranted(perm.key)}
										{@const roleDefault = isRoleDefault(perm.key)}
										{@const isCustom = customPermissions.has(perm.key) && !roleDefault}

										<div
											class="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/30"
										>
											<div class="mr-3 min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<span class="text-sm">{perm.label}</span>
													{#if roleDefault}
														<Badge variant="secondary" class="h-4 px-1.5 py-0 text-[10px]"
															>Role default</Badge
														>
													{:else if isCustom}
														<Badge
															class="h-4 bg-blue-100 px-1.5 py-0 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-200"
															>Custom</Badge
														>
													{/if}
												</div>
												{#if perm.description}
													<p class="mt-0.5 text-xs text-muted-foreground">{perm.description}</p>
												{/if}
											</div>
											<Switch
												checked={granted}
												disabled={roleDefault}
												onCheckedChange={() => {
													if (!roleDefault) {
														togglePermission(perm.key);
													}
												}}
												aria-label="Toggle {perm.label} permission"
											/>
										</div>
									{/each}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
						<Separator class="my-0.5" />
					{/each}
				</div>
			{:else}
				<div class="flex items-center justify-center py-12">
					<p class="text-sm text-muted-foreground">No permission data available.</p>
				</div>
			{/if}
		</div>

		<Sheet.Footer class="flex-row justify-between gap-2 border-t pt-4">
			<Button variant="outline" size="sm" onclick={resetToDefaults} disabled={saving}>
				Reset to Defaults
			</Button>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => (open = false)} disabled={saving}>
					Cancel
				</Button>
				<Button size="sm" onclick={save} disabled={saving}>
					{#if saving}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Permissions
				</Button>
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
