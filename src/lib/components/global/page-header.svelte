<script lang="ts">
	import type { Snippet } from 'svelte';
	import { IconChevronLeft } from '@tabler/icons-svelte';
	import { goto } from '$app/navigation';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
		class?: string;
		/**
		 * Show a mobile-only back button to the left of the title (deep nested
		 * routes have no sidebar affordance on phones). Pass a URL to navigate
		 * there, or `true` to go back in history.
		 */
		back?: string | boolean;
	}

	let { title, description, actions, class: className = '', back }: Props = $props();

	function goBack() {
		if (typeof back === 'string') goto(back);
		else history.back();
	}
</script>

<div
	class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between {className}"
>
	<div class="flex items-center gap-2">
		{#if back}
			<button
				type="button"
				onclick={goBack}
				aria-label="Go back"
				class="text-muted-foreground hover:bg-muted -ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md md:hidden"
			>
				<IconChevronLeft class="size-5" />
			</button>
		{/if}
		<div>
			<h1 class="text-2xl font-bold">{title}</h1>
			{#if description}
				<p class="text-muted-foreground">{description}</p>
			{/if}
		</div>
	</div>
	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
