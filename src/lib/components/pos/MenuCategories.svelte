<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	export interface Category {
		name: string;
		count: number;
		active?: boolean;
	}

	interface Props {
		categories: Category[];
		selectedCategory: string;
		onCategorySelect: (categoryName: string) => void;
	}

	let { categories, selectedCategory, onCategorySelect }: Props = $props();
</script>

<div class=" flex max-w-full flex-wrap gap-1.5 overflow-x-auto pb-2 md:gap-2">
	{#each categories as category}
		<Button
			variant={selectedCategory === category.name ? 'default' : 'outline'}
			size="sm"
			class="h-8 shrink-0 px-2.5 text-xs whitespace-nowrap md:h-9 md:px-4 md:text-sm"
			onclick={() => onCategorySelect(category.name)}
		>
			<span class="truncate">{category.name}</span>
			<Badge
				variant="secondary"
				class="ml-1.5 h-4 px-1 text-[10px] md:ml-2 md:h-5 md:px-1.5 md:text-xs"
			>
				{category.count}
			</Badge>
		</Button>
	{/each}
</div>

<style>
	/* Hide scrollbar for Chrome, Safari and Opera */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	.scrollbar-hide {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
