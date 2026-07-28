<script lang="ts" module>
	import type { TableColumn, ToolResultEnvelope } from '$lib/api/agent';
	import type { FormatContext } from '../envelope';

	export interface TableResultProps {
		envelope: Extract<ToolResultEnvelope, { kind: 'table' }>;
		ctx: FormatContext;
		/** Rows shown before the "show all" control appears. */
		limit?: number;
	}
</script>

<script lang="ts">
	/**
	 * A list of records.
	 *
	 * Covers orders, payments, stock, menu items and the generic array-of-objects
	 * fallback — one renderer rather than six, because the difference between
	 * them is entirely in the columns the backend chose, and a per-domain
	 * component would be five copies of the same table waiting to drift apart.
	 * Specialisation happens in the cell: a `status` column gets a badge, a
	 * stock row below its minimum gets a marker.
	 */
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { formatValue, isNumericColumn, readPath, statusTone } from '../envelope';

	let { envelope, ctx, limit = 25 }: TableResultProps = $props();

	let expanded = $state(false);

	// A tool can return thousands of rows — `list-orders` caps at 100, but the
	// router can reach tools that do not. Rendering them all would put tens of
	// thousands of DOM nodes inside a scrolling thread while a stream is still
	// writing to it.
	const visible = $derived(expanded ? envelope.rows : envelope.rows.slice(0, limit));
	const hidden = $derived(envelope.rows.length - visible.length);

	const columns = $derived(envelope.columns.length ? envelope.columns : inferred());

	/**
	 * Columns for a table that arrived without any.
	 *
	 * Only happens for a payload the backend did not shape — a routed call into
	 * a tool family that has not been migrated. Better a plain table of the
	 * first few keys than a `<pre>`.
	 */
	function inferred(): TableColumn[] {
		const first = envelope.rows[0];
		if (!first) return [];
		return Object.keys(first)
			.filter((key) => key !== 'id' && !key.endsWith('Id'))
			.slice(0, 6)
			.map((key) => ({ key, label: key }));
	}

	const toneClass: Record<string, string> = {
		positive: 'bg-success/10 text-success-text border-success/20',
		negative: 'bg-destructive/10 text-destructive border-destructive/20',
		caution: 'bg-warning/10 text-warning-text border-warning/20',
		neutral: 'bg-muted text-muted-foreground border-border'
	};
</script>

{#if envelope.rows.length === 0}
	<p class="px-1 py-3 text-sm text-muted-foreground">Nothing matched.</p>
{:else}
	<!--
		The table scrolls sideways inside its own container. Without this a
		seven-column result widens the whole thread on a phone, and the composer
		goes with it.
	-->
	<div class="overflow-x-auto rounded-md border border-border">
		<Table.Root>
			{#if envelope.title}
				<Table.Caption class="mt-0 mb-2 px-3 pt-2 text-left">{envelope.title}</Table.Caption>
			{/if}
			<Table.Header>
				<Table.Row>
					{#each columns as column (column.key)}
						<Table.Head class={isNumericColumn(column) ? 'text-right' : ''}>
							{column.label}
						</Table.Head>
					{/each}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each visible as row, index (index)}
					<Table.Row>
						{#each columns as column (column.key)}
							{@const value = readPath(row, column.key)}
							<Table.Cell class={isNumericColumn(column) ? 'text-right tabular-nums' : ''}>
								{#if column.format === 'status'}
									<Badge variant="outline" class={toneClass[statusTone(value)]}>
										{formatValue(value, 'status', ctx)}
									</Badge>
								{:else}
									{formatValue(value, column.format, ctx)}
								{/if}
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	{#if hidden > 0}
		<div class="mt-2 flex justify-center">
			<Button variant="ghost" size="sm" onclick={() => (expanded = true)}>
				Show {hidden} more
			</Button>
		</div>
	{/if}
{/if}
