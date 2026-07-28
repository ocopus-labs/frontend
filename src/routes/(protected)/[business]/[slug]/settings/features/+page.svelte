<script lang="ts">
	import type { PageData } from './$types';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { enableFeature, disableFeature, type FeatureInfo } from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import LockIcon from '@lucide/svelte/icons/lock';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let { data }: { data: PageData } = $props();

	const features = $derived((data as any).features);
	const businessId = $derived((data as any).businessId as string);

	let togglingKeys = $state<Set<string>>(new Set());

	// Swap flow state
	let swapDialogOpen = $state(false);
	let swapTarget = $state<FeatureInfo | null>(null);
	let swapSelection = $state<string | null>(null);
	let isSwapping = $state(false);

	const enabledExtras = $derived(
		features?.availableFeatures?.filter((f: FeatureInfo) => f.isEnabled && !f.isCore) ?? []
	);

	// Presentation-only split: core features are always on, the rest are the
	// toggleable extras. Same list, grouped so each section reads as one idea.
	const coreFeatures = $derived(
		features?.availableFeatures?.filter((f: FeatureInfo) => f.isCore) ?? []
	);
	const optionalFeatures = $derived(
		features?.availableFeatures?.filter((f: FeatureInfo) => !f.isCore) ?? []
	);

	const tierOrder: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

	function getTierBadgeVariant(tier: string): 'default' | 'secondary' | 'outline' {
		if (tier === 'ENTERPRISE') return 'default';
		if (tier === 'PRO') return 'secondary';
		return 'outline';
	}

	function isTierLocked(featureMinTier: string, currentTier: string): boolean {
		return tierOrder[featureMinTier] > tierOrder[currentTier];
	}

	const slotsFullAndFree = $derived(
		features && features.extraSlots > 0 && features.extraSlotsRemaining === 0
	);

	async function handleToggle(feature: FeatureInfo, newChecked: boolean) {
		if (feature.isCore) return;
		if (!features) return;

		const locked = isTierLocked(feature.minimumTier, features.tier);
		if (locked) return;

		// If enabling and slots are full, open swap dialog instead
		if (newChecked && slotsFullAndFree) {
			swapTarget = feature;
			swapSelection = null;
			swapDialogOpen = true;
			return;
		}

		const key = feature.slug || feature.key;
		togglingKeys = new Set([...togglingKeys, key]);

		try {
			if (newChecked) {
				await enableFeature(businessId, key);
				toast.success(`${feature.label} enabled`);
			} else {
				await disableFeature(businessId, key);
				toast.success(`${feature.label} disabled`);
			}
			await refreshAfterToggle();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			const next = new Set(togglingKeys);
			next.delete(key);
			togglingKeys = next;
		}
	}

	/**
	 * Re-run every load that depends on the feature list.
	 *
	 * `app:business-features` alone was not enough. The `[slug]` layout declares
	 * `depends('app:business-data')` and its `enabledFeatures` is what the route
	 * guard redirects on, so a toggle left the guard holding the previous list for
	 * the rest of the client-side session — enabling a feature and navigating to it
	 * bounced straight back with `?feature_disabled=...` until a full page load.
	 */
	async function refreshAfterToggle() {
		await Promise.all([invalidate('app:business-features'), invalidate('app:business-data')]);
	}

	async function handleSwap() {
		if (!swapTarget || !swapSelection) return;
		isSwapping = true;

		const targetKey = swapTarget.slug || swapTarget.key;

		try {
			// Disable the selected extra first, then enable the target
			await disableFeature(businessId, swapSelection);
			await enableFeature(businessId, targetKey);
			toast.success(`Swapped: enabled ${swapTarget.label}`);
			swapDialogOpen = false;
			swapTarget = null;
			swapSelection = null;
			await refreshAfterToggle();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSwapping = false;
		}
	}
</script>

{#snippet featureRow(feature: FeatureInfo)}
	{@const featureKey = feature.slug || feature.key}
	{@const locked = isTierLocked(feature.minimumTier, features.tier)}
	{@const isToggling = togglingKeys.has(featureKey)}

	<div
		class="flex items-start justify-between gap-4 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0 {locked
			? 'opacity-70'
			: ''}"
	>
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-1.5">
				{#if locked}
					<LockIcon class="size-3.5 shrink-0 text-muted-foreground" />
				{/if}
				<span class="text-sm font-medium text-foreground">{feature.label}</span>
				<Badge variant={getTierBadgeVariant(feature.minimumTier)} class="px-1.5 py-0 text-[10px]">
					{feature.minimumTier}
				</Badge>
			</div>

			<p class="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>

			{#if feature.dependsOn?.length}
				<p class="mt-1 text-[10px] text-muted-foreground">
					Requires: {feature.dependsOn.join(', ')}
				</p>
			{/if}

			{#if locked}
				<p class="mt-1 text-xs text-muted-foreground">Requires {feature.minimumTier} plan</p>
			{:else if isToggling}
				<p class="mt-1 text-xs text-muted-foreground">Updating...</p>
			{:else if feature.isCore}
				<p class="mt-1 text-xs text-muted-foreground">Always enabled</p>
			{/if}
		</div>

		<div class="shrink-0">
			{#if locked}
				<Button variant="outline" size="sm" class="text-xs" href="/dashboard/billing"
					>Upgrade</Button
				>
			{:else if feature.isCore}
				<Switch checked={true} disabled={true} />
			{:else}
				<Switch
					checked={feature.isEnabled}
					disabled={isToggling}
					onCheckedChange={(checked) => handleToggle(feature, checked)}
				/>
			{/if}
		</div>
	</div>
{/snippet}

<PageShell
	back={`/${$page.params.business}/${$page.params.slug}/settings`}
	title="Features"
	description="Enable or disable optional features for your business"
>
	{#snippet actions()}
		{#if features}
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant={getTierBadgeVariant(features.tier)} class="text-xs">
					{features.tier} plan
				</Badge>
				{#if features.extraSlots > 0}
					<Badge variant="outline" class="text-xs">
						{features.extraSlotsUsed}/{features.extraSlots} extra slots used
					</Badge>
				{/if}
			</div>
		{/if}
	{/snippet}

	{#if !features}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<p class="text-sm text-muted-foreground">
				{(data as any).error ?? 'Failed to load features.'}
			</p>
		</div>
	{:else}
		<!-- Grace period banner -->
		{#if features.graceActive}
			<div class="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0 text-warning" />
				<div class="text-sm text-warning">
					<p class="font-medium">Grace period active</p>
					<p>
						Your plan was downgraded. Extra features are read-only until {new Date(
							features.graceExpiresAt!
						).toLocaleDateString()}. Upgrade to restore full access or they will be disabled
						automatically.
					</p>
				</div>
			</div>
		{/if}

		<!-- Warning: no extra slots remaining -->
		{#if slotsFullAndFree}
			<div class="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0 text-warning" />
				<p class="text-sm text-warning">
					All feature slots used. Click enable on a feature to swap it with an existing one, or
					upgrade your plan for more slots.
				</p>
			</div>
		{/if}

		<div>
			{#if optionalFeatures.length}
				<SettingsSection
					title="Optional features"
					description="Turn on the extras this business needs. Some require a higher plan."
				>
					<div class="flex flex-col">
						{#each optionalFeatures as feature (feature.slug || feature.key)}
							{@render featureRow(feature)}
						{/each}
					</div>
				</SettingsSection>
			{/if}

			{#if coreFeatures.length}
				<SettingsSection
					title="Included features"
					description="Core features that ship with every plan and can't be turned off."
				>
					<div class="flex flex-col">
						{#each coreFeatures as feature (feature.slug || feature.key)}
							{@render featureRow(feature)}
						{/each}
					</div>
				</SettingsSection>
			{/if}
		</div>
	{/if}
</PageShell>

<!-- Swap Feature Dialog -->
<Dialog.Root bind:open={swapDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title
				>All feature slots used ({features?.extraSlotsUsed}/{features?.extraSlots})</Dialog.Title
			>
			<Dialog.Description>
				Disable one to make room for <strong>{swapTarget?.label}</strong>:
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-1 py-4">
			{#each enabledExtras as extra (extra.slug || extra.key)}
				{@const extraKey = extra.slug || extra.key}
				<Button
					variant="ghost"
					class="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left text-sm font-normal {swapSelection ===
					extraKey
						? 'bg-accent ring-1 ring-primary'
						: ''}"
					onclick={() => (swapSelection = extraKey)}
				>
					<span
						class="flex size-4 shrink-0 items-center justify-center rounded-full border-2 {swapSelection ===
						extraKey
							? 'border-primary'
							: 'border-muted-foreground'}"
					>
						{#if swapSelection === extraKey}
							<span class="size-2 rounded-full bg-primary"></span>
						{/if}
					</span>
					<span>{extra.label}</span>
				</Button>
			{/each}
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button onclick={handleSwap} disabled={!swapSelection || isSwapping} class="flex-1">
				{#if isSwapping}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Swap
			</Button>
			<Button variant="outline" class="flex-1" href="/dashboard/billing">Upgrade to Pro</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
