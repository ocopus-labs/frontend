<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		/** Optional trailing actions (buttons, links) aligned to the right. */
		actions?: Snippet;
		class?: string;
	}

	let { title, description, actions, class: className = '' }: Props = $props();
</script>

<!-- Smaller-than-page heading for sections within a page. Uses the shared
	`.text-section-title` scale so sub-headings stop drifting (text-lg vs text-base). -->
<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between {className}">
	<div>
		<h2 class="text-section-title">{title}</h2>
		{#if description}
			<p class="text-section-description">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
