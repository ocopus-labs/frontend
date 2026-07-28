<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { IconLoader2, IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import {
		updateLoyaltySettings,
		getLoyaltyTiers,
		configureLoyaltyTiers,
		getLoyaltyPromotions,
		createLoyaltyPromotion,
		type LoyaltySettings,
		type LoyaltyTierInput,
		type LoyaltyPromotion,
		type CreateLoyaltyPromotionPayload
	} from '$lib/api';
	import { invalidate } from '$app/navigation';
	import { userFriendlyError } from '$lib/utils/error';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	const settings = $derived((data as any).loyaltySettings as LoyaltySettings | null);

	let enabled = $state(false);
	let pointsPerUnit = $state(1);
	let redemptionRate = $state(0.1);
	let minimumRedemption = $state(100);
	let tierSilver = $state(500);
	let tierGold = $state(2000);
	let tierPlatinum = $state(5000);
	let multBronze = $state(1.0);
	let multSilver = $state(1.25);
	let multGold = $state(1.5);
	let multPlatinum = $state(2.0);

	let isSaving = $state(false);

	// Tier configuration state
	let tiers = $state<LoyaltyTierInput[]>([]);
	let isSavingTiers = $state(false);
	let tiersLoaded = $state(false);

	// Promotions state
	let promotions = $state<LoyaltyPromotion[]>([]);
	let promotionsLoaded = $state(false);
	let showCreatePromotion = $state(false);
	let isCreatingPromotion = $state(false);

	// Create promotion form
	let promoName = $state('');
	let promoType = $state('bonus_points');
	let promoBonusPoints = $state(100);
	let promoMultiplier = $state(2.0);
	let promoStartDate = $state('');
	let promoEndDate = $state('');

	const PROMO_TYPES = [
		{ value: 'bonus_points', label: 'Bonus Points' },
		{ value: 'multiplier', label: 'Points Multiplier' },
		{ value: 'free_item', label: 'Free Item' }
	];

	const DEFAULT_TIER_COLORS = ['#92400e', '#9ca3af', '#eab308', '#9333ea', '#0ea5e9', '#dc2626'];

	// Sync state from loaded settings
	$effect(() => {
		if (settings) {
			enabled = settings.enabled;
			pointsPerUnit = settings.pointsPerUnit;
			redemptionRate = settings.redemptionRate;
			minimumRedemption = settings.minimumRedemption;
			tierSilver = settings.tiers.silver;
			tierGold = settings.tiers.gold;
			tierPlatinum = settings.tiers.platinum;
			multBronze = settings.tierMultipliers.bronze;
			multSilver = settings.tierMultipliers.silver;
			multGold = settings.tierMultipliers.gold;
			multPlatinum = settings.tierMultipliers.platinum;
		}
	});

	onMount(async () => {
		const businessId = (data as any).businessId;
		if (!businessId) return;
		// Load tiers and promotions in parallel
		try {
			const [tiersResult, promosResult] = await Promise.allSettled([
				getLoyaltyTiers(businessId),
				getLoyaltyPromotions(businessId, { all: true })
			]);
			if (tiersResult.status === 'fulfilled') {
				tiers = tiersResult.value.tiers.map((t) => ({
					id: t.id,
					name: t.name,
					minPoints: t.minPoints,
					multiplier: t.multiplier,
					perks: t.perks ?? undefined,
					color: t.color ?? undefined,
					sortOrder: t.sortOrder
				}));
			}
			tiersLoaded = true;
			if (promosResult.status === 'fulfilled') {
				promotions = promosResult.value.promotions;
			}
			promotionsLoaded = true;
		} catch {
			tiersLoaded = true;
			promotionsLoaded = true;
		}
	});

	async function handleSave() {
		isSaving = true;
		const businessId = (data as any).businessId;

		try {
			await updateLoyaltySettings(businessId, {
				enabled,
				pointsPerUnit,
				redemptionRate,
				minimumRedemption,
				tiers: {
					silver: tierSilver,
					gold: tierGold,
					platinum: tierPlatinum
				},
				tierMultipliers: {
					bronze: multBronze,
					silver: multSilver,
					gold: multGold,
					platinum: multPlatinum
				}
			});
			toast.success('Loyalty settings saved');
			await invalidate('app:loyalty-settings');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSaving = false;
		}
	}

	// Tier management
	function addTier() {
		const nextSort = tiers.length;
		const colorIndex = nextSort % DEFAULT_TIER_COLORS.length;
		tiers = [
			...tiers,
			{
				name: '',
				minPoints: 0,
				multiplier: 1.0,
				color: DEFAULT_TIER_COLORS[colorIndex],
				sortOrder: nextSort
			}
		];
	}

	function removeTier(index: number) {
		tiers = tiers.filter((_, i) => i !== index);
	}

	async function handleSaveTiers() {
		// Validate
		for (const tier of tiers) {
			if (!tier.name.trim()) {
				toast.error('All tiers must have a name');
				return;
			}
		}

		// Sort by minPoints before saving
		const sorted = [...tiers]
			.sort((a, b) => a.minPoints - b.minPoints)
			.map((t, i) => ({ ...t, sortOrder: i }));

		isSavingTiers = true;
		const businessId = (data as any).businessId;

		try {
			const result = await configureLoyaltyTiers(businessId, sorted);
			tiers = result.tiers.map((t) => ({
				id: t.id,
				name: t.name,
				minPoints: t.minPoints,
				multiplier: t.multiplier,
				perks: t.perks ?? undefined,
				color: t.color ?? undefined,
				sortOrder: t.sortOrder
			}));
			toast.success('Tier configuration saved');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSavingTiers = false;
		}
	}

	// Promotion management
	function openCreatePromotion() {
		promoName = '';
		promoType = 'bonus_points';
		promoBonusPoints = 100;
		promoMultiplier = 2.0;
		const today = new Date();
		promoStartDate = today.toISOString().split('T')[0];
		const nextMonth = new Date(today);
		nextMonth.setMonth(nextMonth.getMonth() + 1);
		promoEndDate = nextMonth.toISOString().split('T')[0];
		showCreatePromotion = true;
	}

	async function handleCreatePromotion() {
		if (!promoName.trim()) {
			toast.error('Promotion name is required');
			return;
		}
		if (!promoStartDate || !promoEndDate) {
			toast.error('Start and end dates are required');
			return;
		}
		if (new Date(promoEndDate) <= new Date(promoStartDate)) {
			toast.error('End date must be after start date');
			return;
		}

		isCreatingPromotion = true;
		const businessId = (data as any).businessId;

		const payload: CreateLoyaltyPromotionPayload = {
			name: promoName.trim(),
			type: promoType,
			startDate: new Date(promoStartDate).toISOString(),
			endDate: new Date(promoEndDate).toISOString()
		};

		if (promoType === 'bonus_points') {
			payload.bonusPoints = promoBonusPoints;
		} else if (promoType === 'multiplier') {
			payload.multiplier = promoMultiplier;
		}

		try {
			const result = await createLoyaltyPromotion(businessId, payload);
			promotions = [result.promotion, ...promotions];
			showCreatePromotion = false;
			toast.success('Promotion created');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isCreatingPromotion = false;
		}
	}

	function getPromoStatus(promo: LoyaltyPromotion): {
		label: string;
		variant: 'default' | 'secondary' | 'outline' | 'destructive';
	} {
		const now = new Date();
		const start = new Date(promo.startDate);
		const end = new Date(promo.endDate);
		if (!promo.active) return { label: 'Inactive', variant: 'secondary' };
		if (now < start) return { label: 'Scheduled', variant: 'outline' };
		if (now > end) return { label: 'Ended', variant: 'secondary' };
		return { label: 'Active', variant: 'default' };
	}
</script>

<PageShell back title="Loyalty & Rewards" description="Configure your customer loyalty program">
	{#if !settings}
		<Card.Root>
			<Card.Content class="p-8 text-center">
				<p class="text-muted-foreground">Failed to load loyalty settings.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div>
			<SettingsSection
				title="Program status"
				description="Enable or disable the loyalty program for your business."
			>
				<div class="flex items-center justify-between gap-4">
					<p class="text-sm text-muted-foreground">
						{enabled ? 'Customers earn points on every order' : 'Loyalty program is disabled'}
					</p>
					<Switch bind:checked={enabled} aria-label="Loyalty program" />
				</div>
			</SettingsSection>

			{#if enabled}
				<SettingsSection
					title="Points configuration"
					description="Set how points are earned and redeemed."
				>
					<Field.Field>
						<Field.Label for="points-per-unit">Points per currency unit spent</Field.Label>
						<Input
							id="points-per-unit"
							type="number"
							min="0"
							step="0.1"
							bind:value={pointsPerUnit}
							class="max-w-[8rem]"
						/>
						<Field.Description>
							e.g., 1 = customer earns 1 point for every $1 spent
						</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="redemption-rate">Redemption rate (currency per point)</Field.Label>
						<Input
							id="redemption-rate"
							type="number"
							min="0"
							step="0.01"
							bind:value={redemptionRate}
							class="max-w-[8rem]"
						/>
						<Field.Description>e.g., 0.10 = 10 points = $1 discount</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="min-redemption">Minimum points to redeem</Field.Label>
						<Input
							id="min-redemption"
							type="number"
							min="1"
							step="1"
							bind:value={minimumRedemption}
							class="max-w-[8rem]"
						/>
					</Field.Field>
				</SettingsSection>

				<SettingsSection
					title="Tier thresholds"
					description="Lifetime points needed to reach each tier (customers never downgrade)."
				>
					<div class="grid gap-4 sm:grid-cols-3">
						<Field.Field>
							<Field.Label for="tier-silver">Silver</Field.Label>
							<Input
								id="tier-silver"
								type="number"
								min="1"
								bind:value={tierSilver}
								class="max-w-[8rem]"
							/>
						</Field.Field>
						<Field.Field>
							<Field.Label for="tier-gold">Gold</Field.Label>
							<Input
								id="tier-gold"
								type="number"
								min="1"
								bind:value={tierGold}
								class="max-w-[8rem]"
							/>
						</Field.Field>
						<Field.Field>
							<Field.Label for="tier-platinum">Platinum</Field.Label>
							<Input
								id="tier-platinum"
								type="number"
								min="1"
								bind:value={tierPlatinum}
								class="max-w-[8rem]"
							/>
						</Field.Field>
					</div>
				</SettingsSection>

				<SettingsSection
					title="Tier multipliers"
					description="Bonus point multiplier for each tier level."
				>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Field.Field>
							<Field.Label for="mult-bronze">Bronze</Field.Label>
							<Input
								id="mult-bronze"
								type="number"
								min="1"
								step="0.05"
								bind:value={multBronze}
								class="max-w-[8rem]"
							/>
						</Field.Field>
						<Field.Field>
							<Field.Label for="mult-silver">Silver</Field.Label>
							<Input
								id="mult-silver"
								type="number"
								min="1"
								step="0.05"
								bind:value={multSilver}
								class="max-w-[8rem]"
							/>
						</Field.Field>
						<Field.Field>
							<Field.Label for="mult-gold">Gold</Field.Label>
							<Input
								id="mult-gold"
								type="number"
								min="1"
								step="0.05"
								bind:value={multGold}
								class="max-w-[8rem]"
							/>
						</Field.Field>
						<Field.Field>
							<Field.Label for="mult-platinum">Platinum</Field.Label>
							<Input
								id="mult-platinum"
								type="number"
								min="1"
								step="0.05"
								bind:value={multPlatinum}
								class="max-w-[8rem]"
							/>
						</Field.Field>
					</div>
				</SettingsSection>
			{/if}
		</div>

		<!-- Save Button -->
		<div class="flex justify-end">
			<Button onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Save Settings
			</Button>
		</div>

		{#if enabled}
			<Separator />

			<div>
				<SettingsSection
					title="Advanced tier configuration"
					description="Define custom tiers with names, colors, and point multipliers."
				>
					{#snippet action()}
						<Button variant="outline" size="sm" onclick={addTier}>
							<IconPlus class="mr-2 h-4 w-4" />
							Add Tier
						</Button>
					{/snippet}

					{#if !tiersLoaded}
						<div class="flex items-center justify-center py-6">
							<IconLoader2 class="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					{:else if tiers.length === 0}
						<p class="py-6 text-sm text-muted-foreground">
							No custom tiers configured. Add tiers to define progression levels for your customers.
						</p>
					{:else}
						<div class="flex flex-col gap-3">
							{#each tiers as tier, index}
								<Card.Root size="sm">
									<Card.Content class="flex items-start gap-3">
										<IconGripVertical class="h-4 w-4 shrink-0 self-center text-muted-foreground" />
										<div class="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
											<Field.Field>
												<Field.Label class="text-xs text-muted-foreground">Name</Field.Label>
												<Input bind:value={tier.name} placeholder="e.g., Silver" class="h-8" />
											</Field.Field>
											<Field.Field>
												<Field.Label class="text-xs text-muted-foreground">Min Points</Field.Label>
												<Input type="number" min="0" bind:value={tier.minPoints} class="h-8" />
											</Field.Field>
											<Field.Field>
												<Field.Label class="text-xs text-muted-foreground">Multiplier</Field.Label>
												<Input
													type="number"
													min="0.01"
													step="0.05"
													bind:value={tier.multiplier}
													class="h-8"
												/>
											</Field.Field>
											<div class="flex items-end gap-2">
												<Field.Field class="flex-1">
													<Field.Label class="text-xs text-muted-foreground">Color</Field.Label>
													<div class="flex items-center gap-2">
														<Input
															type="color"
															bind:value={tier.color}
															class="h-8 w-10 shrink-0 cursor-pointer p-0.5"
														/>
														<span class="text-xs text-muted-foreground">
															{tier.color || '#000000'}
														</span>
													</div>
												</Field.Field>
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
													onclick={() => removeTier(index)}
												>
													<IconTrash class="h-4 w-4" />
												</Button>
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>

						<div class="flex justify-end">
							<Button onclick={handleSaveTiers} disabled={isSavingTiers} size="sm">
								{#if isSavingTiers}
									<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Save Tiers
							</Button>
						</div>
					{/if}
				</SettingsSection>

				<SettingsSection
					title="Promotions"
					description="Create bonus point events and multiplier campaigns."
				>
					{#snippet action()}
						<Button variant="outline" size="sm" onclick={openCreatePromotion}>
							<IconPlus class="mr-2 h-4 w-4" />
							New Promotion
						</Button>
					{/snippet}

					{#if !promotionsLoaded}
						<div class="flex items-center justify-center py-6">
							<IconLoader2 class="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					{:else if promotions.length === 0}
						<p class="py-6 text-sm text-muted-foreground">
							No promotions yet. Create one to boost customer engagement.
						</p>
					{:else}
						<div class="flex flex-col gap-3">
							{#each promotions as promo}
								{@const status = getPromoStatus(promo)}
								<Card.Root size="sm">
									<Card.Content class="flex items-center justify-between gap-3">
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<p class="text-sm font-medium">{promo.name}</p>
												<Badge variant={status.variant}>{status.label}</Badge>
											</div>
											<div
												class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
											>
												<span class="capitalize">{promo.type.replace('_', ' ')}</span>
												{#if promo.bonusPoints}
													<span>+{promo.bonusPoints} pts</span>
												{/if}
												{#if promo.multiplier}
													<span>{promo.multiplier}x multiplier</span>
												{/if}
												<span>
													{new Date(promo.startDate).toLocaleDateString()} - {new Date(
														promo.endDate
													).toLocaleDateString()}
												</span>
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</SettingsSection>
			</div>
		{/if}
	{/if}
</PageShell>

<!-- Create Promotion Dialog -->
<Dialog.Root bind:open={showCreatePromotion}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create Promotion</Dialog.Title>
			<Dialog.Description>Set up a loyalty bonus event or multiplier campaign.</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<Field.Field>
				<Field.Label for="promo-name">Name *</Field.Label>
				<Input
					id="promo-name"
					bind:value={promoName}
					placeholder="e.g., Weekend Double Points"
					class="max-w-sm"
				/>
			</Field.Field>

			<Field.Field>
				<Field.Label for="promo-type">Type</Field.Label>
				<NativeSelect id="promo-type" bind:value={promoType} class="sm:max-w-xs">
					{#each PROMO_TYPES as pt}
						<NativeSelectOption value={pt.value}>{pt.label}</NativeSelectOption>
					{/each}
				</NativeSelect>
			</Field.Field>

			{#if promoType === 'bonus_points'}
				<Field.Field>
					<Field.Label for="promo-bonus">Bonus Points</Field.Label>
					<Input
						id="promo-bonus"
						type="number"
						min="1"
						bind:value={promoBonusPoints}
						class="max-w-[8rem]"
					/>
					<Field.Description>Extra points awarded per qualifying transaction</Field.Description>
				</Field.Field>
			{/if}

			{#if promoType === 'multiplier'}
				<Field.Field>
					<Field.Label for="promo-mult">Multiplier</Field.Label>
					<Input
						id="promo-mult"
						type="number"
						min="1.01"
						step="0.1"
						bind:value={promoMultiplier}
						class="max-w-[8rem]"
					/>
					<Field.Description>e.g., 2.0 = double points during this period</Field.Description>
				</Field.Field>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="promo-start">Start Date *</Field.Label>
					<Input id="promo-start" type="date" bind:value={promoStartDate} class="max-w-[10rem]" />
				</Field.Field>
				<Field.Field>
					<Field.Label for="promo-end">End Date *</Field.Label>
					<Input id="promo-end" type="date" bind:value={promoEndDate} class="max-w-[10rem]" />
				</Field.Field>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCreatePromotion = false)}>Cancel</Button>
			<Button onclick={handleCreatePromotion} disabled={isCreatingPromotion}>
				{#if isCreatingPromotion}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
