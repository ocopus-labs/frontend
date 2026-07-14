<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import MobilePageHeader from '$lib/components/global/mobile-page-header.svelte';
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
			await invalidate('app:business-features');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			const next = new Set(togglingKeys);
			next.delete(key);
			togglingKeys = next;
		}
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
			await invalidate('app:business-features');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSwapping = false;
		}
	}
</script>

<MobilePageHeader
	title="Features"
	backHref={`/${$page.params.business}/${$page.params.slug}/settings`}
/>
<div class="flex flex-col gap-6 p-6">
	{#if !features}
		<PageHeader back title="Features" description="Manage optional features for your business" />
		<Card.Root>
			<Card.Content class="p-8 text-center">
				<p class="text-muted-foreground">
					{(data as any).error ?? 'Failed to load features.'}
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Header with tier badge and slot usage -->
		<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-2xl font-bold">Features</h1>
				<p class="text-muted-foreground">Enable or disable optional features for your business</p>
			</div>
			<div class="flex flex-wrap items-center gap-2 pt-1">
				<Badge variant={getTierBadgeVariant(features.tier)} class="text-xs">
					{features.tier} plan
				</Badge>
				{#if features.extraSlots > 0}
					<Badge variant="outline" class="text-xs">
						{features.extraSlotsUsed}/{features.extraSlots} extra slots used
					</Badge>
				{/if}
			</div>
		</div>

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

		<!-- Feature cards grid -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each features.availableFeatures as feature (feature.slug || feature.key)}
				{@const featureKey = feature.slug || feature.key}
				{@const locked = isTierLocked(feature.minimumTier, features.tier)}
				{@const isToggling = togglingKeys.has(featureKey)}

				<Card.Root class={locked ? 'opacity-70' : ''}>
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex flex-wrap items-center gap-1.5">
								<Card.Title class="text-sm font-semibold">{feature.label}</Card.Title>
								{#if feature.isCore}
									<Badge variant="secondary" class="px-1.5 py-0 text-[10px]">Core</Badge>
								{/if}
							</div>
							<div class="shrink-0">
								{#if locked}
									<LockIcon class="size-4 text-muted-foreground" />
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
					</Card.Header>
					<Card.Content class="pt-0">
						<p class="text-xs text-muted-foreground">{feature.description}</p>

						{#if feature.dependsOn?.length}
							<p class="mt-1 text-[10px] text-muted-foreground">
								Requires: {feature.dependsOn.join(', ')}
							</p>
						{/if}

						<div class="mt-3 flex flex-wrap items-center gap-2">
							<Badge
								variant={getTierBadgeVariant(feature.minimumTier)}
								class="px-1.5 py-0 text-[10px]"
							>
								{feature.minimumTier}
							</Badge>

							{#if locked}
								<span class="text-xs text-muted-foreground">
									Requires {feature.minimumTier} plan
								</span>
							{:else if isToggling}
								<span class="text-xs text-muted-foreground">Updating...</span>
							{:else if feature.isCore}
								<span class="text-xs text-muted-foreground">Always enabled</span>
							{/if}
						</div>

						{#if locked}
							<div class="mt-3">
								<Button variant="outline" size="sm" class="w-full text-xs" href="/billing">
									Upgrade to {feature.minimumTier}
								</Button>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

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
				<button
					type="button"
					class="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent
						{swapSelection === extraKey ? 'bg-accent ring-1 ring-primary' : ''}"
					onclick={() => (swapSelection = extraKey)}
				>
					<span
						class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 {swapSelection ===
						extraKey
							? 'border-primary'
							: 'border-muted-foreground'}"
					>
						{#if swapSelection === extraKey}
							<span class="h-2 w-2 rounded-full bg-primary"></span>
						{/if}
					</span>
					<span>{extra.label}</span>
				</button>
			{/each}
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button onclick={handleSwap} disabled={!swapSelection || isSwapping} class="flex-1">
				{#if isSwapping}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Swap
			</Button>
			<Button variant="outline" class="flex-1" href="/billing">Upgrade to Pro</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
