<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import BarChart from '$lib/components/chart/lazy-bar-chart.svelte';
	import { downloadCsv } from '$lib/utils/export';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import {
		executeReportQuery,
		saveReport as saveReportApi,
		runSavedReport,
		deleteSavedReport,
		type ReportDimension,
		type ReportMetric,
		type ReportResult,
		type ReportQueryConfig,
		type SavedReport
	} from '$lib/api';
	import {
		IconChartBar,
		IconDeviceFloppy,
		IconDownload,
		IconPlayerPlay,
		IconArrowLeft,
		IconArrowRight,
		IconTrash,
		IconLoader2,
		IconReportAnalytics
	} from '@tabler/icons-svelte';

	let { data } = $props();

	const currency = $derived(
		((data.business as any)?.settings?.currency || 'USD') as CurrencyCode
	);

	function formatCurrency(value: number): string {
		return i18nFormatCurrency(value, currency);
	}

	const businessId = $derived(data.businessId);
	const allDimensions: ReportDimension[] = data.dimensions ?? [];
	const allMetrics: ReportMetric[] = data.metrics ?? [];

	// ==================== State ====================

	let currentStep = $state(1);
	let selectedMetrics = $state<Set<string>>(new Set());
	let selectedDimensions = $state<Set<string>>(new Set());

	// Filters
	let filterStartDate = $state('');
	let filterEndDate = $state('');
	let filterCategory = $state('');
	let filterStaffId = $state('');
	let filterPaymentMethod = $state('');

	// Results
	let result = $state<ReportResult | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	// Save dialog
	let showSaveInput = $state(false);
	let reportName = $state('');
	let reportIsShared = $state(false);

	// Saved reports
	let savedReports = $state<SavedReport[]>(data.savedReports ?? []);

	// ==================== Derived ====================

	const canProceedFromStep1 = $derived(selectedMetrics.size > 0);
	const canProceedFromStep2 = $derived(selectedDimensions.size > 0);

	const currentConfig = $derived<ReportQueryConfig>({
		metrics: [...selectedMetrics],
		dimensions: [...selectedDimensions],
		filters: {
			...(filterStartDate ? { startDate: filterStartDate } : {}),
			...(filterEndDate ? { endDate: filterEndDate } : {}),
			...(filterCategory ? { category: filterCategory } : {}),
			...(filterStaffId ? { staffId: filterStaffId } : {}),
			...(filterPaymentMethod ? { paymentMethod: filterPaymentMethod } : {})
		}
	});

	const chartData = $derived.by(() => {
		if (!result || result.rows.length === 0) return [];
		return result.rows.map((row) => {
			const entry: Record<string, any> = {};
			// Use first dimension as x-axis label
			const firstDim = result!.meta.dimensions[0];
			entry.label = String(row[firstDim] ?? 'N/A');
			// Add metric values
			for (const metric of result!.meta.metrics) {
				entry[metric] = Number(row[metric] ?? 0);
			}
			return entry;
		});
	});

	const chartSeries = $derived.by(() => {
		if (!result) return [];
		const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
		return result.meta.metrics.map((key, i) => {
			const metricDef = allMetrics.find((m) => m.key === key);
			return {
				key,
				label: metricDef?.label ?? key,
				color: colors[i % colors.length]
			};
		});
	});

	// ==================== Actions ====================

	function toggleMetric(key: string) {
		const next = new Set(selectedMetrics);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedMetrics = next;
	}

	function toggleDimension(key: string) {
		const next = new Set(selectedDimensions);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedDimensions = next;
	}

	function nextStep() {
		if (currentStep < 4) currentStep++;
		if (currentStep === 4) {
			runQuery();
		}
	}

	function prevStep() {
		if (currentStep > 1) currentStep--;
	}

	function goToStep(step: number) {
		if (step === 4 && (!canProceedFromStep1 || !canProceedFromStep2)) return;
		if (step >= 2 && !canProceedFromStep1) return;
		if (step >= 3 && !canProceedFromStep2) return;
		currentStep = step;
		if (step === 4) runQuery();
	}

	async function runQuery() {
		isLoading = true;
		result = null;
		try {
			const response = await executeReportQuery(businessId, currentConfig);
			result = response.result;
		} catch (err) {
			toast.error('Failed to run report query');
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	async function handleSaveReport() {
		if (!reportName.trim()) {
			toast.error('Please enter a report name');
			return;
		}
		isSaving = true;
		try {
			const response = await saveReportApi(businessId, {
				name: reportName.trim(),
				config: currentConfig,
				isShared: reportIsShared
			});
			savedReports = [response.report, ...savedReports];
			toast.success('Report saved successfully');
			showSaveInput = false;
			reportName = '';
		} catch (err) {
			toast.error('Failed to save report');
			console.error(err);
		} finally {
			isSaving = false;
		}
	}

	async function handleRunSaved(report: SavedReport) {
		isLoading = true;
		result = null;

		// Restore the config
		const config = report.config;
		selectedMetrics = new Set(config.metrics);
		selectedDimensions = new Set(config.dimensions);
		if (config.filters) {
			filterStartDate = config.filters.startDate ?? '';
			filterEndDate = config.filters.endDate ?? '';
			filterCategory = config.filters.category ?? '';
			filterStaffId = config.filters.staffId ?? '';
			filterPaymentMethod = config.filters.paymentMethod ?? '';
		}
		currentStep = 4;

		try {
			const response = await runSavedReport(businessId, report.id);
			result = response.result;
		} catch (err) {
			toast.error('Failed to run saved report');
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	async function handleDeleteSaved(reportId: string) {
		try {
			await deleteSavedReport(businessId, reportId);
			savedReports = savedReports.filter((r) => r.id !== reportId);
			toast.success('Report deleted');
		} catch (err) {
			toast.error('Failed to delete report');
			console.error(err);
		}
	}

	function exportCsv() {
		if (!result) return;
		const headers = result.columns.map((c) => c.label);
		const rows = result.rows.map((row) =>
			result!.columns.map((col) => {
				const val = row[col.key];
				return val != null ? val : '';
			}) as (string | number)[]
		);
		// Add totals row
		rows.push(
			result.columns.map((col) => {
				if (col.key in result!.totals) return result!.totals[col.key];
				return col.key === result!.meta.dimensions[0] ? 'TOTAL' : '';
			}) as (string | number)[]
		);
		downloadCsv('custom-report.csv', headers, rows);
		toast.success('CSV exported');
	}

	function formatValue(value: unknown, format?: string): string {
		if (value == null) return '-';
		if (format === 'currency') return formatCurrency(Number(value));
		if (format === 'percentage') return `${Number(value).toFixed(1)}%`;
		return String(value);
	}
</script>

<div class="space-y-6 pb-8">
	<PageHeader
		title="Custom Report Builder"
		description="Build custom analytics reports by selecting metrics, dimensions, and filters"
	>
		{#snippet actions()}
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					const base = $page.url.pathname.replace('/builder', '');
					goto(base);
				}}
			>
				<IconArrowLeft class="mr-1.5 h-4 w-4" />
				Back to Reports
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Step indicator -->
	<div class="flex items-center justify-center gap-2 px-6">
		{#each [
			{ step: 1, label: 'Metrics' },
			{ step: 2, label: 'Dimensions' },
			{ step: 3, label: 'Filters' },
			{ step: 4, label: 'Preview' }
		] as { step, label }}
			<button
				class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors
					{currentStep === step
					? 'bg-primary text-primary-foreground'
					: currentStep > step
						? 'bg-primary/20 text-primary cursor-pointer'
						: 'bg-muted text-muted-foreground'}"
				onclick={() => goToStep(step)}
				disabled={step > currentStep + 1}
			>
				<span class="flex h-5 w-5 items-center justify-center rounded-full text-xs
					{currentStep >= step ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'}">
					{step}
				</span>
				{label}
			</button>
			{#if step < 4}
				<div class="h-px w-8 bg-border"></div>
			{/if}
		{/each}
	</div>

	<div class="px-6">
		<!-- Step 1: Pick Metrics -->
		{#if currentStep === 1}
			<Card.Root>
				<Card.Header>
					<Card.Title>Select Metrics</Card.Title>
					<Card.Description>Choose the metrics you want to include in your report</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each allMetrics as metric}
							<button
								class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent
									{selectedMetrics.has(metric.key) ? 'border-primary bg-primary/5' : 'border-border'}"
								onclick={() => toggleMetric(metric.key)}
							>
								<Checkbox checked={selectedMetrics.has(metric.key)} />
								<div>
									<p class="font-medium text-sm">{metric.label}</p>
									<p class="text-xs text-muted-foreground">{metric.description}</p>
									<Badge variant="outline" class="mt-1 text-xs">{metric.format}</Badge>
								</div>
							</button>
						{/each}
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<div class="text-sm text-muted-foreground">
						{selectedMetrics.size} metric{selectedMetrics.size !== 1 ? 's' : ''} selected
					</div>
					<Button onclick={nextStep} disabled={!canProceedFromStep1}>
						Next
						<IconArrowRight class="ml-1.5 h-4 w-4" />
					</Button>
				</Card.Footer>
			</Card.Root>

		<!-- Step 2: Pick Dimensions -->
		{:else if currentStep === 2}
			<Card.Root>
				<Card.Header>
					<Card.Title>Select Dimensions</Card.Title>
					<Card.Description>Choose how you want to group your data</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each allDimensions as dimension}
							<button
								class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent
									{selectedDimensions.has(dimension.key) ? 'border-primary bg-primary/5' : 'border-border'}"
								onclick={() => toggleDimension(dimension.key)}
							>
								<Checkbox checked={selectedDimensions.has(dimension.key)} />
								<div>
									<p class="font-medium text-sm">{dimension.label}</p>
									<p class="text-xs text-muted-foreground">{dimension.description}</p>
								</div>
							</button>
						{/each}
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline" onclick={prevStep}>
						<IconArrowLeft class="mr-1.5 h-4 w-4" />
						Back
					</Button>
					<div class="flex items-center gap-3">
						<span class="text-sm text-muted-foreground">
							{selectedDimensions.size} dimension{selectedDimensions.size !== 1 ? 's' : ''} selected
						</span>
						<Button onclick={nextStep} disabled={!canProceedFromStep2}>
							Next
							<IconArrowRight class="ml-1.5 h-4 w-4" />
						</Button>
					</div>
				</Card.Footer>
			</Card.Root>

		<!-- Step 3: Filters -->
		{:else if currentStep === 3}
			<Card.Root>
				<Card.Header>
					<Card.Title>Filters</Card.Title>
					<Card.Description>Optionally narrow down the data included in your report</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div class="space-y-2">
							<label for="filter-start" class="text-sm font-medium">Start Date</label>
							<Input
								id="filter-start"
								type="date"
								bind:value={filterStartDate}
							/>
						</div>
						<div class="space-y-2">
							<label for="filter-end" class="text-sm font-medium">End Date</label>
							<Input
								id="filter-end"
								type="date"
								bind:value={filterEndDate}
							/>
						</div>
						<div class="space-y-2">
							<label for="filter-category" class="text-sm font-medium">Category</label>
							<Input
								id="filter-category"
								type="text"
								placeholder="e.g. Beverages"
								bind:value={filterCategory}
							/>
						</div>
						<div class="space-y-2">
							<label for="filter-staff" class="text-sm font-medium">Staff ID</label>
							<Input
								id="filter-staff"
								type="text"
								placeholder="Staff member ID"
								bind:value={filterStaffId}
							/>
						</div>
						<div class="space-y-2">
							<label for="filter-payment" class="text-sm font-medium">Payment Method</label>
							<Input
								id="filter-payment"
								type="text"
								placeholder="e.g. cash, card, upi"
								bind:value={filterPaymentMethod}
							/>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline" onclick={prevStep}>
						<IconArrowLeft class="mr-1.5 h-4 w-4" />
						Back
					</Button>
					<Button onclick={nextStep}>
						Run Report
						<IconPlayerPlay class="ml-1.5 h-4 w-4" />
					</Button>
				</Card.Footer>
			</Card.Root>

		<!-- Step 4: Preview / Results -->
		{:else if currentStep === 4}
			<div class="space-y-4">
				<!-- Actions bar -->
				<div class="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" onclick={prevStep}>
						<IconArrowLeft class="mr-1.5 h-4 w-4" />
						Back
					</Button>
					<Button variant="outline" size="sm" onclick={runQuery} disabled={isLoading}>
						{#if isLoading}
							<IconLoader2 class="mr-1.5 h-4 w-4 animate-spin" />
						{:else}
							<IconPlayerPlay class="mr-1.5 h-4 w-4" />
						{/if}
						Re-run
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (showSaveInput = !showSaveInput)}
					>
						<IconDeviceFloppy class="mr-1.5 h-4 w-4" />
						Save Report
					</Button>
					{#if result}
						<Button variant="outline" size="sm" onclick={exportCsv}>
							<IconDownload class="mr-1.5 h-4 w-4" />
							Export CSV
						</Button>
					{/if}
				</div>

				<!-- Save input -->
				{#if showSaveInput}
					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex flex-wrap items-end gap-3">
								<div class="flex-1 space-y-1">
									<label for="report-name" class="text-sm font-medium">Report Name</label>
									<Input
										id="report-name"
										type="text"
										placeholder="My Custom Report"
										bind:value={reportName}
									/>
								</div>
								<label class="flex items-center gap-2 text-sm">
									<Checkbox bind:checked={reportIsShared} />
									Share with team
								</label>
								<Button onclick={handleSaveReport} disabled={isSaving || !reportName.trim()}>
									{#if isSaving}
										<IconLoader2 class="mr-1.5 h-4 w-4 animate-spin" />
									{/if}
									Save
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Loading state -->
				{#if isLoading}
					<Card.Root>
						<Card.Content class="flex items-center justify-center py-16">
							<div class="flex flex-col items-center gap-3">
								<IconLoader2 class="h-8 w-8 animate-spin text-primary" />
								<p class="text-sm text-muted-foreground">Running report query...</p>
							</div>
						</Card.Content>
					</Card.Root>
				{:else if result}
					<!-- Summary -->
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Card.Root>
							<Card.Content class="pt-6">
								<p class="text-sm text-muted-foreground">Rows</p>
								<p class="text-2xl font-bold">{result.meta.rowCount}</p>
							</Card.Content>
						</Card.Root>
						{#each Object.entries(result.totals) as [key, value]}
							{@const metricDef = allMetrics.find((m) => m.key === key)}
							<Card.Root>
								<Card.Content class="pt-6">
									<p class="text-sm text-muted-foreground">{metricDef?.label ?? key}</p>
									<p class="text-2xl font-bold">{formatValue(value, metricDef?.format)}</p>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>

					<!-- Chart -->
					{#if chartData.length > 0 && chartData.length <= 50}
						<BarChart
							data={chartData}
							xKey="label"
							series={chartSeries}
							title="Report Visualization"
							description="Bar chart of report results"
						/>
					{/if}

					<!-- Table -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Results</Card.Title>
							<Card.Description>
								{result.meta.rowCount} row{result.meta.rowCount !== 1 ? 's' : ''} returned
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="max-h-[500px] overflow-auto">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											{#each result.columns as col}
												<Table.Head>{col.label}</Table.Head>
											{/each}
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each result.rows as row}
											<Table.Row>
												{#each result.columns as col}
													<Table.Cell>
														{formatValue(row[col.key], col.format)}
													</Table.Cell>
												{/each}
											</Table.Row>
										{/each}
										<!-- Totals row -->
										<Table.Row class="font-bold bg-muted/50">
											{#each result.columns as col, i}
												<Table.Cell>
													{#if i === 0}
														TOTAL
													{:else if col.key in result.totals}
														{formatValue(result.totals[col.key], col.format)}
													{:else}
														-
													{/if}
												</Table.Cell>
											{/each}
										</Table.Row>
									</Table.Body>
								</Table.Root>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Content class="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<IconReportAnalytics class="mb-3 h-12 w-12" />
							<p class="text-lg font-medium">No results yet</p>
							<p class="text-sm">Click "Re-run" to execute the report query</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		{/if}

		<!-- Saved reports section -->
		{#if savedReports.length > 0 && currentStep < 4}
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title>Saved Reports</Card.Title>
					<Card.Description>Your saved and shared report configurations</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each savedReports as saved}
							<div class="flex items-center justify-between rounded-lg border p-3">
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-sm">{saved.name}</p>
									<p class="text-xs text-muted-foreground">
										{saved.config.metrics.length} metrics, {saved.config.dimensions.length} dimensions
									</p>
									{#if saved.isShared}
										<Badge variant="secondary" class="mt-1 text-xs">Shared</Badge>
									{/if}
								</div>
								<div class="flex items-center gap-1 ml-2">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => handleRunSaved(saved)}
									>
										<IconPlayerPlay class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => handleDeleteSaved(saved.id)}
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
