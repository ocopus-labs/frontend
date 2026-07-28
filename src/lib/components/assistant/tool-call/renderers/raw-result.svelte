<script lang="ts" module>
	import type { ToolResultEnvelope } from '$lib/api/agent';

	/**
	 * Renderers are looked up by envelope kind and all receive
	 * `{ envelope, ctx, labelledBy }`. Each declares only the ones it reads —
	 * Svelte 5 simply does not destructure the rest — so an unused prop is not
	 * carried around as documentation of something that never happens.
	 */
	export interface RawResultProps {
		envelope: Extract<ToolResultEnvelope, { kind: 'raw' | 'text' }>;
		/** Id of the heading above, so the JSON region is labelled. */
		labelledBy: string;
	}
</script>

<script lang="ts">
	/**
	 * The fallback, and the deliberate home for prose.
	 *
	 * `text` is a sentence the tool wrote and is rendered as one. `raw` is a
	 * payload with no better shape — reached by tools outside the six migrated
	 * families, and by results that genuinely are nested configuration.
	 */
	import JsonBlock from '../json-block.svelte';

	let { envelope, labelledBy }: RawResultProps = $props();
</script>

{#if envelope.title}
	<p class="mb-1 text-xs font-medium text-muted-foreground">{envelope.title}</p>
{/if}

{#if envelope.kind === 'text'}
	<p class="text-sm whitespace-pre-wrap">{envelope.text}</p>
{:else}
	<JsonBlock value={envelope.data} {labelledBy} />
{/if}
