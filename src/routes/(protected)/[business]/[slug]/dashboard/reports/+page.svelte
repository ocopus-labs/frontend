<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconDownload,
		IconFileSpreadsheet,
		IconFileTypePdf,
		IconCalendar,
		IconRefresh
	} from '@tabler/icons-svelte';

	// Dummy reports data
	const availableReports = [
		{
			id: 1,
			name: 'Daily Sales Report',
			description: 'Comprehensive breakdown of daily sales, including itemized transactions',
			lastGenerated: '2024-11-06 09:00 AM',
			frequency: 'Daily',
			type: 'sales'
		},
		{
			id: 2,
			name: 'Weekly Revenue Summary',
			description: 'Week-over-week revenue comparison with trend analysis',
			lastGenerated: '2024-11-04 12:00 PM',
			frequency: 'Weekly',
			type: 'revenue'
		},
		{
			id: 3,
			name: 'Inventory Status Report',
			description: 'Current stock levels, low stock alerts, and reorder suggestions',
			lastGenerated: '2024-11-06 06:00 AM',
			frequency: 'Daily',
			type: 'inventory'
		},
		{
			id: 4,
			name: 'Employee Performance',
			description: 'Staff productivity metrics, orders processed, and tips earned',
			lastGenerated: '2024-11-01 08:00 AM',
			frequency: 'Monthly',
			type: 'staff'
		},
		{
			id: 5,
			name: 'Customer Insights',
			description: 'Customer demographics, repeat visit rates, and preferences',
			lastGenerated: '2024-11-01 08:00 AM',
			frequency: 'Monthly',
			type: 'customers'
		},
		{
			id: 6,
			name: 'Tax Summary Report',
			description: 'Tax collected breakdown for accounting and filing',
			lastGenerated: '2024-11-01 08:00 AM',
			frequency: 'Monthly',
			type: 'tax'
		}
	];

	const recentReports = [
		{
			name: 'Daily Sales Report - Nov 6',
			generatedAt: '2024-11-06 09:00 AM',
			size: '245 KB',
			format: 'PDF'
		},
		{
			name: 'Daily Sales Report - Nov 5',
			generatedAt: '2024-11-05 09:00 AM',
			size: '238 KB',
			format: 'PDF'
		},
		{
			name: 'Weekly Revenue Summary - Week 44',
			generatedAt: '2024-11-04 12:00 PM',
			size: '512 KB',
			format: 'Excel'
		},
		{
			name: 'Inventory Status Report - Nov 6',
			generatedAt: '2024-11-06 06:00 AM',
			size: '189 KB',
			format: 'PDF'
		}
	];

	function generateReport(reportId: number) {
		console.log('Generating report:', reportId);
	}

	function downloadReport(reportName: string) {
		console.log('Downloading report:', reportName);
	}

	function getReportTypeBadge(type: string): 'default' | 'secondary' | 'outline' | 'destructive' {
		const types: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
			sales: 'default',
			revenue: 'secondary',
			inventory: 'outline',
			staff: 'default',
			customers: 'secondary',
			tax: 'outline'
		};
		return types[type] || 'outline';
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Reports</h1>
					<p class="text-muted-foreground">Generate and download business reports</p>
				</div>
				<div class="flex gap-2">
					<Button variant="outline">
						<IconCalendar class="mr-2 h-4 w-4" />
						Schedule Report
					</Button>
					<Button>
						<IconFileSpreadsheet class="mr-2 h-4 w-4" />
						Custom Report
					</Button>
				</div>
			</div>

			<!-- Available Reports -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Available Reports</Card.Title>
						<Card.Description>Select a report to generate or schedule</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{#each availableReports as report}
								<Card.Root class="flex flex-col">
									<Card.Header class="pb-2">
										<div class="flex items-start justify-between">
											<Card.Title class="text-base">{report.name}</Card.Title>
											<Badge variant={getReportTypeBadge(report.type)}>{report.frequency}</Badge>
										</div>
									</Card.Header>
									<Card.Content class="flex-1">
										<p class="text-sm text-muted-foreground">{report.description}</p>
										<p class="mt-2 text-xs text-muted-foreground">
											Last generated: {report.lastGenerated}
										</p>
									</Card.Content>
									<Card.Footer class="pt-0">
										<Button
											variant="outline"
											class="w-full"
											onclick={() => generateReport(report.id)}
										>
											<IconRefresh class="mr-2 h-4 w-4" />
											Generate Now
										</Button>
									</Card.Footer>
								</Card.Root>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Recent Reports -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Reports</Card.Title>
						<Card.Description>Previously generated reports available for download</Card.Description>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Report Name</Table.Head>
									<Table.Head>Generated At</Table.Head>
									<Table.Head>Format</Table.Head>
									<Table.Head>Size</Table.Head>
									<Table.Head class="text-right">Action</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each recentReports as report}
									<Table.Row>
										<Table.Cell class="font-medium">{report.name}</Table.Cell>
										<Table.Cell>{report.generatedAt}</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-1">
												{#if report.format === 'PDF'}
													<IconFileTypePdf class="h-4 w-4 text-red-500" />
												{:else}
													<IconFileSpreadsheet class="h-4 w-4 text-green-500" />
												{/if}
												{report.format}
											</div>
										</Table.Cell>
										<Table.Cell>{report.size}</Table.Cell>
										<Table.Cell class="text-right">
											<Button
												variant="ghost"
												size="sm"
												onclick={() => downloadReport(report.name)}
											>
												<IconDownload class="h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>
