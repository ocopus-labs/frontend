<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import { IconArrowLeft, IconDownload, IconLoader2, IconFileSpreadsheet } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState } from '$lib/components/data-display';
	import { exportTaxReport, type TaxSettings } from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { downloadBlob } from '$lib/utils/export';

	let { data }: { data: PageData } = $props();

	const taxSettings = $derived((data as any).taxSettings as TaxSettings | null);
	const taxEnabled = $derived(taxSettings?.enabled === true);

	const REGIME_LABELS: Record<string, string> = {
		gst_india: 'GSTR-1 Export',
		vat_eu: 'VAT Return Export',
		vat_uk: 'VAT Return Export',
		sales_tax_us: 'Sales Tax Report',
		custom: 'Tax Report'
	};

	const REGIME_DESCRIPTIONS: Record<string, string> = {
		gst_india: 'Export data in GSTR-1 format with B2B, B2C, and HSN summary sections.',
		vat_eu: 'Export VAT return data with domestic sales and EC Sales List.',
		vat_uk: 'Export VAT return data with domestic sales summary.',
		sales_tax_us: 'Export sales tax data with state-by-state breakdown.',
		custom: 'Export a simple sales and tax summary report.'
	};

	// Date range - default to current month
	const today = new Date();
	const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	let fromDate = $state(firstOfMonth.toISOString().split('T')[0]);
	let toDate = $state(today.toISOString().split('T')[0]);

	let format = $state<'json' | 'csv'>('csv');
	let isExporting = $state(false);
	let previewData = $state<Record<string, unknown> | null>(null);
	let isLoadingPreview = $state(false);

	const exportLabel = $derived(
		taxSettings ? REGIME_LABELS[taxSettings.regime] || 'Tax Report' : 'Tax Report'
	);
	const exportDescription = $derived(
		taxSettings ? REGIME_DESCRIPTIONS[taxSettings.regime] || '' : ''
	);

	function goBack() {
		const business = $page.params.business;
		const slug = $page.params.slug;
		goto(`/${business}/${slug}/settings/tax`);
	}

	async function handlePreview() {
		if (!fromDate || !toDate) {
			toast.error('Please select a date range');
			return;
		}

		isLoadingPreview = true;
		const businessId = (data as any).businessId;

		try {
			const result = await exportTaxReport(businessId, { from: fromDate, to: toDate, format: 'json' });
			if (result && typeof result === 'object' && !('size' in result)) {
				previewData = result as Record<string, unknown>;
			}
			toast.success('Preview loaded');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isLoadingPreview = false;
		}
	}

	async function handleDownload() {
		if (!fromDate || !toDate) {
			toast.error('Please select a date range');
			return;
		}

		isExporting = true;
		const businessId = (data as any).businessId;

		try {
			if (format === 'csv') {
				const blob = await exportTaxReport(businessId, { from: fromDate, to: toDate, format: 'csv' });
				if (blob instanceof Blob) {
					downloadBlob(blob, `tax-report-${fromDate}-to-${toDate}.csv`);
					toast.success('Report downloaded');
				}
			} else {
				const result = await exportTaxReport(businessId, { from: fromDate, to: toDate, format: 'json' });
				const jsonStr = JSON.stringify(result, null, 2);
				const blob = new Blob([jsonStr], { type: 'application/json' });
				downloadBlob(blob, `tax-report-${fromDate}-to-${toDate}.json`);
				toast.success('Report downloaded');
			}
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isExporting = false;
		}
	}

	// Quick date range presets
	function setLastMonth() {
		const now = new Date();
		const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
		fromDate = firstDay.toISOString().split('T')[0];
		toDate = lastDay.toISOString().split('T')[0];
	}

	function setCurrentQuarter() {
		const now = new Date();
		const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
		const firstDay = new Date(now.getFullYear(), quarterMonth, 1);
		fromDate = firstDay.toISOString().split('T')[0];
		toDate = now.toISOString().split('T')[0];
	}

	function setLastQuarter() {
		const now = new Date();
		const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
		const firstDay = new Date(now.getFullYear(), quarterMonth - 3, 1);
		const lastDay = new Date(now.getFullYear(), quarterMonth, 0);
		fromDate = firstDay.toISOString().split('T')[0];
		toDate = lastDay.toISOString().split('T')[0];
	}

	function setCurrentYear() {
		const now = new Date();
		const start = taxSettings?.financialYearStart || 1;
		let year = now.getFullYear();
		const currentMonth = now.getMonth() + 1;
		if (start > 1 && currentMonth < start) {
			year -= 1;
		}
		const firstDay = new Date(year, start - 1, 1);
		fromDate = firstDay.toISOString().split('T')[0];
		toDate = now.toISOString().split('T')[0];
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<PageHeader back title={exportLabel} description={exportDescription}>
		{#snippet actions()}
			<Button variant="outline" size="sm" onclick={goBack}>
				<IconArrowLeft class="mr-2 h-4 w-4" />
				Back to Settings
			</Button>
		{/snippet}
	</PageHeader>

	{#if !taxEnabled}
		<EmptyState
			type="no-results"
			title="Tax not enabled"
			description="Enable tax in your tax settings to generate tax return exports."
		/>
	{:else}
		<!-- Date Range & Options -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Report Period</Card.Title>
				<Card.Description>Select the date range for your tax report export.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4">
					<!-- Quick presets -->
					<div class="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" onclick={setLastMonth}>Last Month</Button>
						<Button variant="outline" size="sm" onclick={setCurrentQuarter}>Current Quarter</Button>
						<Button variant="outline" size="sm" onclick={setLastQuarter}>Last Quarter</Button>
						<Button variant="outline" size="sm" onclick={setCurrentYear}>Financial Year</Button>
					</div>

					<!-- Custom date range -->
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="grid gap-2">
							<label for="from-date" class="text-sm font-medium">From</label>
							<Input id="from-date" type="date" bind:value={fromDate} />
						</div>
						<div class="grid gap-2">
							<label for="to-date" class="text-sm font-medium">To</label>
							<Input id="to-date" type="date" bind:value={toDate} />
						</div>
					</div>

					<!-- Format selection -->
					<div class="grid gap-2">
						<label class="text-sm font-medium">Export Format</label>
						<div class="flex gap-3">
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" bind:group={format} value="csv" class="accent-primary" />
								<span class="text-sm">CSV (Spreadsheet)</span>
							</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" bind:group={format} value="json" class="accent-primary" />
								<span class="text-sm">JSON (Data)</span>
							</label>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex gap-3">
						<Button variant="outline" onclick={handlePreview} disabled={isLoadingPreview}>
							{#if isLoadingPreview}
								<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<IconFileSpreadsheet class="mr-2 h-4 w-4" />
							{/if}
							Preview
						</Button>
						<Button onclick={handleDownload} disabled={isExporting}>
							{#if isExporting}
								<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<IconDownload class="mr-2 h-4 w-4" />
							{/if}
							Download {format.toUpperCase()}
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Preview -->
		{#if previewData}
			{@const report = (previewData as any).report || previewData}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Report Preview</Card.Title>
					<Card.Description>
						{report.regimeName || 'Tax Report'} &mdash; {report.period?.from} to {report.period?.to}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<!-- Summary Stats -->
					<div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
						<div class="rounded-lg border p-3">
							<p class="text-xs text-muted-foreground">Invoices</p>
							<p class="text-lg font-bold">{report.totalInvoices || 0}</p>
						</div>
						<div class="rounded-lg border p-3">
							<p class="text-xs text-muted-foreground">Taxable Value</p>
							<p class="text-lg font-bold">{(report.totalTaxableValue || 0).toFixed(2)}</p>
						</div>
						<div class="rounded-lg border p-3">
							<p class="text-xs text-muted-foreground">Tax Collected</p>
							<p class="text-lg font-bold">{(report.totalTaxCollected || 0).toFixed(2)}</p>
						</div>
						<div class="rounded-lg border p-3">
							<p class="text-xs text-muted-foreground">Gross Value</p>
							<p class="text-lg font-bold">{(report.totalGrossValue || 0).toFixed(2)}</p>
						</div>
					</div>

					<!-- Component Totals -->
					{#if report.componentTotals && Object.keys(report.componentTotals).length > 0}
						<div class="mb-4">
							<h4 class="mb-2 text-sm font-medium">Tax Component Breakdown</h4>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Component</Table.Head>
										<Table.Head class="text-right">Amount</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each Object.entries(report.componentTotals) as [name, amount]}
										<Table.Row>
											<Table.Cell>{name}</Table.Cell>
											<Table.Cell class="text-right font-medium">{(amount as number).toFixed(2)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}

					<!-- Rate Summary -->
					{#if report.rateSummary && report.rateSummary.length > 0}
						<div>
							<h4 class="mb-2 text-sm font-medium">Rate Summary</h4>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Rate (%)</Table.Head>
										<Table.Head class="text-right">Taxable Value</Table.Head>
										<Table.Head class="text-right">Tax Amount</Table.Head>
										<Table.Head class="text-right">Invoices</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each report.rateSummary as rs}
										<Table.Row>
											<Table.Cell>{rs.rate}%</Table.Cell>
											<Table.Cell class="text-right">{rs.taxableValue.toFixed(2)}</Table.Cell>
											<Table.Cell class="text-right">{rs.taxAmount.toFixed(2)}</Table.Cell>
											<Table.Cell class="text-right">{rs.invoiceCount}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}

					<!-- GST-specific sections -->
					{#if report.b2b && report.b2b.length > 0}
						<div class="mt-4">
							<h4 class="mb-2 text-sm font-medium">B2B Transactions ({report.b2b.length} customers)</h4>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>GSTIN</Table.Head>
										<Table.Head>Customer</Table.Head>
										<Table.Head class="text-right">Invoices</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each report.b2b as entry}
										<Table.Row>
											<Table.Cell class="font-mono text-xs">{entry.customerTaxId}</Table.Cell>
											<Table.Cell>{entry.customerName}</Table.Cell>
											<Table.Cell class="text-right">{entry.invoices.length}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}

					{#if report.hsnSummary && report.hsnSummary.length > 0}
						<div class="mt-4">
							<h4 class="mb-2 text-sm font-medium">HSN Summary</h4>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>HSN Code</Table.Head>
										<Table.Head>Description</Table.Head>
										<Table.Head class="text-right">Qty</Table.Head>
										<Table.Head class="text-right">Taxable Value</Table.Head>
										<Table.Head class="text-right">Total Tax</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each report.hsnSummary as h}
										<Table.Row>
											<Table.Cell class="font-mono text-xs">{h.hsnCode}</Table.Cell>
											<Table.Cell class="truncate max-w-[150px]">{h.description}</Table.Cell>
											<Table.Cell class="text-right">{h.quantity}</Table.Cell>
											<Table.Cell class="text-right">{h.taxableValue.toFixed(2)}</Table.Cell>
											<Table.Cell class="text-right">{h.totalTax.toFixed(2)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}

					<!-- VAT-specific sections -->
					{#if report.ecSalesList && report.ecSalesList.length > 0}
						<div class="mt-4">
							<h4 class="mb-2 text-sm font-medium">EC Sales List</h4>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>VAT ID</Table.Head>
										<Table.Head>Customer</Table.Head>
										<Table.Head>Country</Table.Head>
										<Table.Head class="text-right">Total Value</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each report.ecSalesList as ec}
										<Table.Row>
											<Table.Cell class="font-mono text-xs">{ec.customerVatId}</Table.Cell>
											<Table.Cell>{ec.customerName}</Table.Cell>
											<Table.Cell>{ec.country}</Table.Cell>
											<Table.Cell class="text-right">{ec.totalValue.toFixed(2)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}

					<!-- US Sales Tax state breakdown -->
					{#if report.stateBreakdown && report.stateBreakdown.length > 0}
						<div class="mt-4">
							<h4 class="mb-2 text-sm font-medium">State Breakdown</h4>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>State</Table.Head>
										<Table.Head class="text-right">Taxable Value</Table.Head>
										<Table.Head class="text-right">Tax Amount</Table.Head>
										<Table.Head class="text-right">Invoices</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each report.stateBreakdown as entry}
										<Table.Row>
											<Table.Cell>{entry.state}</Table.Cell>
											<Table.Cell class="text-right">{entry.taxableValue.toFixed(2)}</Table.Cell>
											<Table.Cell class="text-right">{entry.taxAmount.toFixed(2)}</Table.Cell>
											<Table.Cell class="text-right">{entry.invoiceCount}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
