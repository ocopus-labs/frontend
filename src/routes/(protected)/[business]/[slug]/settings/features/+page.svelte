<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { enableFeature, disableFeature, type FeatureInfo } from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import LockIcon from '@lucide/svelte/icons/lock';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	let { data }: { data: PageData } = $props();

	const features = $derived((data as any).features);
	const businessId = $derived((data as any).businessId as string);

	// Track which features are currently being toggled
	let togglingKeys = $state<Set<string>>(new Set());

	const tierOrder: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

	function getTierBadgeVariant(tier: string): 'default' | 'secondary' | 'outline' {
		if (tier === 'ENTERPRISE') return 'default';
		if (tier === 'PRO') return 'secondary';
		return 'outline';
	}

	function isTierLocked(featureMinTier: string, currentTier: string): boolean {
		return tierOrder[featureMinTier] > tierOrder[currentTier];
	}

	async function handleToggle(feature: FeatureInfo, newChecked: boolean) {
		if (feature.isCore) return;
		if (!features) return;

		const locked = isTierLocked(feature.minimumTier, features.tier);
		if (locked) return;

		togglingKeys = new Set([...togglingKeys, feature.key]);

		try {
			if (newChecked) {
				await enableFeature(businessId, feature.key);
				toast.success(`${feature.label} enabled`);
			} else {
				await disableFeature(businessId, feature.key);
				toast.success(`${feature.label} disabled`);
			}
			await invalidate('app:business-features');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			const next = new Set(togglingKeys);
			next.delete(feature.key);
			togglingKeys = next;
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	{#if !features}
		<PageHeader title="Features" description="Manage optional features for your business" />
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

		<!-- Warning: no extra slots remaining -->
		{#if features.extraSlots > 0 && features.extraSlotsRemaining === 0}
			<div class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
				<p class="text-sm text-amber-700 dark:text-amber-300">
					You have used all your extra feature slots. Disable a feature before enabling a new one,
					or upgrade your plan for more slots.
				</p>
			</div>
		{/if}

		<!-- Feature cards grid -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each features.availableFeatures as feature (feature.key)}
				{@const locked = isTierLocked(feature.minimumTier, features.tier)}
				{@const isToggling = togglingKeys.has(feature.key)}

				<Card.Root class={locked ? 'opacity-70' : ''}>
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex flex-wrap items-center gap-1.5">
								<Card.Title class="text-sm font-semibold">{feature.label}</Card.Title>
								{#if feature.isCore}
									<Badge variant="secondary" class="text-[10px] px-1.5 py-0">Core</Badge>
								{/if}
							</div>
							<div class="shrink-0">
								{#if locked}
									<LockIcon class="size-4 text-muted-foreground" />
								{:else if feature.isCore}
									<!-- Core features always on; show static checked switch -->
									<Switch checked={true} disabled={true} />
								{:else}
									<Switch
										checked={feature.isEnabled}
										disabled={isToggling ||
											(!feature.isEnabled &&
												features.extraSlotsRemaining === 0 &&
												features.extraSlots > 0)}
										onCheckedChange={(checked) => handleToggle(feature, checked)}
									/>
								{/if}
							</div>
						</div>
					</Card.Header>
					<Card.Content class="pt-0">
						<p class="text-xs text-muted-foreground">{feature.description}</p>

						<div class="mt-3 flex flex-wrap items-center gap-2">
							<Badge variant={getTierBadgeVariant(feature.minimumTier)} class="text-[10px] px-1.5 py-0">
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
