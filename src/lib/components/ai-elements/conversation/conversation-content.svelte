<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	export interface ConversationContentProps extends WithElementRef<
		HTMLAttributes<HTMLDivElement>
	> {
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { getStickToBottomContext } from "./stick-to-bottom-context.svelte.js";
	import { watch } from "runed";

	let {
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	}: ConversationContentProps = $props();

	const context = getStickToBottomContext();
	let element: HTMLDivElement;

	watch(
		() => element,
		() => {
			if (element) {
				context.setElement(element);
				// Initial scroll to bottom
				context.scrollToBottom("smooth");
			}
		}
	);
</script>

<div
	bind:this={element}
	bind:this={ref}
	class={cn(
		// This is the element `StickToBottomContext` scrolls — it reads
		// `scrollTop`/`scrollHeight` off it and listens for `scroll` here. Without
		// `overflow-y-auto` on *this* div there is no scroll container anywhere in
		// the thread: the parent clips with `overflow-hidden`, so every message
		// past the first screenful was unreachable and the scroll button never
		// appeared. `min-h-0` is what lets it shrink inside the flex column
		// instead of growing to fit its content.
		"flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain p-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
