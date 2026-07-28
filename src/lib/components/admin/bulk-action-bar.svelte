<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';

	let {
		selectedCount,
		actions,
		onAction,
		onClear
	}: {
		selectedCount: number;
		actions: { label: string; value: string; variant?: 'default' | 'destructive' }[];
		onAction: (action: string) => void;
		onClear: () => void;
	} = $props();
</script>

{#if selectedCount > 0}
	<div
		class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-muted px-4 py-3 shadow-lg"
	>
		<span class="text-sm font-medium">{selectedCount} selected</span>
		{#each actions as action}
			<Button
				size="sm"
				variant={action.variant || 'default'}
				onclick={() => onAction(action.value)}
			>
				{action.label}
			</Button>
		{/each}
		<Button size="sm" variant="ghost" onclick={onClear} aria-label="Clear selection">
			<X class="h-4 w-4" />
		</Button>
	</div>
{/if}
