<script lang="ts" module>
	import type { ConsequenceData, ToolPart } from '$lib/api/agent';

	export interface ToolCallProps {
		part: ToolPart;
		/** Consequence written alongside this call's approval request, if any. */
		consequence?: ConsequenceData;
		/** Measured client-side; the server's own timing lands in B4's usage. */
		durationMs?: number;
		/** Called when the operator answers a gated call. */
		onApprove: (id: string, approved: boolean) => void;
		/** Disable the approve/reject buttons while a response is in flight. */
		busy?: boolean;
	}

	/**
	 * `list-orders` → "Reading orders"; `create-payment` → "Recording a payment".
	 *
	 * Derived from the verb prefix rather than a lookup table, for the same
	 * reason the status line is: a table over 204 tools is stale within a
	 * release, and a wrong label is worse than a generic one.
	 */
	const VERB_LABELS: Record<string, string> = {
		list: 'Reading',
		get: 'Reading',
		search: 'Searching',
		find: 'Searching',
		global: 'Searching',
		create: 'Creating',
		add: 'Adding',
		update: 'Updating',
		set: 'Setting',
		adjust: 'Adjusting',
		delete: 'Deleting',
		remove: 'Removing',
		cancel: 'Cancelling',
		close: 'Closing',
		send: 'Sending',
		mark: 'Updating',
		approve: 'Approving',
		redeem: 'Redeeming',
		process: 'Processing',
		record: 'Recording',
		generate: 'Generating',
		toggle: 'Switching',
		refresh: 'Refreshing',
		seat: 'Seating',
		confirm: 'Confirming',
		complete: 'Completing',
		preview: 'Previewing',
		export: 'Exporting',
		invoke: 'Running',
		calculate: 'Calculating',
		estimate: 'Estimating',
		check: 'Checking',
		validate: 'Checking',
		detect: 'Checking'
	};

	export function humanizeToolName(name: string): string {
		const tokens = name.toLowerCase().split(/[-_]+/).filter(Boolean);
		if (!tokens.length) return 'Working';
		const verb = VERB_LABELS[tokens[0]];
		const subject = (verb ? tokens.slice(1) : tokens).join(' ');
		return verb ? `${verb} ${subject}`.trim() : `Running ${tokens.join(' ')}`;
	}
</script>

<script lang="ts">
	/**
	 * One tool call in an assistant turn.
	 *
	 * Before B3 this rendered `JSON.stringify(output, null, 2)` in a `<pre>` and
	 * called that the result. An operator who asked "how many orders are open?"
	 * got a forty-key object per order. The shell is now a header they can scan
	 * and a rendered result they can read; the JSON is still there, one click
	 * away, because when something looks wrong that is exactly what you want.
	 */
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ChevronIcon from '@lucide/svelte/icons/chevron-right';
	import { agent } from '$lib/stores/agent.svelte';
	import { isEnvelope, summarize, type FormatContext } from './envelope';
	import { rendererFor } from './renderers/index.js';
	import ApprovalCard from './approval-card.svelte';
	import JsonBlock from './json-block.svelte';

	let { part, consequence, durationMs, onApprove, busy = false }: ToolCallProps = $props();

	// Tool parts arrive as `tool-<name>` for statically-typed tools and as
	// `dynamic-tool` (with toolName) for those discovered at runtime.
	const name = $derived(part.toolName ?? part.type.replace(/^tool-/, ''));
	const label = $derived(humanizeToolName(name));
	const domId = $derived(part.toolCallId ?? part.type);

	const ctx = $derived<FormatContext>({
		currency: agent.currency,
		timezone: agent.timezone
	});

	// $derived, so a 5,000-row result is inspected once rather than on every
	// token of the answer still streaming below it (UI audit §3.1).
	const envelope = $derived(isEnvelope(part.output) ? part.output : null);
	const summary = $derived(envelope ? summarize(envelope) : null);
	const Renderer = $derived(envelope ? rendererFor(envelope, name) : null);

	const pendingApproval = $derived(
		part.approval && !part.approval.isAutomatic && part.approval.approved === undefined
	);
	const answeredApproval = $derived(
		part.approval && !part.approval.isAutomatic && part.approval.approved !== undefined
	);

	const statusLabel = $derived.by(() => {
		switch (part.state) {
			case 'input-streaming':
				return 'Preparing';
			case 'input-available':
				return 'Running';
			case 'approval-requested':
				return 'Needs approval';
			case 'approval-responded':
				return 'Approved';
			case 'output-available':
				return summary ?? 'Done';
			case 'output-denied':
				return 'Rejected';
			case 'output-error':
				return 'Failed';
		}
	});

	// Label text uses the `-text` ramps, not the fill tokens. `--success` and
	// `--warning` are tuned as fills and read at roughly 3.0:1 and 1.9:1 against
	// their own /10 tints — under the 4.5:1 minimum, on the two states an
	// operator most needs to read at a glance.
	const statusClass = $derived.by(() => {
		switch (part.state) {
			case 'output-available':
				return 'bg-success/10 text-success-text border-success/20';
			case 'output-error':
				return 'bg-destructive/10 text-destructive border-destructive/20';
			case 'approval-requested':
				return 'bg-warning/10 text-warning-text border-warning/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	});

	const durationLabel = $derived(
		durationMs === undefined
			? null
			: durationMs < 1000
				? `${Math.round(durationMs)} ms`
				: `${(durationMs / 1000).toFixed(1)} s`
	);

	// Skipped entirely while the input is still streaming: it is a fragment of
	// JSON that changes on every chunk, and serialising a moving target is the
	// one case where the memoisation above cannot help.
	const showDetails = $derived(part.state !== 'input-streaming');
</script>

<!--
	`tabindex="-1"` makes this a focus target without putting it in the tab
	order: the sources strip below the answer moves focus here, and a scroll
	that leaves focus behind is a jump that never happened for a keyboard user.
-->
<div
	id={`tool-call-${part.toolCallId}`}
	tabindex="-1"
	class="my-2 rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
>
	<div class="flex items-center gap-2 px-3 py-2 text-sm">
		<span class="flex-1 truncate font-medium">{label}</span>
		{#if durationLabel}
			<span class="shrink-0 text-xs text-muted-foreground tabular-nums">{durationLabel}</span>
		{/if}
		<Badge variant="outline" class={statusClass}>{statusLabel}</Badge>
	</div>

	{#if part.state === 'output-error' && part.errorText}
		<div class="border-t border-border px-3 py-3">
			<p id={`${domId}-error`} class="mb-1 text-xs font-medium text-destructive">
				This didn't work
			</p>
			<p class="text-sm" aria-labelledby={`${domId}-error`}>{part.errorText}</p>
		</div>
	{:else if envelope && Renderer}
		<div class="border-t border-border px-3 py-3">
			<Renderer {envelope} {ctx} labelledBy={`${domId}-output`} />
		</div>
	{:else if part.output !== undefined}
		<!--
			A tool outside the six migrated families, or an older transcript.
			Rendered as JSON, but labelled and reachable rather than dumped.
		-->
		<div class="border-t border-border px-3 py-3">
			<p id={`${domId}-output`} class="mb-1 text-xs font-medium text-muted-foreground">Result</p>
			<JsonBlock value={part.output} labelledBy={`${domId}-output`} />
		</div>
	{/if}

	{#if part.approval && (pendingApproval || answeredApproval)}
		<div class="border-t border-border p-3">
			<ApprovalCard
				approval={part.approval}
				{consequence}
				toolLabel={label.toLowerCase()}
				answered={answeredApproval}
				{busy}
				onAnswer={onApprove}
			/>
		</div>
	{/if}

	{#if showDetails && part.input !== undefined}
		<Collapsible.Root>
			<Collapsible.Trigger
				class="flex w-full items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
			>
				<ChevronIcon class="size-3.5 shrink-0 transition-transform data-[state=open]:rotate-90" />
				Details
			</Collapsible.Trigger>
			<Collapsible.Content class="space-y-2 px-3 pt-1 pb-3">
				<p id={`${domId}-input`} class="text-xs font-medium text-muted-foreground">
					What was asked for
				</p>
				<JsonBlock value={part.input} labelledBy={`${domId}-input`} />
			</Collapsible.Content>
		</Collapsible.Root>
	{/if}
</div>
