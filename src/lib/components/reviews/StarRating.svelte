<script lang="ts">
	import StarIcon from '@lucide/svelte/icons/star';

	interface Props {
		/** Current rating (0–5). Bindable when interactive. */
		value?: number;
		/** Allow the user to pick a rating by clicking. */
		interactive?: boolean;
		/** Star size in px. */
		size?: number;
		/** Accessible label for the interactive group. */
		label?: string;
	}

	let { value = $bindable(0), interactive = false, size = 16, label = 'Rating' }: Props = $props();

	let hover = $state(0);

	const stars = [1, 2, 3, 4, 5];
	const shown = $derived(interactive && hover > 0 ? hover : value);

	function pick(n: number) {
		if (!interactive) return;
		value = n;
	}
</script>

{#if interactive}
	<div class="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
		{#each stars as n (n)}
			<button
				type="button"
				role="radio"
				aria-checked={value === n}
				aria-label={`${n} star${n > 1 ? 's' : ''}`}
				class="rounded p-0.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				onclick={() => pick(n)}
				onmouseenter={() => (hover = n)}
				onmouseleave={() => (hover = 0)}
			>
				<StarIcon
					style={`width:${size}px;height:${size}px`}
					class={n <= shown
						? 'fill-warning text-warning'
						: 'fill-transparent text-muted-foreground/40'}
				/>
			</button>
		{/each}
	</div>
{:else}
	<div class="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
		{#each stars as n (n)}
			<StarIcon
				style={`width:${size}px;height:${size}px`}
				class={n <= Math.round(value)
					? 'fill-warning text-warning'
					: 'fill-transparent text-muted-foreground/40'}
			/>
		{/each}
	</div>
{/if}
