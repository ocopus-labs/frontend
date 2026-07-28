<script lang="ts">
	import { cn } from "$lib/utils";
	import { CollapsibleTrigger } from "$lib/components/ui/collapsible/index.js";
	import { getReasoningContext } from "./reasoning-context.svelte.js";
	import BrainIcon from "@lucide/svelte/icons/brain";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

	interface Props {
		class?: string;
		children?: import("svelte").Snippet;
	}

	let { class: className = "", children, ...props }: Props = $props();

	let reasoningContext = getReasoningContext();

	let getThinkingMessage = $derived.by(() => {
		let { isStreaming, duration } = reasoningContext;

		if (isStreaming) {
			return "Thinking...";
		}
		// A duration is only ever measured for a turn this tab watched arrive.
		// A thread loaded from the server has none, and `duration === 0` used to
		// mean "Thinking..." — so every reasoning block in a reopened
		// conversation claimed to still be thinking, days after it finished.
		if (!duration) {
			return "Thought process";
		}
		return `Thought for ${duration} seconds`;
	});
</script>

<CollapsibleTrigger
	class={cn(
		"text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-sm transition-colors",
		className
	)}
	{...props}
>
	{#if children}
		{@render children()}
	{:else}
		<BrainIcon class="size-4" />
		<p>{getThinkingMessage}</p>
		<ChevronDownIcon
			class={cn(
				"size-4 transition-transform",
				reasoningContext.isOpen ? "rotate-180" : "rotate-0"
			)}
		/>
	{/if}
</CollapsibleTrigger>
