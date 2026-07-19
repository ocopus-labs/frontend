<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Alert from '$lib/components/ui/alert';
	import * as Field from '$lib/components/ui/field';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		updateTaxSettings,
		validateTaxNumber,
		type TaxSettings,
		type TaxRegime,
		type RegimeInfo
	} from '$lib/api';
	import { goto, invalidate } from '$app/navigation';
	import { userFriendlyError } from '$lib/utils/error';
	import { IconFileSpreadsheet } from '@tabler/icons-svelte';

	let { data }: { data: PageData } = $props();

	const settings = $derived((data as any).taxSettings as TaxSettings | null);
	const regimes = $derived(((data as any).taxRegimes || []) as RegimeInfo[]);

	let enabled = $state(false);
	let regime = $state<TaxRegime>('custom');
	let registrationNumber = $state('');
	let legalName = $state('');
	let regionCode = $state('');
	let regionName = $state('');
	let defaultTaxRate = $state(0);
	let invoicePrefix = $state('INV');
	let financialYearStart = $state(1);

	// GST-specific
	let gstCompositionScheme = $state(false);
	let gstPlaceOfSupply = $state('');
	let gstEInvoiceEnabled = $state(false);
	let gstAutoGenerateEinvoice = $state(false);

	// VAT-specific
	let vatReverseCharge = $state(false);
	let vatOssRegistered = $state(false);

	// US Sales Tax-specific
	let salesTaxNexusStates = $state<string[]>([]);
	let salesTaxExemptionId = $state('');

	let isSaving = $state(false);
	let isValidating = $state(false);
	let validationResult = $state<{ valid: boolean; error?: string } | null>(null);

	const selectedRegime = $derived(regimes.find((r) => r.id === regime));
	const regionEntries = $derived(selectedRegime ? Object.entries(selectedRegime.regions) : []);

	// Sync state from loaded settings
	$effect(() => {
		if (settings) {
			enabled = settings.enabled;
			regime = settings.regime;
			registrationNumber = settings.registrationNumber;
			legalName = settings.legalName;
			regionCode = settings.regionCode;
			regionName = settings.regionName;
			defaultTaxRate = settings.defaultTaxRate;
			invoicePrefix = settings.invoicePrefix;
			financialYearStart = settings.financialYearStart;

			if (settings.gstConfig) {
				gstCompositionScheme = settings.gstConfig.compositionScheme;
				gstPlaceOfSupply = settings.gstConfig.placeOfSupply;
				gstEInvoiceEnabled = settings.gstConfig.eInvoiceEnabled;
				gstAutoGenerateEinvoice = (settings.gstConfig as any).autoGenerateEinvoice ?? false;
			}
			if (settings.vatConfig) {
				vatReverseCharge = settings.vatConfig.reverseChargeApplicable;
				vatOssRegistered = settings.vatConfig.ossRegistered;
			}
			if (settings.salesTaxConfig) {
				salesTaxNexusStates = settings.salesTaxConfig.nexusStates || [];
				salesTaxExemptionId = settings.salesTaxConfig.taxExemptionId || '';
			}
		}
	});

	// Reset validation when registration number changes
	$effect(() => {
		registrationNumber;
		validationResult = null;
	});

	async function handleValidate() {
		if (!registrationNumber.trim()) return;
		isValidating = true;
		const businessId = (data as any).businessId;
		try {
			validationResult = await validateTaxNumber(businessId, regime, registrationNumber.trim());
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isValidating = false;
		}
	}

	function handleRegionSelect(code: string) {
		regionCode = code;
		const regimeConfig = selectedRegime;
		if (regimeConfig) {
			regionName = regimeConfig.regions[code] || '';
		}
	}

	async function handleSave() {
		isSaving = true;
		const businessId = (data as any).businessId;

		try {
			const payload: Partial<TaxSettings> = {
				enabled,
				regime,
				registrationNumber: registrationNumber.trim(),
				legalName: legalName.trim(),
				regionCode,
				regionName,
				defaultTaxRate,
				invoicePrefix: invoicePrefix.trim(),
				financialYearStart
			};

			if (regime === 'gst_india') {
				payload.gstConfig = {
					compositionScheme: gstCompositionScheme,
					placeOfSupply: gstPlaceOfSupply || regionCode,
					eInvoiceEnabled: gstEInvoiceEnabled,
					autoGenerateEinvoice: gstAutoGenerateEinvoice
				} as any;
			} else if (regime === 'vat_eu' || regime === 'vat_uk') {
				payload.vatConfig = {
					reverseChargeApplicable: vatReverseCharge,
					ossRegistered: vatOssRegistered
				};
			} else if (regime === 'sales_tax_us') {
				payload.salesTaxConfig = {
					nexusStates: salesTaxNexusStates,
					taxExemptionId: salesTaxExemptionId.trim() || undefined
				};
			}

			await updateTaxSettings(businessId, payload);
			toast.success('Tax settings saved');
			await invalidate('app:tax-settings');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSaving = false;
		}
	}

	const MONTHS = [
		{ value: 1, label: 'January' },
		{ value: 2, label: 'February' },
		{ value: 3, label: 'March' },
		{ value: 4, label: 'April' },
		{ value: 5, label: 'May' },
		{ value: 6, label: 'June' },
		{ value: 7, label: 'July' },
		{ value: 8, label: 'August' },
		{ value: 9, label: 'September' },
		{ value: 10, label: 'October' },
		{ value: 11, label: 'November' },
		{ value: 12, label: 'December' }
	];
</script>

<PageShell
	back
	title="Tax & Invoicing"
	description="Configure tax regime, registration details, and invoice numbering"
>
	{#snippet actions()}
		{#if enabled}
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					const business = $page.params.business;
					const slug = $page.params.slug;
					goto(`/${business}/${slug}/settings/tax/export`);
				}}
			>
				<IconFileSpreadsheet class="mr-2 h-4 w-4" />
				Export Report
			</Button>
		{/if}
	{/snippet}

	{#if !settings}
		<Alert.Root variant="destructive">
			<Alert.Title>Couldn't load tax settings</Alert.Title>
			<Alert.Description>Reload the page to try again.</Alert.Description>
		</Alert.Root>
	{:else}
		<div>
			<SettingsSection
				title="Tax compliance"
				description="Component breakdowns on bills and sequential, gap-free invoice numbering."
			>
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-0.5">
						<Label for="tax-enabled" class="text-sm font-medium">Tax compliance module</Label>
						<p class="text-xs text-muted-foreground">
							{enabled
								? 'Tax calculations, invoicing, and compliance features are active'
								: 'Tax compliance features are disabled'}
						</p>
					</div>
					<Switch id="tax-enabled" bind:checked={enabled} />
				</div>
			</SettingsSection>

			{#if enabled}
				<SettingsSection
					title="Tax regime"
					description="The tax system your business is registered under. This drives which fields and rates apply."
				>
					<Field.Field>
						<Field.Label for="regime">Tax regime</Field.Label>
						<NativeSelect id="regime" class="w-full max-w-sm" bind:value={regime}>
							{#each regimes as r}
								<NativeSelectOption value={r.id}>{r.name}</NativeSelectOption>
							{/each}
						</NativeSelect>
					</Field.Field>

					{#if selectedRegime}
						<Field.Field>
							<Field.Label for="reg-number">{selectedRegime.registrationLabel}</Field.Label>
							<div class="flex gap-2">
								<Input
									id="reg-number"
									class="max-w-[14rem]"
									bind:value={registrationNumber}
									placeholder={regime === 'gst_india'
										? '22AAAAA0000A1Z5'
										: regime === 'sales_tax_us'
											? 'XX-XXXXXXX'
											: ''}
								/>
								<Button variant="outline" onclick={handleValidate} disabled={isValidating}>
									{#if isValidating}
										<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
									{/if}
									Validate
								</Button>
							</div>
							{#if validationResult}
								{#if validationResult.valid}
									<p class="text-sm text-success">Valid {selectedRegime.registrationLabel}</p>
								{:else}
									<p class="text-sm text-destructive">{validationResult.error}</p>
								{/if}
							{/if}
						</Field.Field>

						<Field.Field>
							<Field.Label for="legal-name">Legal name</Field.Label>
							<Input
								id="legal-name"
								class="max-w-sm"
								bind:value={legalName}
								placeholder="Business legal name"
							/>
						</Field.Field>

						{#if regionEntries.length > 0}
							<Field.Field>
								<Field.Label for="region">
									{regime === 'gst_india' ? 'State' : regime === 'vat_eu' ? 'Country' : 'State'}
								</Field.Label>
								<NativeSelect
									id="region"
									class="w-full max-w-sm"
									value={regionCode}
									onchange={(e) => handleRegionSelect((e.target as HTMLSelectElement).value)}
								>
									<NativeSelectOption value="">Select...</NativeSelectOption>
									{#each regionEntries as [code, name]}
										<NativeSelectOption value={code}>{name}</NativeSelectOption>
									{/each}
								</NativeSelect>
							</Field.Field>
						{/if}

						<Field.Field>
							<Field.Label for="default-rate">Default tax rate (%)</Field.Label>
							<NativeSelect id="default-rate" class="w-full max-w-[8rem]" bind:value={defaultTaxRate}>
								{#each selectedRegime.standardRates as rate}
									<NativeSelectOption value={rate}>{rate}%</NativeSelectOption>
								{/each}
							</NativeSelect>
						</Field.Field>
					{/if}
				</SettingsSection>

				<SettingsSection
					title="Invoice numbering"
					description="How invoice numbers are formed, and when the sequence resets."
				>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="invoice-prefix">Invoice prefix</Field.Label>
							<Input
								id="invoice-prefix"
								class="max-w-[10rem]"
								bind:value={invoicePrefix}
								placeholder="INV"
							/>
						</Field.Field>
						<Field.Field>
							<Field.Label for="fy-start">Financial year starts</Field.Label>
							<NativeSelect id="fy-start" class="w-full max-w-sm" bind:value={financialYearStart}>
								{#each MONTHS as m}
									<NativeSelectOption value={m.value}>{m.label}</NativeSelectOption>
								{/each}
							</NativeSelect>
						</Field.Field>
					</div>

					{#snippet footer()}
						Invoices will be numbered
						<span class="font-medium text-foreground">
							{invoicePrefix || 'INV'}/{financialYearStart === 4 ? '2025-26' : '2026'}/0001
						</span>
						onwards.
					{/snippet}
				</SettingsSection>

				{#if regime === 'gst_india'}
					<SettingsSection title="GST configuration" description="India GST-specific settings.">
						<div class="space-y-6">
							<div class="flex items-start justify-between gap-4">
								<div class="space-y-0.5">
									<Label for="gst-composition" class="text-sm font-medium">Composition scheme</Label>
									<p class="text-xs text-muted-foreground">
										Registered under GST Composition Scheme
									</p>
								</div>
								<Switch id="gst-composition" bind:checked={gstCompositionScheme} />
							</div>

							<div class="flex items-start justify-between gap-4">
								<div class="space-y-0.5">
									<Label for="gst-einvoice" class="text-sm font-medium">e-Invoice</Label>
									<p class="text-xs text-muted-foreground">
										Enable e-Invoice generation (mandatory for turnover &gt; 5 Cr)
									</p>
								</div>
								<Switch id="gst-einvoice" bind:checked={gstEInvoiceEnabled} />
							</div>

							{#if gstEInvoiceEnabled}
								<div class="flex items-start justify-between gap-4">
									<div class="space-y-0.5">
										<Label for="gst-auto-einvoice" class="text-sm font-medium">
											Auto-generate e-Invoice
										</Label>
										<p class="text-xs text-muted-foreground">
											Automatically generate IRN when an invoice is created for paid orders
										</p>
									</div>
									<Switch id="gst-auto-einvoice" bind:checked={gstAutoGenerateEinvoice} />
								</div>
							{/if}
						</div>
					</SettingsSection>
				{:else if regime === 'vat_eu' || regime === 'vat_uk'}
					<SettingsSection title="VAT configuration" description="VAT-specific settings.">
						<div class="space-y-6">
							<div class="flex items-start justify-between gap-4">
								<div class="space-y-0.5">
									<Label for="vat-reverse-charge" class="text-sm font-medium">Reverse charge</Label>
									<p class="text-xs text-muted-foreground">Reverse charge mechanism applicable</p>
								</div>
								<Switch id="vat-reverse-charge" bind:checked={vatReverseCharge} />
							</div>

							{#if regime === 'vat_eu'}
								<div class="flex items-start justify-between gap-4">
									<div class="space-y-0.5">
										<Label for="vat-oss" class="text-sm font-medium">OSS registered</Label>
										<p class="text-xs text-muted-foreground">
											One Stop Shop registration for EU cross-border sales
										</p>
									</div>
									<Switch id="vat-oss" bind:checked={vatOssRegistered} />
								</div>
							{/if}
						</div>
					</SettingsSection>
				{:else if regime === 'sales_tax_us'}
					<SettingsSection
						title="Sales tax configuration"
						description="US Sales Tax-specific settings."
					>
						<Field.Field>
							<Field.Label for="exemption-id">Tax exemption ID</Field.Label>
							<Input
								id="exemption-id"
								class="max-w-sm"
								bind:value={salesTaxExemptionId}
								placeholder="Exemption certificate number"
							/>
							<Field.Description>Optional.</Field.Description>
						</Field.Field>
					</SettingsSection>
				{/if}
			{/if}
		</div>

		<div class="flex justify-end">
			<Button onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Save Settings
			</Button>
		</div>
	{/if}
</PageShell>
