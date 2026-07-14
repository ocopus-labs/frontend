<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import {
		IconDownload,
		IconReceipt2,
		IconCalendar,
		IconChevronLeft,
		IconChevronRight
	} from '@tabler/icons-svelte';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { downloadCsv } from '$lib/utils/export';
	import type { GstSummary } from '$lib/api';

	let { data }: { data: PageData } = $props();

	let summary = $derived(data.summary as GstSummary | null);
	let startDate = $derived(data.startDate as string);
	let endDate = $derived(data.endDate as string);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 2
		}).format(amount);
	}

	function formatNumber(n: number): string {
		return new Intl.NumberFormat('en-IN').format(n);
	}

	// Navigate to previous/next month
	function navigateMonth(direction: -1 | 1) {
		const start = new Date(startDate);
		const newStart = new Date(start.getFullYear(), start.getMonth() + direction, 1);
		const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
		goto(
			`?startDate=${newStart.toISOString().split('T')[0]}&endDate=${newEnd.toISOString().split('T')[0]}`
		);
	}

	function getMonthLabel(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
	}

	function exportCsv() {
		if (!summary) {
			toast.error('No data to export');
			return;
		}

		const headers = [
			'Tax Rate (%)',
			'Taxable Value',
			'CGST',
			'SGST',
			'IGST',
			'Total Tax',
			'Order Count'
		];
		const rows = summary.rateSummary.map((r) => [
			r.rate,
			r.taxableValue,
			r.cgst,
			r.sgst,
			r.igst,
			r.totalTax,
			r.orderCount
		]);

		const filename = `gst-summary-${startDate}-to-${endDate}.csv`;
		downloadCsv(filename, headers, rows);
		toast.success('GST summary CSV downloaded');
	}

	function exportHsnCsv() {
		if (!summary || summary.hsnSummary.length === 0) {
			toast.info('No HSN data available for this period');
			return;
		}

		const headers = [
			'HSN Code',
			'Description',
			'Quantity',
			'Taxable Value',
			'Rate (%)',
			'CGST',
			'SGST',
			'IGST',
			'Total Tax'
		];
		const rows = summary.hsnSummary.map((h) => [
			h.hsnCode,
			h.description,
			h.quantity,
			h.taxableValue,
			h.rate,
			h.cgst,
			h.sgst,
			h.igst,
			h.totalTax
		]);

		const filename = `hsn-summary-${startDate}-to-${endDate}.csv`;
		downloadCsv(filename, headers, rows);
		toast.success('HSN summary CSV downloaded');
	}
</script>

<PageShell
	title="GST Filing Summary"
	description="GSTR-1 data summary for accountants and tax filing"
>
	{#snippet actions()}
		<!-- Month navigator -->
		<div class="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
			<Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => navigateMonth(-1)}>
				<IconChevronLeft class="h-4 w-4" />
			</Button>
			<span class="flex items-center gap-1.5 text-sm font-medium">
				<IconCalendar class="h-4 w-4 text-muted-foreground" />
				{getMonthLabel(startDate)}
			</span>
			<Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => navigateMonth(1)}>
				<IconChevronRight class="h-4 w-4" />
			</Button>
		</div>
		<Button variant="outline" onclick={exportCsv} disabled={!summary}>
			<IconDownload class="mr-1.5 h-4 w-4" />
			Export Rate CSV
		</Button>
		<Button variant="outline" onclick={exportHsnCsv} disabled={!summary}>
			<IconDownload class="mr-1.5 h-4 w-4" />
			Export HSN CSV
		</Button>
	{/snippet}

	{#if data.error}
		<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
			<p class="text-sm text-destructive">{data.error}</p>
		</div>
	{:else if summary}
		<!-- Summary Cards -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-medium text-muted-foreground">Orders</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{formatNumber(summary.orderCount)}</div>
					<p class="text-xs text-muted-foreground">paid invoices</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-medium text-muted-foreground">Taxable Value</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-xl font-bold">{formatCurrency(summary.totalTaxableValue)}</div>
					<p class="text-xs text-muted-foreground">before tax</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-medium text-muted-foreground">CGST Collected</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-xl font-bold text-chart-3">
						{formatCurrency(summary.cgstCollected)}
					</div>
					<p class="text-xs text-muted-foreground">central GST</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-medium text-muted-foreground">SGST Collected</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-xl font-bold text-chart-4">
						{formatCurrency(summary.sgstCollected)}
					</div>
					<p class="text-xs text-muted-foreground">state GST</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="col-span-2 sm:col-span-1">
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-medium text-muted-foreground">Total Tax</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-xl font-bold text-chart-6">
						{formatCurrency(summary.totalTaxCollected)}
					</div>
					<p class="text-xs text-muted-foreground">
						{#if summary.igstCollected > 0}
							incl. IGST {formatCurrency(summary.igstCollected)}
						{:else}
							CGST + SGST
						{/if}
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Tax Rate Breakdown -->
		<div>
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Breakdown by Tax Rate</Card.Title>
							<Card.Description>
								Tax collected grouped by GST rate slab — {getMonthLabel(startDate)}
							</Card.Description>
						</div>
						<Badge variant="outline" class="flex items-center gap-1">
							<IconReceipt2 class="h-3 w-3" />
							{formatNumber(summary.orderCount)} orders
						</Badge>
					</div>
				</Card.Header>
				<Card.Content>
					{#if summary.rateSummary.length > 0}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Rate</Table.Head>
									<Table.Head class="text-right">Orders</Table.Head>
									<Table.Head class="text-right">Taxable Value</Table.Head>
									<Table.Head class="text-right">CGST</Table.Head>
									<Table.Head class="text-right">SGST</Table.Head>
									{#if summary.igstCollected > 0}
										<Table.Head class="text-right">IGST</Table.Head>
									{/if}
									<Table.Head class="text-right">Total Tax</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each summary.rateSummary as row}
									<Table.Row>
										<Table.Cell class="font-medium">
											<Badge variant="secondary">{row.rate}%</Badge>
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums">
											{formatNumber(row.orderCount)}
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums">
											{formatCurrency(row.taxableValue)}
										</Table.Cell>
										<Table.Cell class="text-right text-chart-3 tabular-nums">
											{formatCurrency(row.cgst)}
										</Table.Cell>
										<Table.Cell class="text-right text-chart-4 tabular-nums">
											{formatCurrency(row.sgst)}
										</Table.Cell>
										{#if summary.igstCollected > 0}
											<Table.Cell class="text-right text-chart-1 tabular-nums">
												{formatCurrency(row.igst)}
											</Table.Cell>
										{/if}
										<Table.Cell class="text-right font-semibold text-chart-6 tabular-nums">
											{formatCurrency(row.totalTax)}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
							<Table.Footer>
								<Table.Row>
									<Table.Cell class="font-semibold">Total</Table.Cell>
									<Table.Cell class="text-right font-semibold tabular-nums">
										{formatNumber(summary.orderCount)}
									</Table.Cell>
									<Table.Cell class="text-right font-semibold tabular-nums">
										{formatCurrency(summary.totalTaxableValue)}
									</Table.Cell>
									<Table.Cell class="text-right font-semibold text-chart-3 tabular-nums">
										{formatCurrency(summary.cgstCollected)}
									</Table.Cell>
									<Table.Cell class="text-right font-semibold text-chart-4 tabular-nums">
										{formatCurrency(summary.sgstCollected)}
									</Table.Cell>
									{#if summary.igstCollected > 0}
										<Table.Cell class="text-right font-semibold text-chart-1 tabular-nums">
											{formatCurrency(summary.igstCollected)}
										</Table.Cell>
									{/if}
									<Table.Cell class="text-right font-semibold text-chart-6 tabular-nums">
										{formatCurrency(summary.totalTaxCollected)}
									</Table.Cell>
								</Table.Row>
							</Table.Footer>
						</Table.Root>
					{:else}
						<p class="py-8 text-center text-sm text-muted-foreground">
							No paid orders with tax in this period
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- HSN Summary -->
		{#if summary.hsnSummary.length > 0}
			<div>
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>HSN-wise Summary</Card.Title>
								<Card.Description>Item-level HSN code breakdown for GSTR-1 filing</Card.Description>
							</div>
							<Button variant="outline" size="sm" onclick={exportHsnCsv}>
								<IconDownload class="mr-1.5 h-3.5 w-3.5" />
								Export HSN
							</Button>
						</div>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>HSN Code</Table.Head>
									<Table.Head>Description</Table.Head>
									<Table.Head class="text-right">Qty</Table.Head>
									<Table.Head class="text-right">Rate</Table.Head>
									<Table.Head class="text-right">Taxable Value</Table.Head>
									<Table.Head class="text-right">CGST</Table.Head>
									<Table.Head class="text-right">SGST</Table.Head>
									{#if summary.igstCollected > 0}
										<Table.Head class="text-right">IGST</Table.Head>
									{/if}
									<Table.Head class="text-right">Total Tax</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each summary.hsnSummary as hsn}
									<Table.Row>
										<Table.Cell class="font-mono font-medium">{hsn.hsnCode}</Table.Cell>
										<Table.Cell class="max-w-[180px] truncate">{hsn.description}</Table.Cell>
										<Table.Cell class="text-right tabular-nums"
											>{formatNumber(hsn.quantity)}</Table.Cell
										>
										<Table.Cell class="text-right">
											<Badge variant="outline" class="text-xs">{hsn.rate}%</Badge>
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums"
											>{formatCurrency(hsn.taxableValue)}</Table.Cell
										>
										<Table.Cell class="text-right text-chart-3 tabular-nums"
											>{formatCurrency(hsn.cgst)}</Table.Cell
										>
										<Table.Cell class="text-right text-chart-4 tabular-nums"
											>{formatCurrency(hsn.sgst)}</Table.Cell
										>
										{#if summary.igstCollected > 0}
											<Table.Cell class="text-right text-chart-1 tabular-nums"
												>{formatCurrency(hsn.igst)}</Table.Cell
											>
										{/if}
										<Table.Cell class="text-right font-semibold text-chart-6 tabular-nums"
											>{formatCurrency(hsn.totalTax)}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		<!-- Filing period note -->
		<div>
			<p class="text-xs text-muted-foreground">
				Period: {startDate} to {endDate} &middot; Only paid orders are included &middot; Amounts in INR
			</p>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center py-16">
			<p class="text-sm text-muted-foreground">Loading GST summary...</p>
		</div>
	{/if}
</PageShell>
