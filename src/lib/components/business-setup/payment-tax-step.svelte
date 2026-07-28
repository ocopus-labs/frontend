<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Field from '$lib/components/ui/field';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { updateBusinessSettings, updateTaxSettings, updateUpiSettings } from '$lib/api';
	import type { TaxRegime as ApiTaxRegime } from '$lib/api/tax';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';
	import StepSuccess from './step-success.svelte';

	let {
		businessId,
		businessType,
		country = '',
		completed = $bindable(false),
		summary = $bindable('')
	}: {
		businessId: string;
		businessType: string;
		country?: string;
		completed: boolean;
		summary?: string;
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

	// The wizard's regime choices are a friendlier subset of the backend's
	// `TaxRegime` union. 'vat' is ambiguous, so resolve it from the country
	// captured in the essentials step.
	function toApiRegime(regime: Exclude<TaxRegime, 'none'>): ApiTaxRegime {
		if (regime === 'gst') return 'gst_india';
		if (regime === 'sales_tax') return 'sales_tax_us';
		return country.toUpperCase() === 'GB' ? 'vat_uk' : 'vat_eu';
	}

	/**
	 * Persists to the three endpoints that actually own this data. Previously
	 * everything went to `PATCH /business/:id/settings`, where `upiVpa`,
	 * `taxRegime` and `gstin` were stripped by the global `whitelist: true`
	 * pipe -- and a success toast was shown anyway.
	 *
	 * Exported so the wizard's Next button can save before advancing.
	 * Returns false if saving failed, so the caller can hold the user here.
	 */
	export async function save(): Promise<boolean> {
		if (completed) return true;
		if (acceptUpi && !upiVpa.trim()) {
			toast.error('Enter your UPI ID, or turn UPI off.');
			return false;
		}

		isLoading = true;
		try {
			const paymentMethods: string[] = [];
			if (acceptCash) paymentMethods.push('cash');
			if (acceptUpi) paymentMethods.push('upi');
			if (acceptCard) paymentMethods.push('card');

			await updateBusinessSettings(businessId, { paymentMethods });

			// UPI VPA lives in the QR module's settings -- it is what generates
			// payment QRs (`qr.service.ts` throws if the VPA is unset).
			await updateUpiSettings(businessId, {
				enabled: acceptUpi,
				vpa: acceptUpi ? upiVpa.trim() : ''
			});

			// Tax belongs under `settings.tax`, which is the shape `tax.service.ts`
			// reads. Writing a flat `settings.taxRate` left the tax engine on
			// defaults no matter what the user picked here.
			await updateTaxSettings(
				businessId,
				taxRegime === 'none'
					? { enabled: false }
					: {
							enabled: true,
							regime: toApiRegime(taxRegime),
							defaultTaxRate: Number(taxRate) || 0,
							...(taxRegime === 'gst' && gstin.trim() ? { registrationNumber: gstin.trim() } : {})
						}
			);

			completed = true;
			summary =
				`${paymentMethods.length} payment method${paymentMethods.length === 1 ? '' : 's'}` +
				(taxRegime === 'none'
					? ', no tax'
					: `, ${taxRegimes.find((r) => r.value === taxRegime)?.label} at ${taxRate}%`);
			toast.success('Payment and tax settings saved');
			return true;
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to save settings');
			return false;
		} finally {
			isLoading = false;
		}
	}

	async function handleSave() {
		await save();
	}

	const taxRegimes = [
		{ value: 'none' as const, label: 'No Tax', description: "I'll configure this later" },
		{ value: 'gst' as const, label: 'GST (India)', description: 'Goods and Services Tax' },
		{ value: 'vat' as const, label: 'VAT', description: 'Value Added Tax' },
		{ value: 'sales_tax' as const, label: 'Sales Tax', description: 'US Sales Tax' }
	];
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Payment & Tax</h1>
		<p class="mt-2 text-muted-foreground">Configure how you accept payments and handle taxes.</p>
	</div>

	{#if completed}
		<StepSuccess message={summary || 'Settings saved'} />
	{/if}

	<!-- Payment methods -->
	<div class="space-y-4">
		<p class="text-sm font-medium">Payment methods</p>

		<div class="space-y-3">
			<!-- Label primitive, not a bare <label>; `for` binds each row to its
			     Switch so the whole row is a hit target and is announced with it. -->
			<Label
				for="accept-cash"
				class="flex items-center justify-between rounded-lg border p-4 font-normal"
			>
				<span>
					<span class="block text-sm font-medium">Cash</span>
					<span class="block text-xs text-muted-foreground">Accept cash payments</span>
				</span>
				<Switch id="accept-cash" bind:checked={acceptCash} />
			</Label>

			<div>
				<Label
					for="accept-upi"
					class="flex items-center justify-between rounded-lg border p-4 font-normal {acceptUpi
						? 'rounded-b-none'
						: ''}"
				>
					<span>
						<span class="block text-sm font-medium">UPI</span>
						<span class="block text-xs text-muted-foreground">Accept UPI payments</span>
					</span>
					<Switch id="accept-upi" bind:checked={acceptUpi} />
				</Label>
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

			<Label
				for="accept-card"
				class="flex items-center justify-between rounded-lg border p-4 font-normal"
			>
				<span>
					<span class="block text-sm font-medium">Card</span>
					<span class="block text-xs text-muted-foreground">Accept credit/debit cards</span>
				</span>
				<Switch id="accept-card" bind:checked={acceptCard} />
			</Label>
		</div>
	</div>

	<!-- Tax regime -->
	<div class="space-y-4">
		<p class="text-sm font-medium">Tax configuration</p>

		<!-- RadioGroup: these options are mutually exclusive, which raw buttons
		     could not convey. Each option is a real radio with a bound label. -->
		<RadioGroup.Root bind:value={taxRegime} class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each taxRegimes as regime (regime.value)}
				<Label
					for="tax-regime-{regime.value}"
					class={cn(
						'flex cursor-pointer items-start gap-2 rounded-lg border-2 px-3 py-3 text-left font-normal transition-colors',
						taxRegime === regime.value
							? 'border-primary bg-primary/5'
							: 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
					)}
				>
					<RadioGroup.Item id="tax-regime-{regime.value}" value={regime.value} class="mt-0.5" />
					<span class="min-w-0">
						<span class="block text-sm font-medium">{regime.label}</span>
						<span class="mt-0.5 block text-xs text-muted-foreground">{regime.description}</span>
					</span>
				</Label>
			{/each}
		</RadioGroup.Root>

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
