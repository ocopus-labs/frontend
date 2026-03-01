<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { IconPlus, IconMinus } from '@tabler/icons-svelte';
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
			milkTypes?: { name: string; price: number }[];
			preparation?: string[];
			addOns?: { name: string; price: number }[];
			removals?: string[];
		};
	}

	interface Props {
		item: MenuItem;
		onAddToOrder: (item: MenuItem) => void;
		cartQuantity?: number;
		region?: string;
	}

	let { item, onAddToOrder, cartQuantity = 0, region = 'in' }: Props = $props();

	const i18n = createI18nUtils(region);
</script>

<!-- Mobile: compact tappable card (hidden on sm+) -->
<button
	type="button"
	class="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all active:scale-[0.97] sm:hidden"
	class:opacity-50={!item.available}
	disabled={!item.available}
	onclick={() => item.available && onAddToOrder(item)}
>
	<div class="relative aspect-square w-full overflow-hidden">
		<img
			src={item.image}
			alt={item.name}
			class="h-full w-full rounded-t-xl object-cover"
			loading="lazy"
		/>
		{#if !item.available}
			<Badge
				class="absolute top-1 right-1 text-[10px]"
				variant="destructive"
			>
				Unavailable
			</Badge>
		{/if}
		{#if item.available && cartQuantity > 0}
			<div class="absolute right-1 bottom-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground shadow-md">
				{cartQuantity}
			</div>
		{:else if item.available}
			<div class="absolute right-1 bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
				<IconPlus class="h-3.5 w-3.5" />
			</div>
		{/if}
	</div>
	<div class="flex flex-col gap-0.5 p-1.5">
		<h3 class="line-clamp-1 text-[11px] font-medium leading-tight">
			{item.name}
		</h3>
		<span class="text-[11px] font-bold text-primary">
			{i18n.formatCurrency(item.price)}
		</span>
	</div>
</button>

<!-- Desktop: full card with button (hidden on mobile) -->
<Card.Root class="group hidden gap-2 overflow-hidden py-0 transition-all hover:shadow-md sm:flex sm:flex-col md:gap-3">
	<div class="relative aspect-[4/3] w-full overflow-hidden">
		<img
			src={item.image}
			alt={item.name}
			class="h-full w-full rounded-t-lg object-cover"
			loading="lazy"
		/>
		{#if !item.available}
			<Badge
				class="absolute top-2 right-2 text-xs"
				variant="destructive"
			>
				Unavailable
			</Badge>
		{/if}
		{#if cartQuantity > 0}
			<div class="absolute right-2 bottom-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground shadow-md">
				{cartQuantity}
			</div>
		{/if}
	</div>
	<div class="p-2.5 pt-0">
		<h3 class="line-clamp-2 min-h-8 text-sm font-semibold md:text-base">
			{item.name}
		</h3>
		<div class="flex items-center justify-between">
			<span class="text-base font-bold md:text-lg">
				{i18n.formatCurrency(item.price)}
			</span>
		</div>
		{#if item.available}
			<Button
				size="sm"
				onclick={() => onAddToOrder(item)}
				class="mt-2 h-8 w-full shrink-0 px-3 text-xs md:h-9 md:text-sm"
			>
				<IconPlus class="mr-1 h-4 w-4" />
				Add<span class="hidden md:inline">&nbsp;to Cart</span>
			</Button>
		{:else}
			<Button
				size="sm"
				variant="outline"
				disabled
				class="mt-2 h-8 w-full shrink-0 px-3 text-xs md:h-9 md:text-sm"
			>
				N/A
			</Button>
		{/if}
	</div>
</Card.Root>
