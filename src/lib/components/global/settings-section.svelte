<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		title: string;
		description?: string;
		/** Controls for this section. Kept in a bounded column — see below. */
		children: Snippet;
		/** Optional trailing note or action, rendered under the controls. */
		footer?: Snippet;
		/** Optional action rendered beside the section title. */
		action?: Snippet;
		class?: string;
	}

	let { title, description, children, footer, action, class: className }: Props = $props();
</script>

<!--
	A settings section on a full-page (card-less) surface.

	Two columns: the label column explains what the section is, the control
	column holds the inputs and fills the remaining page width. Below `md` it
	collapses to a single column.

	The control column is deliberately NOT capped — capping it left a short
	content block under a full-width section rule, and made sections disagree
	with the full-width tables and grids on the same page. Individual controls
	carry their own `max-w-*` instead, so inputs stay readable without the
	column having to be narrow. Wide content (tables, card grids) can therefore
	live inside a section and keep its label column.

	Sections are separated by a rule rather than by card borders, so a long
	settings page reads as one page instead of a stack of boxes.
-->
<section
	class={cn(
		'grid gap-x-10 gap-y-4 border-b border-border py-6 first:pt-0 last:border-0 last:pb-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]',
		className
	)}
>
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="text-sm font-medium text-foreground">{title}</h2>
			{#if description}
				<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
			{/if}
		</div>
		{#if action}
			<div class="shrink-0 md:hidden">{@render action()}</div>
		{/if}
	</div>

	<div class="flex min-w-0 flex-col gap-4">
		{#if action}
			<div class="hidden justify-end md:flex">{@render action()}</div>
		{/if}
		{@render children()}
		{#if footer}
			<div class="text-xs leading-relaxed text-muted-foreground">{@render footer()}</div>
		{/if}
	</div>
</section>
