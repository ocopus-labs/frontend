<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
		class?: string;
	}

	let { title, description, actions, class: className = '' }: Props = $props();
</script>

<div
	class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between {className}"
>
	<div>
		<h1 class="text-2xl font-bold">{title}</h1>
		{#if description}
			<p class="text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
