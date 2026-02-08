<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { IconDownload, IconFileSpreadsheet, IconLoader2 } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';

	let {
		onExportCsv,
		onExportPdf,
		disabled = false,
		label = 'Export'
	}: {
		onExportCsv?: () => Promise<void>;
		onExportPdf?: () => Promise<void>;
		disabled?: boolean;
		label?: string;
	} = $props();

	let isExporting = $state(false);

	async function handleExport(fn?: () => Promise<void>) {
		if (!fn || isExporting) return;
		isExporting = true;
		try {
			await fn();
			toast.success('Export completed');
		} catch (err) {
			toast.error('Export failed');
		} finally {
			isExporting = false;
		}
	}
</script>

{#if onExportCsv && onExportPdf}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button variant="outline" size="sm" disabled={disabled || isExporting} {...props}>
					{#if isExporting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<IconDownload class="mr-2 h-4 w-4" />
					{/if}
					{label}
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onclick={() => handleExport(onExportCsv)}>
				<IconFileSpreadsheet class="mr-2 h-4 w-4" />
				Export as CSV
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => handleExport(onExportPdf)}>
				<IconDownload class="mr-2 h-4 w-4" />
				Export as PDF
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{:else if onExportCsv}
	<Button variant="outline" size="sm" disabled={disabled || isExporting} onclick={() => handleExport(onExportCsv)}>
		{#if isExporting}
			<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<IconDownload class="mr-2 h-4 w-4" />
		{/if}
		{label}
	</Button>
{/if}
