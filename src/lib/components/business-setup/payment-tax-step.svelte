<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Field from '$lib/components/ui/field';
	import { toast } from 'svelte-sonner';
	import { updateBusinessSettings } from '$lib/api';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';

	let {
		businessId,
		businessType,
		completed = $bindable(false)
	}: {
		businessId: string;
		businessType: string;
		completed: boolean;
	} = $props();

	// Payment state
	let acceptCash = $state(true);
	let acceptUpi = $state(false);
	let acceptCard = $state(false);
	let upiVpa = $state('');

	// Tax state
	type TaxRegime = 'none' | 'gst' | 'vat' | 'sales_tax';
	let taxRegime = $state<TaxRegime>('none');
	let taxRate = $state('5');
	let gstin = $state('');

	let isLoading = $state(false);

	// Auto-set tax rate based on regime
	$effect(() => {
		if (taxRegime === 'gst') {
			const foodTypes = ['restaurant', 'cafe', 'bar', 'bakery', 'fast-food'];
			taxRate = foodTypes.includes(businessType) ? '5' : '18';
		} else if (taxRegime === 'vat') {
			taxRate = '20';
		} else if (taxRegime === 'sales_tax') {
			taxRate = '8';
		} else {
			taxRate = '0';
		}
	});

	async function handleSave() {
		isLoading = true;
		try {
			const paymentMethods: string[] = [];
			if (acceptCash) paymentMethods.push('cash');
			if (acceptUpi) paymentMethods.push('upi');
			if (acceptCard) paymentMethods.push('card');

			await updateBusinessSettings(businessId, {
				paymentMethods,
				upiVpa: acceptUpi ? upiVpa : undefined,
				taxRate: taxRate || '0',
				taxRegime: taxRegime !== 'none' ? taxRegime : undefined,
				gstin: taxRegime === 'gst' ? gstin : undefined,
			});

			completed = true;
			toast.success('Payment and tax settings saved');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save settings');
		} finally {
			isLoading = false;
		}
	}

	const taxRegimes = [
		{ value: 'none' as const, label: 'No Tax', description: 'I\'ll configure this later' },
		{ value: 'gst' as const, label: 'GST (India)', description: 'Goods and Services Tax' },
		{ value: 'vat' as const, label: 'VAT', description: 'Value Added Tax' },
		{ value: 'sales_tax' as const, label: 'Sales Tax', description: 'US Sales Tax' },
	];
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Payment & Tax</h1>
		<p class="mt-2 text-muted-foreground">Configure how you accept payments and handle taxes.</p>
	</div>

	{#if completed}
		<div class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
			<Check class="size-5 text-green-600" />
			<p class="text-sm font-medium text-green-800 dark:text-green-200">Settings saved</p>
		</div>
	{/if}

	<!-- Payment methods -->
	<div class="space-y-4">
		<p class="text-sm font-medium">Payment methods</p>

		<div class="space-y-3">
			<label class="flex items-center justify-between rounded-lg border p-4">
				<div>
					<p class="text-sm font-medium">Cash</p>
					<p class="text-xs text-muted-foreground">Accept cash payments</p>
				</div>
				<Switch bind:checked={acceptCash} />
			</label>

			<div>
				<label class="flex items-center justify-between rounded-lg border p-4 {acceptUpi ? 'rounded-b-none' : ''}">
					<div>
						<p class="text-sm font-medium">UPI</p>
						<p class="text-xs text-muted-foreground">Accept UPI payments</p>
					</div>
					<Switch bind:checked={acceptUpi} />
				</label>
				{#if acceptUpi}
					<div class="rounded-b-lg border border-t-0 px-4 py-3">
						<Field.Group>
							<Field.Field>
								<Field.Label for="upi-vpa">UPI ID / VPA</Field.Label>
								<Input id="upi-vpa" placeholder="business@upi" bind:value={upiVpa} />
							</Field.Field>
						</Field.Group>
					</div>
				{/if}
			</div>

			<label class="flex items-center justify-between rounded-lg border p-4">
				<div>
					<p class="text-sm font-medium">Card</p>
					<p class="text-xs text-muted-foreground">Accept credit/debit cards</p>
				</div>
				<Switch bind:checked={acceptCard} />
			</label>
		</div>
	</div>

	<!-- Tax regime -->
	<div class="space-y-4">
		<p class="text-sm font-medium">Tax configuration</p>

		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each taxRegimes as regime}
				<button
					class="rounded-lg border-2 px-3 py-3 text-left transition-colors {taxRegime === regime.value ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'}"
					onclick={() => (taxRegime = regime.value)}
				>
					<p class="text-sm font-medium">{regime.label}</p>
					<p class="mt-0.5 text-xs text-muted-foreground">{regime.description}</p>
				</button>
			{/each}
		</div>

		{#if taxRegime !== 'none'}
			<div class="flex gap-4">
				<Field.Group class="w-32">
					<Field.Field>
						<Field.Label for="tax-rate">Tax Rate (%)</Field.Label>
						<Input id="tax-rate" type="number" step="0.1" bind:value={taxRate} />
					</Field.Field>
				</Field.Group>

				{#if taxRegime === 'gst'}
					<Field.Group class="flex-1">
						<Field.Field>
							<Field.Label for="gstin">GSTIN (Optional)</Field.Label>
							<Input id="gstin" placeholder="22AAAAA0000A1Z5" bind:value={gstin} />
						</Field.Field>
					</Field.Group>
				{/if}
			</div>
		{/if}
	</div>

	<Button onclick={handleSave} disabled={isLoading || completed}>
		{#if isLoading}
			<Loader2 class="mr-2 size-4 animate-spin" />
			Saving...
		{:else if completed}
			<Check class="mr-2 size-4" />
			Saved
		{:else}
			Save settings
		{/if}
	</Button>
</div>
