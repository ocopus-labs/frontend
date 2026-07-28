<script lang="ts" module>
	import type { ToolResultEnvelope } from '$lib/api/agent';
	import type { FormatContext } from '../envelope';

	export interface RecordResultProps {
		envelope: Extract<ToolResultEnvelope, { kind: 'record' }>;
		ctx: FormatContext;
	}
</script>

<script lang="ts">
	/**
	 * A single entity, or a set of headline figures.
	 *
	 * Covers both the customer card and the sales summary: the difference is
	 * only how many fields the backend put in, and a description list reads
	 * correctly either way. Money fields are given room to be read at a glance,
	 * because on a summary they *are* the answer.
	 */
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatValue, statusTone } from '../envelope';

	let { envelope, ctx }: RecordResultProps = $props();

	const toneClass: Record<string, string> = {
		positive: 'bg-success/10 text-success-text border-success/20',
		negative: 'bg-destructive/10 text-destructive border-destructive/20',
		caution: 'bg-warning/10 text-warning-text border-warning/20',
		neutral: 'bg-muted text-muted-foreground border-border'
	};

	/**
	 * A figures-only result reads as a row of stats; a mixed one reads as a
	 * list. Deciding from the data rather than the tool name means a new
	 * summary tool gets the right shape without being registered anywhere.
	 */
	const isSummary = $derived(
		envelope.fields.length > 0 &&
			envelope.fields.length <= 6 &&
			envelope.fields.every((f) => f.format === 'money' || f.format === 'number')
	);
</script>

{#if envelope.fields.length === 0}
	<p class="px-1 py-3 text-sm text-muted-foreground">Nothing to show.</p>
{:else}
	<div class="rounded-md border border-border p-3">
		{#if envelope.title}
			<p class="mb-2 text-xs font-medium text-muted-foreground">{envelope.title}</p>
		{/if}

		{#if isSummary}
			<dl class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each envelope.fields as field (field.label)}
					<div>
						<dt class="text-xs text-muted-foreground">{field.label}</dt>
						<dd class="text-lg font-semibold tabular-nums">
							{formatValue(field.value, field.format, ctx)}
						</dd>
					</div>
				{/each}
			</dl>
		{:else}
			<dl class="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,10rem)_1fr]">
				{#each envelope.fields as field (field.label)}
					<dt class="text-sm text-muted-foreground">{field.label}</dt>
					<dd class="text-sm">
						{#if field.format === 'status'}
							<Badge variant="outline" class={toneClass[statusTone(field.value)]}>
								{formatValue(field.value, 'status', ctx)}
							</Badge>
						{:else}
							{formatValue(field.value, field.format, ctx)}
						{/if}
					</dd>
				{/each}
			</dl>
		{/if}
	</div>
{/if}
