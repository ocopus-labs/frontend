<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import { updateLoyaltySettings, type LoyaltySettings } from '$lib/api';
	import { invalidateAll } from '$app/navigation';
	import { userFriendlyError } from '$lib/utils/error';

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
			await invalidateAll();
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<PageHeader title="Loyalty & Rewards" description="Configure your customer loyalty program" />

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
	{/if}
</div>
