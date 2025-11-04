<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { IconPlus } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';

	export interface MenuItem {
		id: number;
		name: string;
		price: number;
		image: string;
		available: boolean;
		modifiers?: {
			sizes?: { name: string; price: number }[];
			spiceLevels?: { name: string; price: number }[];
			preparation?: string[];
			addOns?: { name: string; price: number }[];
			removals?: string[];
		};
	}

	interface Props {
		item: MenuItem;
		onAddToOrder: (item: MenuItem) => void;
	}

	let { item, onAddToOrder }: Props = $props();

	// Initialize i18n for India
	const i18n = createI18nUtils('in');
</script>

<Card.Root class="group gap-3 overflow-hidden py-0 transition-all hover:shadow-md">
	<div class="relative aspect-4/3 w-full overflow-hidden">
		<img
			src={item.image}
			alt={item.name}
			class="h-full w-full rounded-t-lg object-cover"
			loading="lazy"
		/>
		{#if item.available}
			<Badge class="absolute top-1.5 right-1.5 text-[10px] md:top-2 md:right-2 md:text-xs">
				Available
			</Badge>
		{:else}
			<Badge
				class="absolute top-1.5 right-1.5 text-[10px] md:top-2 md:right-2 md:text-xs"
				variant="destructive"
			>
				Not Available
			</Badge>
		{/if}
	</div>
	<div class="p-2 pt-0 md:p-2.5 md:pt-0">
		<h3 class=" line-clamp-2 min-h-8 text-xs font-semibold sm:text-sm md:text-base">
			{item.name}
		</h3>
		<div class="flex items-center justify-between">
			<span class="text-sm font-bold sm:text-base md:text-lg">
				{i18n.formatCurrency(item.price)}
			</span>
		</div>
		{#if item.available}
			<Button
				size="sm"
				onclick={() => onAddToOrder(item)}
				class="mt-2 h-7 w-full shrink-0 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs md:h-9 md:text-sm"
			>
				<IconPlus class="h-3 w-3 sm:mr-1 md:h-4 md:w-4" />
				<span class="hidden sm:inline">Add</span>
				<span class="hidden md:inline"> to Cart</span>
			</Button>
		{:else}
			<Button
				size="sm"
				variant="outline"
				disabled
				class="mt-2 h-7 w-full shrink-0 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs md:h-9 md:text-sm"
			>
				<span class="hidden sm:inline">Unavailable</span>
				<span class="sm:hidden">N/A</span>
			</Button>
		{/if}
	</div>
</Card.Root>
