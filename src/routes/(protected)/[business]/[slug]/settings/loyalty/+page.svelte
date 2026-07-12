<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { IconLoader2, IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		updateLoyaltySettings,
		getLoyaltyTiers,
		configureLoyaltyTiers,
		getLoyaltyPromotions,
		createLoyaltyPromotion,
		type LoyaltySettings,
		type LoyaltyTier,
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

	function getPromoStatus(promo: LoyaltyPromotion): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
		const now = new Date();
		const start = new Date(promo.startDate);
		const end = new Date(promo.endDate);
		if (!promo.active) return { label: 'Inactive', variant: 'secondary' };
		if (now < start) return { label: 'Scheduled', variant: 'outline' };
		if (now > end) return { label: 'Ended', variant: 'secondary' };
		return { label: 'Active', variant: 'default' };
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<PageHeader back title="Loyalty & Rewards" description="Configure your customer loyalty program" />

	{#if !settings}
		<Card.Root>
			<Card.Content class="p-8 text-center">
				<p class="text-muted-foreground">Failed to load loyalty settings.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Enable/Disable -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Program Status</Card.Title>
				<Card.Description>Enable or disable the loyalty program for your business</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium">Loyalty Program</p>
						<p class="text-sm text-muted-foreground">
							{enabled ? 'Customers earn points on every order' : 'Loyalty program is disabled'}
						</p>
					</div>
					<Switch bind:checked={enabled} />
				</div>
			</Card.Content>
		</Card.Root>

		{#if enabled}
			<!-- Points Configuration -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Points Configuration</Card.Title>
					<Card.Description>Set how points are earned and redeemed</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4">
					<div class="grid gap-2">
						<label for="points-per-unit" class="text-sm font-medium">Points per currency unit spent</label>
						<Input
							id="points-per-unit"
							type="number"
							min="0"
							step="0.1"
							bind:value={pointsPerUnit}
						/>
						<p class="text-xs text-muted-foreground">e.g., 1 = customer earns 1 point for every $1 spent</p>
					</div>
					<div class="grid gap-2">
						<label for="redemption-rate" class="text-sm font-medium">Redemption rate (currency per point)</label>
						<Input
							id="redemption-rate"
							type="number"
							min="0"
							step="0.01"
							bind:value={redemptionRate}
						/>
						<p class="text-xs text-muted-foreground">e.g., 0.10 = 10 points = $1 discount</p>
					</div>
					<div class="grid gap-2">
						<label for="min-redemption" class="text-sm font-medium">Minimum points to redeem</label>
						<Input
							id="min-redemption"
							type="number"
							min="1"
							step="1"
							bind:value={minimumRedemption}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Tier Thresholds -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Tier Thresholds</Card.Title>
					<Card.Description>Lifetime points needed to reach each tier (customers never downgrade)</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4 sm:grid-cols-3">
					<div class="grid gap-2">
						<label for="tier-silver" class="text-sm font-medium">Silver</label>
						<Input id="tier-silver" type="number" min="1" bind:value={tierSilver} />
					</div>
					<div class="grid gap-2">
						<label for="tier-gold" class="text-sm font-medium">Gold</label>
						<Input id="tier-gold" type="number" min="1" bind:value={tierGold} />
					</div>
					<div class="grid gap-2">
						<label for="tier-platinum" class="text-sm font-medium">Platinum</label>
						<Input id="tier-platinum" type="number" min="1" bind:value={tierPlatinum} />
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Tier Multipliers -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Tier Multipliers</Card.Title>
					<Card.Description>Bonus point multiplier for each tier level</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4 sm:grid-cols-4">
					<div class="grid gap-2">
						<label for="mult-bronze" class="text-sm font-medium">Bronze</label>
						<Input id="mult-bronze" type="number" min="1" step="0.05" bind:value={multBronze} />
					</div>
					<div class="grid gap-2">
						<label for="mult-silver" class="text-sm font-medium">Silver</label>
						<Input id="mult-silver" type="number" min="1" step="0.05" bind:value={multSilver} />
					</div>
					<div class="grid gap-2">
						<label for="mult-gold" class="text-sm font-medium">Gold</label>
						<Input id="mult-gold" type="number" min="1" step="0.05" bind:value={multGold} />
					</div>
					<div class="grid gap-2">
						<label for="mult-platinum" class="text-sm font-medium">Platinum</label>
						<Input id="mult-platinum" type="number" min="1" step="0.05" bind:value={multPlatinum} />
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

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

			<!-- Advanced Tier Configuration -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="text-base">Advanced Tier Configuration</Card.Title>
							<Card.Description>Define custom tiers with names, colors, and point multipliers</Card.Description>
						</div>
						<Button variant="outline" size="sm" onclick={addTier}>
							<IconPlus class="mr-2 h-4 w-4" />
							Add Tier
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !tiersLoaded}
						<div class="flex items-center justify-center py-6">
							<IconLoader2 class="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					{:else if tiers.length === 0}
						<p class="py-6 text-center text-sm text-muted-foreground">
							No custom tiers configured. Add tiers to define progression levels for your customers.
						</p>
					{:else}
						<div class="space-y-3">
							{#each tiers as tier, index}
								<div class="flex items-center gap-3 rounded-md border p-3">
									<IconGripVertical class="h-4 w-4 shrink-0 text-muted-foreground" />
									<div class="grid flex-1 gap-3 sm:grid-cols-4">
										<div class="grid gap-1">
											<label class="text-xs text-muted-foreground">Name</label>
											<Input
												bind:value={tier.name}
												placeholder="e.g., Silver"
												class="h-8"
											/>
										</div>
										<div class="grid gap-1">
											<label class="text-xs text-muted-foreground">Min Points</label>
											<Input
												type="number"
												min="0"
												bind:value={tier.minPoints}
												class="h-8"
											/>
										</div>
										<div class="grid gap-1">
											<label class="text-xs text-muted-foreground">Multiplier</label>
											<Input
												type="number"
												min="0.01"
												step="0.05"
												bind:value={tier.multiplier}
												class="h-8"
											/>
										</div>
										<div class="flex items-end gap-2">
											<div class="grid flex-1 gap-1">
												<label class="text-xs text-muted-foreground">Color</label>
												<div class="flex items-center gap-2">
													<input
														type="color"
														bind:value={tier.color}
														class="h-8 w-8 cursor-pointer rounded border p-0.5"
													/>
													<span class="text-xs text-muted-foreground">{tier.color || '#000000'}</span>
												</div>
											</div>
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
								</div>
							{/each}
						</div>

						<div class="mt-4 flex justify-end">
							<Button onclick={handleSaveTiers} disabled={isSavingTiers} size="sm">
								{#if isSavingTiers}
									<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Save Tiers
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Separator />

			<!-- Promotions -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="text-base">Promotions</Card.Title>
							<Card.Description>Create bonus point events and multiplier campaigns</Card.Description>
						</div>
						<Button variant="outline" size="sm" onclick={openCreatePromotion}>
							<IconPlus class="mr-2 h-4 w-4" />
							New Promotion
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !promotionsLoaded}
						<div class="flex items-center justify-center py-6">
							<IconLoader2 class="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					{:else if promotions.length === 0}
						<p class="py-6 text-center text-sm text-muted-foreground">
							No promotions yet. Create one to boost customer engagement.
						</p>
					{:else}
						<div class="space-y-3">
							{#each promotions as promo}
								{@const status = getPromoStatus(promo)}
								<div class="flex items-center justify-between rounded-md border p-3">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<p class="text-sm font-medium">{promo.name}</p>
											<Badge variant={status.variant}>{status.label}</Badge>
										</div>
										<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
											<span class="capitalize">{promo.type.replace('_', ' ')}</span>
											{#if promo.bonusPoints}
												<span>+{promo.bonusPoints} pts</span>
											{/if}
											{#if promo.multiplier}
												<span>{promo.multiplier}x multiplier</span>
											{/if}
											<span>
												{new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
											</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>

<!-- Create Promotion Dialog -->
<Dialog.Root bind:open={showCreatePromotion}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create Promotion</Dialog.Title>
			<Dialog.Description>Set up a loyalty bonus event or multiplier campaign.</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="promo-name" class="text-sm font-medium">Name *</label>
				<Input id="promo-name" bind:value={promoName} placeholder="e.g., Weekend Double Points" />
			</div>

			<div class="grid gap-2">
				<label for="promo-type" class="text-sm font-medium">Type</label>
				<select
					id="promo-type"
					bind:value={promoType}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{#each PROMO_TYPES as pt}
						<option value={pt.value}>{pt.label}</option>
					{/each}
				</select>
			</div>

			{#if promoType === 'bonus_points'}
				<div class="grid gap-2">
					<label for="promo-bonus" class="text-sm font-medium">Bonus Points</label>
					<Input
						id="promo-bonus"
						type="number"
						min="1"
						bind:value={promoBonusPoints}
					/>
					<p class="text-xs text-muted-foreground">Extra points awarded per qualifying transaction</p>
				</div>
			{/if}

			{#if promoType === 'multiplier'}
				<div class="grid gap-2">
					<label for="promo-mult" class="text-sm font-medium">Multiplier</label>
					<Input
						id="promo-mult"
						type="number"
						min="1.01"
						step="0.1"
						bind:value={promoMultiplier}
					/>
					<p class="text-xs text-muted-foreground">e.g., 2.0 = double points during this period</p>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="promo-start" class="text-sm font-medium">Start Date *</label>
					<Input id="promo-start" type="date" bind:value={promoStartDate} />
				</div>
				<div class="grid gap-2">
					<label for="promo-end" class="text-sm font-medium">End Date *</label>
					<Input id="promo-end" type="date" bind:value={promoEndDate} />
				</div>
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
