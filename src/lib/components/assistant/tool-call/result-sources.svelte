<script lang="ts" module>
	import type { ToolPart } from '$lib/api/agent';

	export interface ResultSourcesProps {
		/** Tool calls in this message that actually returned something. */
		calls: ToolPart[];
	}
</script>

<script lang="ts">
	/**
	 * Where the numbers in an answer came from.
	 *
	 * "Your peak was the 8–9pm hour at ₹88,700" is a claim about money, and the
	 * operator's next question is always the same one: says who? This lists the
	 * tool calls behind the turn and jumps to the one you pick, which is
	 * already rendered above with its full result.
	 *
	 * **Not** inline per-figure citations, despite what FE-3.7 sketched. Those
	 * need the model to emit citation markers, and it does not; the alternative
	 * — matching numbers in the prose against numbers in the tool output — would
	 * attach a source to a figure it cannot actually prove produced it. On a
	 * surface where the figures are money, a citation that is right most of the
	 * time is worse than no citation, because it converts "check this" into
	 * "this was checked". The message-level strip claims exactly what it knows.
	 */
	import * as Sources from '$lib/components/ai-elements/sources/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import { humanizeToolName } from './tool-call.svelte';

	let { calls }: ResultSourcesProps = $props();

	function focusCall(toolCallId: string) {
		const target = document.getElementById(`tool-call-${toolCallId}`);
		if (!target) return;
		target.scrollIntoView({ behavior: 'smooth', block: 'center' });
		// Moves focus as well as the viewport: a scroll alone leaves a keyboard
		// user's focus where it was, so the control they just activated has
		// visibly done nothing for them.
		target.focus();
	}
</script>

{#if calls.length > 0}
	<!--
		Muted, not the brand colour the primitive ships with. A line rendered in
		`primary` under every answer reads as a call to action — on an orange
		theme it looked like a warning attached to the figures above it, which is
		the opposite of what "here is where this came from" should convey.
	-->
	<Sources.Root class="mt-3 mb-0 text-muted-foreground">
		<Sources.Trigger count={calls.length}>
			<p class="font-medium">
				Based on {calls.length}
				{calls.length === 1 ? 'lookup' : 'lookups'}
			</p>
		</Sources.Trigger>
		<Sources.Content>
			{#each calls as call (call.toolCallId)}
				<Button
					variant="ghost"
					size="sm"
					class="h-auto justify-start px-2 py-1 font-normal"
					onclick={() => focusCall(call.toolCallId)}
				>
					<WrenchIcon class="size-3.5 shrink-0" aria-hidden="true" />
					{humanizeToolName(call.toolName ?? call.type.replace(/^tool-/, ''))}
				</Button>
			{/each}
		</Sources.Content>
	</Sources.Root>
{/if}
