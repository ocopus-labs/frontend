import type { Component } from 'svelte';
import type { ToolResultEnvelope } from '$lib/api/agent';
import type { FormatContext } from '../envelope';
import TableResult from './table-result.svelte';
import RecordResult from './record-result.svelte';
import SeriesResult from './series-result.svelte';
import RawResult from './raw-result.svelte';

/**
 * Which component renders which result.
 *
 * Keyed by envelope `kind` first, then by tool name for specialisations. That
 * order is deliberate: the backend already says what a payload *is*, so a
 * kind-keyed lookup covers every tool including the ones added tomorrow, and a
 * name-keyed override is only needed where a specific tool genuinely reads
 * better a different way.
 *
 * There are no overrides yet, and that is the honest state of it — orders,
 * stock and payments differ only in the columns the backend chose, so a
 * per-domain component would be three copies of the same table waiting to
 * drift apart. The hook exists because the first real specialisation (a floor
 * plan for `list-tables`, say) should not require rewiring the dispatcher.
 */

/**
 * Every renderer takes the same three props, which is what makes a registry
 * possible at all: `{ envelope, ctx, labelledBy }`. Each narrows the envelope
 * to the variant it handles, so the union here is deliberately loose — the
 * lookup is what guarantees the pairing, and a mapped type per kind would add
 * ceremony without adding safety.
 */
export interface RendererProps {
	envelope: ToolResultEnvelope;
	ctx: FormatContext;
	labelledBy: string;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above. */
type Renderer = Component<any>;

const BY_KIND: Record<ToolResultEnvelope['kind'], Renderer> = {
	table: TableResult,
	record: RecordResult,
	series: SeriesResult,
	// Both fall through to the raw region, which is what they are: a string or
	// an unshaped payload, rendered as itself rather than dressed up.
	text: RawResult,
	raw: RawResult
};

/** Tool-name specialisations, checked before `BY_KIND`. */
const BY_TOOL: Record<string, Renderer> = {};

export function rendererFor(envelope: ToolResultEnvelope, toolName: string | undefined): Renderer {
	if (toolName && BY_TOOL[toolName]) return BY_TOOL[toolName];
	return BY_KIND[envelope.kind] ?? RawResult;
}

export { TableResult, RecordResult, SeriesResult, RawResult };
