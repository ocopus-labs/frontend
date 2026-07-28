<script lang="ts" module>
	export interface JsonBlockProps {
		/** Any payload — an envelope's `data`, a tool input, a legacy result. */
		value: unknown;
		/** Id of the heading above, so the region is actually labelled. */
		labelledBy: string;
	}

	/** Beyond this, the browser is doing more work than the operator can read. */
	export const MAX_JSON_CHARS = 10_000;
</script>

<script lang="ts">
	/**
	 * JSON, honestly presented.
	 *
	 * Two things it does that the old bare `<pre>` did not: it truncates, and it
	 * memoises. Serialising on every render meant a 10 KB tool result was
	 * re-stringified on every token of the answer still streaming below it.
	 */
	let { value, labelledBy }: JsonBlockProps = $props();

	const serialized = $derived.by(() => {
		if (value === undefined || value === null) return '';
		if (typeof value === 'string') return value;
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			// A cyclic payload should cost the pretty-printing, not the region.
			return String(value);
		}
	});

	const truncated = $derived(serialized.length > MAX_JSON_CHARS);
	const shown = $derived(truncated ? serialized.slice(0, MAX_JSON_CHARS) : serialized);
</script>

{#if serialized}
	<!--
		`tabindex` is required, not optional: this region scrolls, and a
		scrollable region no keyboard user can reach is a WCAG 2.1.1 failure.
		Svelte's rule checks the role, not whether the element actually scrolls,
		so it flags every correct instance of this.
	-->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<pre
		class="max-h-64 overflow-auto rounded-md bg-muted p-2 font-mono text-xs"
		tabindex="0"
		aria-labelledby={labelledBy}>{shown}</pre>
	{#if truncated}
		<p class="mt-1 text-xs text-muted-foreground">
			Truncated — showing the first {MAX_JSON_CHARS.toLocaleString()} of {serialized.length.toLocaleString()}
			characters.
		</p>
	{/if}
{/if}
