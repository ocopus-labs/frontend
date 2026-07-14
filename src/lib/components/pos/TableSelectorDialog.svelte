<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { IconUsers, IconAlertCircle } from '@tabler/icons-svelte';
	import type { Table } from '$lib/api/table';

	interface Props {
		open: boolean;
		tables: Table[];
		selectedTableId: string | null;
		onSelect: (table: Table) => void;
		onCancel: () => void;
	}

	let { open, tables, selectedTableId, onSelect, onCancel }: Props = $props();

	// Group tables by section
	const tablesBySection = $derived(() => {
		const sections: Record<string, Table[]> = {};
		for (const table of tables) {
			const section = table.position?.section || 'Main';
			if (!sections[section]) {
				sections[section] = [];
			}
			sections[section].push(table);
		}
		return sections;
	});

	const availableTables = $derived(tables.filter((t) => t.status === 'available'));

	function getStatusColor(status: Table['status']) {
		switch (status) {
			case 'available':
				return 'bg-success/15 border-success text-foreground hover:bg-success/25';
			case 'occupied':
				return 'bg-destructive/10 border-destructive/40 text-destructive opacity-60 cursor-not-allowed';
			case 'reserved':
				return 'bg-warning/10 border-warning/40 text-warning opacity-60 cursor-not-allowed';
			case 'maintenance':
				return 'bg-muted border-muted-foreground/40 text-muted-foreground opacity-60 cursor-not-allowed';
			default:
				return 'bg-muted border-border text-muted-foreground opacity-60 cursor-not-allowed';
		}
	}

	function handleTableClick(table: Table) {
		if (table.status === 'available') {
			onSelect(table);
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Select Table</Dialog.Title>
			<Dialog.Description>
				{#if availableTables.length > 0}
					{availableTables.length} table{availableTables.length !== 1 ? 's' : ''} available
				{:else}
					No tables available
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[60vh] overflow-y-auto py-4">
			{#if tables.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconAlertCircle class="mb-4 h-12 w-12 text-muted-foreground" />
					<p class="mb-2 text-lg font-medium">No tables configured</p>
					<p class="text-sm text-muted-foreground">
						Set up tables in the Tables section to enable table selection.
					</p>
				</div>
			{:else}
				{#each Object.entries(tablesBySection()) as [section, sectionTables]}
					<div class="mb-6">
						<h3 class="mb-3 text-sm font-semibold text-muted-foreground">{section}</h3>
						<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
							{#each sectionTables as table}
								<button
									type="button"
									onclick={() => handleTableClick(table)}
									disabled={table.status !== 'available'}
									class="flex flex-col items-center justify-center rounded-md border-2 p-3 transition-all {getStatusColor(
										table.status
									)} {selectedTableId === table.id ? 'ring-2 ring-primary ring-offset-2' : ''}"
								>
									<span class="text-lg font-bold">{table.displayName}</span>
									<div class="mt-1 flex items-center gap-1 text-xs">
										<IconUsers class="h-3 w-3" />
										<span>{table.capacity}</span>
									</div>
									{#if table.status !== 'available'}
										<span class="mt-1 text-[10px] capitalize">{table.status}</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
