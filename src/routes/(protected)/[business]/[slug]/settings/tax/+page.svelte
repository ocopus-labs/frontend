<script lang="ts">
	import type { PageData } from './$types';
	import MobilePageHeader from '$lib/components/global/mobile-page-header.svelte';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		updateTaxSettings,
		validateTaxNumber,
		type TaxSettings,
		type TaxRegime,
		type RegimeInfo
	} from '$lib/api';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
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
	const regionEntries = $derived(
		selectedRegime ? Object.entries(selectedRegime.regions) : []
	);

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
			validationResult = await validateTaxNumber(
				businessId,
				regime,
				registrationNumber.trim()
			);
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
					eInvoiceEnabled: gstEInvoiceEnabled
				};
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

<MobilePageHeader title="Tax & Invoicing" backHref={`/${$page.params.business}/${$page.params.slug}/settings`} />
<div class="flex flex-col gap-6 p-6">
	<PageHeader
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
	</PageHeader>

	{#if !settings}
		<Card.Root>
			<Card.Content class="p-8 text-center">
				<p class="text-muted-foreground">Failed to load tax settings.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Enable/Disable -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Tax Compliance</Card.Title>
				<Card.Description
					>Enable tax compliance features including component breakdowns and sequential
					invoicing</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium">Tax Compliance Module</p>
						<p class="text-sm text-muted-foreground">
							{enabled
								? 'Tax calculations, invoicing, and compliance features are active'
								: 'Tax compliance features are disabled'}
						</p>
					</div>
					<Switch bind:checked={enabled} />
				</div>
			</Card.Content>
		</Card.Root>

		{#if enabled}
			<!-- Tax Regime -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Tax Regime</Card.Title>
					<Card.Description>Select the tax system applicable to your business</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4">
					<div class="grid gap-2">
						<label for="regime" class="text-sm font-medium">Tax Regime</label>
						<select
							id="regime"
							class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							bind:value={regime}
						>
							{#each regimes as r}
								<option value={r.id}>{r.name}</option>
							{/each}
						</select>
					</div>

					{#if selectedRegime}
						<div class="grid gap-2">
							<label for="reg-number" class="text-sm font-medium"
								>{selectedRegime.registrationLabel}</label
							>
							<div class="flex gap-2">
								<Input
									id="reg-number"
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
									<p class="text-sm text-green-600">Valid {selectedRegime.registrationLabel}</p>
								{:else}
									<p class="text-sm text-destructive">{validationResult.error}</p>
								{/if}
							{/if}
						</div>

						<div class="grid gap-2">
							<label for="legal-name" class="text-sm font-medium">Legal Name</label>
							<Input id="legal-name" bind:value={legalName} placeholder="Business legal name" />
						</div>

						{#if regionEntries.length > 0}
							<div class="grid gap-2">
								<label for="region" class="text-sm font-medium"
									>{regime === 'gst_india'
										? 'State'
										: regime === 'vat_eu'
											? 'Country'
											: 'State'}</label
								>
								<select
									id="region"
									class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
									value={regionCode}
									onchange={(e) => handleRegionSelect((e.target as HTMLSelectElement).value)}
								>
									<option value="">Select...</option>
									{#each regionEntries as [code, name]}
										<option value={code}>{name}</option>
									{/each}
								</select>
							</div>
						{/if}

						<div class="grid gap-2">
							<label for="default-rate" class="text-sm font-medium">Default Tax Rate (%)</label>
							<select
								id="default-rate"
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								bind:value={defaultTaxRate}
							>
								{#each selectedRegime.standardRates as rate}
									<option value={rate}>{rate}%</option>
								{/each}
							</select>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Invoice Settings -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Invoice Settings</Card.Title>
					<Card.Description>Configure invoice numbering and financial year</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4 sm:grid-cols-2">
					<div class="grid gap-2">
						<label for="invoice-prefix" class="text-sm font-medium">Invoice Prefix</label>
						<Input id="invoice-prefix" bind:value={invoicePrefix} placeholder="INV" />
						<p class="text-xs text-muted-foreground">
							e.g., {invoicePrefix || 'INV'}/{financialYearStart === 4
								? '2025-26'
								: '2026'}/0001
						</p>
					</div>
					<div class="grid gap-2">
						<label for="fy-start" class="text-sm font-medium">Financial Year Starts</label>
						<select
							id="fy-start"
							class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							bind:value={financialYearStart}
						>
							{#each MONTHS as m}
								<option value={m.value}>{m.label}</option>
							{/each}
						</select>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Regime-Specific Settings -->
			{#if regime === 'gst_india'}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">GST Configuration</Card.Title>
						<Card.Description>India GST-specific settings</Card.Description>
					</Card.Header>
					<Card.Content class="grid gap-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">Composition Scheme</p>
								<p class="text-sm text-muted-foreground">
									Registered under GST Composition Scheme
								</p>
							</div>
							<Switch bind:checked={gstCompositionScheme} />
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">e-Invoice</p>
								<p class="text-sm text-muted-foreground">
									Enable e-Invoice generation (mandatory for turnover > 5 Cr)
								</p>
							</div>
							<Switch bind:checked={gstEInvoiceEnabled} />
						</div>
					</Card.Content>
				</Card.Root>
			{:else if regime === 'vat_eu' || regime === 'vat_uk'}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">VAT Configuration</Card.Title>
						<Card.Description>VAT-specific settings</Card.Description>
					</Card.Header>
					<Card.Content class="grid gap-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">Reverse Charge</p>
								<p class="text-sm text-muted-foreground">
									Reverse charge mechanism applicable
								</p>
							</div>
							<Switch bind:checked={vatReverseCharge} />
						</div>
						{#if regime === 'vat_eu'}
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium">OSS Registered</p>
									<p class="text-sm text-muted-foreground">
										One Stop Shop registration for EU cross-border sales
									</p>
								</div>
								<Switch bind:checked={vatOssRegistered} />
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{:else if regime === 'sales_tax_us'}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">Sales Tax Configuration</Card.Title>
						<Card.Description>US Sales Tax-specific settings</Card.Description>
					</Card.Header>
					<Card.Content class="grid gap-4">
						<div class="grid gap-2">
							<label for="exemption-id" class="text-sm font-medium"
								>Tax Exemption ID (optional)</label
							>
							<Input
								id="exemption-id"
								bind:value={salesTaxExemptionId}
								placeholder="Exemption certificate number"
							/>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
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
