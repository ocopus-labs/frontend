<script lang="ts" module>
	export interface MenuItemCardItem {
		id: string;
		name: string;
		price: number;
		foodCost?: number | null;
		image?: string | null;
		isAvailable: boolean;
		isVegetarian?: boolean;
		categoryId?: string | null;
	}
</script>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';

	import IconDots from '@lucide/svelte/icons/ellipsis';
	import IconPencil from '@lucide/svelte/icons/pencil';
	import IconCopy from '@lucide/svelte/icons/copy';
	import IconTrash from '@lucide/svelte/icons/trash-2';
	import IconImage from '@lucide/svelte/icons/image';

	interface Props {
		item: MenuItemCardItem;
		/** Resolved from the category list — the item only carries `categoryId`. */
		categoryName?: string;
		/** Pre-formatted by the page, which owns the business's currency. */
		formatPrice: (amount: number) => string;
		/** Disables the availability switch while its request is inflight. */
		busy?: boolean;
		/** Hides the actions menu and locks the switch for roles without write access. */
		readonly?: boolean;
		onToggleAvailability: (id: string) => void;
		onEdit: (item: MenuItemCardItem) => void;
		onDuplicate: (item: MenuItemCardItem) => void;
		onDelete: (id: string) => void;
	}

	let {
		item,
		categoryName,
		formatPrice,
		busy = false,
		readonly = false,
		onToggleAvailability,
		onEdit,
		onDuplicate,
		onDelete
	}: Props = $props();

	/**
	 * Gross margin. Only shown when food cost is a usable positive number —
	 * a missing cost is not the same as a 100% margin, and showing "100%"
	 * for an unpriced item would be actively misleading on a pricing screen.
	 */
	const marginPct = $derived.by(() => {
		const cost = item.foodCost;
		if (cost === null || cost === undefined || cost <= 0) return null;
		if (!item.price || item.price <= 0) return null;
		return Math.round(((item.price - cost) / item.price) * 100);
	});
</script>

<Card.Root
	class="group/item relative overflow-hidden transition-shadow hover:shadow-md {item.isAvailable
		? ''
		: 'opacity-70'}"
>
	<!-- Image -->
	<div class="relative aspect-[4/3] w-full overflow-hidden bg-muted">
		{#if item.image}
			<img
				src={item.image}
				alt={item.name}
				loading="lazy"
				class="size-full object-cover transition-transform duration-300 group-hover/item:scale-[1.03]"
			/>
		{:else}
			<div class="flex size-full items-center justify-center text-muted-foreground">
				<IconImage class="size-8" />
				<span class="sr-only">No image</span>
			</div>
		{/if}

		{#if !item.isAvailable}
			<div class="absolute top-2 left-2">
				<Badge variant="secondary">Unavailable</Badge>
			</div>
		{/if}

		<!-- Overflow actions sit on the image so the body stays about the item -->
		{#if !readonly}
			<div class="absolute top-2 right-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="secondary"
								size="icon"
								class="size-8 opacity-90 shadow-sm"
								aria-label="Actions for {item.name}"
							>
								<IconDots class="size-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item onSelect={() => onEdit(item)}>
							<IconPencil class="mr-2 size-4" />
							Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item onSelect={() => onDuplicate(item)}>
							<IconCopy class="mr-2 size-4" />
							Duplicate
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive" onSelect={() => onDelete(item.id)}>
							<IconTrash class="mr-2 size-4" />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/if}
	</div>

	<Card.Content class="space-y-3">
		<div class="space-y-1">
			<div class="flex items-start gap-2">
				<h3 class="min-w-0 flex-1 truncate text-sm font-medium" title={item.name}>
					{item.name}
				</h3>
				{#if item.isVegetarian}
					<Badge variant="outline" class="shrink-0 text-xs">Veg</Badge>
				{/if}
			</div>
			{#if categoryName}
				<p class="truncate text-xs text-muted-foreground">{categoryName}</p>
			{/if}
		</div>

		<div class="flex items-baseline gap-2">
			<span class="text-base font-semibold tabular-nums">{formatPrice(item.price)}</span>
			{#if marginPct !== null}
				<span class="text-xs text-muted-foreground tabular-nums">
					{marginPct}% margin
				</span>
			{/if}
		</div>
	</Card.Content>

	<Card.Footer class="border-t pt-3">
		<div class="flex w-full items-center justify-between gap-2">
			<Label for="available-{item.id}" class="cursor-pointer text-xs font-normal">
				{item.isAvailable ? 'Available' : 'Hidden'}
			</Label>
			<Switch
				id="available-{item.id}"
				checked={item.isAvailable}
				disabled={busy || readonly}
				onCheckedChange={() => onToggleAvailability(item.id)}
				aria-label="Toggle availability for {item.name}"
			/>
		</div>
	</Card.Footer>
</Card.Root>
