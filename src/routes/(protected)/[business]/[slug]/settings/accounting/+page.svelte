<script lang="ts">
	import type { PageData } from './$types';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Field from '$lib/components/ui/field';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { userFriendlyError } from '$lib/utils/error';
	import {
		IconLoader2,
		IconDownload,
		IconFileSpreadsheet,
		IconCalendar,
		IconCheck,
		IconX,
		IconClock
	} from '@tabler/icons-svelte';
	import {
		createAccountingExport,
		downloadAccountingExport,
		type AccountingProvider,
		type AccountingExport,
		type AccountingExportStatus
	} from '$lib/api/accounting';

	let { data }: { data: PageData } = $props();

	const exports = $derived(((data as any).exports || []) as AccountingExport[]);
	const businessId = $derived((data as any).businessId as string);

	// ==================== Provider Config ====================

	const PROVIDERS: {
		id: AccountingProvider;
		name: string;
		description: string;
		format: string;
	}[] = [
		{
			id: 'quickbooks',
			name: 'QuickBooks',
			description: 'IIF format for QuickBooks Desktop & Online',
			format: 'IIF'
		},
		{
			id: 'tally',
			name: 'Tally',
			description: 'XML format compatible with Tally ERP',
			format: 'XML'
		},
		{
			id: 'xero',
			name: 'Xero',
			description: 'CSV format for Xero bulk import',
			format: 'CSV'
		},
		{
			id: 'zoho',
			name: 'Zoho Books',
			description: 'CSV format for Zoho Books import',
			format: 'CSV'
		},
		{
			id: 'generic',
			name: 'Generic CSV',
			description: 'Standard CSV for any accounting software',
			format: 'CSV'
		}
	];

	// ==================== Wizard State ====================

	let selectedProvider = $state<AccountingProvider | null>(null);
	let startDate = $state('');
	let endDate = $state('');
	let isGenerating = $state(false);
	let lastExport = $state<AccountingExport | null>(null);
	let downloadingId = $state<string | null>(null);

	const canGenerate = $derived(selectedProvider && startDate && endDate && startDate < endDate);

	// ==================== Actions ====================

	async function handleGenerate() {
		if (!selectedProvider || !startDate || !endDate) return;

		if (startDate >= endDate) {
			toast.error('Start date must be before end date');
			return;
		}

		isGenerating = true;
		lastExport = null;

		try {
			const result = await createAccountingExport(businessId, {
				provider: selectedProvider,
				startDate,
				endDate
			});
			lastExport = result.export;
			toast.success('Export generated successfully');
			await invalidate('app:accounting-exports');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isGenerating = false;
		}
	}

	async function handleDownload(exportItem: AccountingExport) {
		downloadingId = exportItem.id;
		try {
			const blob = await downloadAccountingExport(businessId, exportItem.id);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `accounting-export-${exportItem.provider}-${exportItem.startDate.split('T')[0]}-to-${exportItem.endDate.split('T')[0]}.${getExtension(exportItem.format)}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success('Download started');
			await invalidate('app:accounting-exports');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			downloadingId = null;
		}
	}

	// ==================== Helpers ====================

	function getExtension(format: string): string {
		switch (format.toLowerCase()) {
			case 'csv':
				return 'csv';
			case 'iif':
				return 'iif';
			case 'xml':
				return 'xml';
			case 'json':
				return 'json';
			default:
				return 'dat';
		}
	}

	function getProviderName(provider: string): string {
		return PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusVariant(
		status: AccountingExportStatus
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'ready':
				return 'default';
			case 'downloaded':
				return 'secondary';
			case 'generating':
				return 'outline';
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function getStatusLabel(status: AccountingExportStatus): string {
		switch (status) {
			case 'ready':
				return 'Ready';
			case 'downloaded':
				return 'Downloaded';
			case 'generating':
				return 'Generating';
			case 'failed':
				return 'Failed';
			default:
				return status;
		}
	}
</script>

<PageShell
	back
	title="Accounting Export"
	description="Export financial data for your accounting software"
>
	<div>
		<!-- Step 1: Provider Selection -->
		<SettingsSection
			title="1. Select accounting provider"
			description="Choose the software you want to export data for."
		>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each PROVIDERS as provider (provider.id)}
					<Button
						variant="outline"
						onclick={() => (selectedProvider = provider.id)}
						class="h-auto flex-col items-stretch gap-1 border-2 p-4 text-left whitespace-normal {selectedProvider ===
						provider.id
							? 'border-primary bg-primary/5'
							: 'border-border'}"
					>
						<span class="flex items-center justify-between gap-2">
							<span class="text-sm font-medium">{provider.name}</span>
							{#if selectedProvider === provider.id}
								<IconCheck class="h-4 w-4 shrink-0 text-primary" />
							{/if}
						</span>
						<span class="text-xs font-normal text-muted-foreground">{provider.description}</span>
						<Badge variant="outline" class="mt-1 w-fit text-[10px]">{provider.format}</Badge>
					</Button>
				{/each}
			</div>
		</SettingsSection>

		<!-- Step 2: Date Range -->
		<SettingsSection
			title="2. Select date range"
			description="Choose the period you want to export data for."
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="start-date">Start date</Field.Label>
					<div class="relative">
						<IconCalendar
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input id="start-date" type="date" bind:value={startDate} class="max-w-sm pl-10" />
					</div>
				</Field.Field>
				<Field.Field>
					<Field.Label for="end-date">End date</Field.Label>
					<div class="relative">
						<IconCalendar
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input id="end-date" type="date" bind:value={endDate} class="max-w-sm pl-10" />
					</div>
				</Field.Field>
			</div>
			{#if startDate && endDate && startDate >= endDate}
				<p class="text-sm text-destructive">Start date must be before end date</p>
			{/if}
		</SettingsSection>

		<!-- Step 3: Generate -->
		<SettingsSection
			title="3. Generate export"
			description={selectedProvider
				? `Generate a ${getProviderName(selectedProvider)} export`
				: 'Select a provider and date range to generate'}
		>
			<div>
				<Button onclick={handleGenerate} disabled={!canGenerate || isGenerating}>
					{#if isGenerating}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						Generating...
					{:else}
						<IconFileSpreadsheet class="mr-2 h-4 w-4" />
						Generate Export
					{/if}
				</Button>
			</div>

			{#if lastExport}
				<Card.Root class="bg-muted/30 py-4">
					<Card.Content class="flex items-center justify-between gap-4">
						<div class="flex flex-col gap-1">
							<p class="text-sm font-medium">
								{getProviderName(lastExport.provider)} export ready
							</p>
							<p class="text-xs text-muted-foreground">
								{formatDate(lastExport.startDate)} - {formatDate(lastExport.endDate)}
								{#if lastExport.recordCount !== null}
									&middot; {lastExport.recordCount} records
								{/if}
							</p>
						</div>
						{#if lastExport.status === 'ready' || lastExport.status === 'downloaded'}
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleDownload(lastExport!)}
								disabled={downloadingId === lastExport.id}
							>
								{#if downloadingId === lastExport.id}
									<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
								{:else}
									<IconDownload class="mr-2 h-4 w-4" />
								{/if}
								Download
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		</SettingsSection>
	</div>

	<!-- Export History -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Export History</Card.Title>
			<Card.Description>Previously generated accounting exports</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if exports.length === 0}
				<div class="flex flex-col items-center gap-2 py-8 text-center">
					<IconFileSpreadsheet class="h-10 w-10 text-muted-foreground/50" />
					<p class="text-sm text-muted-foreground">No exports yet</p>
					<p class="text-xs text-muted-foreground">
						Generate your first export using the wizard above
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Provider</Table.Head>
								<Table.Head class="hidden md:table-cell">Date Range</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="hidden lg:table-cell">Format</Table.Head>
								<Table.Head class="hidden lg:table-cell">Records</Table.Head>
								<Table.Head class="hidden lg:table-cell">Created</Table.Head>
								<Table.Head class="text-right">Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each exports as exportItem (exportItem.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										{getProviderName(exportItem.provider)}
									</Table.Cell>
									<Table.Cell class="hidden text-sm text-muted-foreground md:table-cell">
										{formatDate(exportItem.startDate)} - {formatDate(exportItem.endDate)}
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusVariant(exportItem.status)}>
											{#if exportItem.status === 'generating'}
												<IconClock class="mr-1 h-3 w-3" />
											{:else if exportItem.status === 'ready'}
												<IconCheck class="mr-1 h-3 w-3" />
											{:else if exportItem.status === 'downloaded'}
												<IconDownload class="mr-1 h-3 w-3" />
											{:else if exportItem.status === 'failed'}
												<IconX class="mr-1 h-3 w-3" />
											{/if}
											{getStatusLabel(exportItem.status)}
										</Badge>
									</Table.Cell>
									<Table.Cell class="hidden uppercase lg:table-cell">{exportItem.format}</Table.Cell
									>
									<Table.Cell class="hidden lg:table-cell"
										>{exportItem.recordCount ?? '-'}</Table.Cell
									>
									<Table.Cell class="hidden text-sm text-muted-foreground lg:table-cell">
										{formatDate(exportItem.createdAt)}
									</Table.Cell>
									<Table.Cell class="text-right">
										{#if exportItem.status === 'ready' || exportItem.status === 'downloaded'}
											<Button
												variant="ghost"
												size="sm"
												onclick={() => handleDownload(exportItem)}
												disabled={downloadingId === exportItem.id}
											>
												{#if downloadingId === exportItem.id}
													<IconLoader2 class="h-4 w-4 animate-spin" />
												{:else}
													<IconDownload class="h-4 w-4" />
												{/if}
											</Button>
										{:else if exportItem.status === 'failed'}
											<span class="text-xs text-destructive" title={exportItem.error ?? ''}>
												Failed
											</span>
										{:else}
											<span class="text-xs text-muted-foreground">--</span>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</PageShell>
