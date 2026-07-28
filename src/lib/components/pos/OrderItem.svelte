<script lang="ts">
	import { IconTrash, IconMinus, IconPlus } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';

	export interface OrderItem {
		id: string;
		name: string;
		price: number;
		quantity: number;
		image?: string;
		modifiers?: {
			size?: string;
			spiceLevel?: string;
			preparation?: string[];
			addOns?: string[];
			removals?: string[];
			specialInstructions?: string;
		};
	}

	interface Props {
		item: OrderItem;
		onRemove: (id: string) => void;
		onUpdateQuantity: (id: string, delta: number) => void;
		region?: string;
	}

	let { item, onRemove, onUpdateQuantity, region = 'us' }: Props = $props();

	const i18n = createI18nUtils(region);

	// Check if item has any modifiers to show
	const hasModifiers = $derived(
		item.modifiers?.size ||
			item.modifiers?.spiceLevel ||
			(item.modifiers?.addOns && item.modifiers.addOns.length > 0) ||
			(item.modifiers?.removals && item.modifiers.removals.length > 0) ||
			(item.modifiers?.specialInstructions && item.modifiers.specialInstructions !== 'None')
	);
</script>

<div class="rounded-lg bg-muted/30 p-3">
	<div class="flex gap-3">
		<!-- Item Image -->
		<img
			src={item.image || ''}
			alt={item.name}
			loading="lazy"
			class="h-14 w-14 flex-shrink-0 rounded-md object-cover"
		/>

		<!-- Item Details -->
		<div class="flex min-w-0 flex-1 flex-col justify-between">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 flex-1">
					<h3 class="truncate text-sm font-semibold">{item.name}</h3>
					{#if hasModifiers}
						<p class="truncate text-xs text-muted-foreground">
							{[item.modifiers?.size, item.modifiers?.spiceLevel, ...(item.modifiers?.addOns || [])]
								.filter(Boolean)
								.join(' • ')}
						</p>
					{/if}
				</div>
				<span class="flex-shrink-0 text-sm font-bold">
					{i18n.formatCurrency(item.price * item.quantity)}
				</span>
			</div>

			<!-- Quantity Controls & Remove -->
			<div class="mt-2 flex items-center justify-between">
				<div class="flex items-center gap-1">
					<button
						onclick={() => onUpdateQuantity(item.id, -1)}
						class="flex h-8 w-8 items-center justify-center rounded-md bg-background shadow-sm transition-all active:scale-95"
					>
						<IconMinus class="h-4 w-4" />
					</button>
					<span class="w-8 text-center text-sm font-semibold">{item.quantity}</span>
					<button
						onclick={() => onUpdateQuantity(item.id, 1)}
						class="flex h-8 w-8 items-center justify-center rounded-md bg-background shadow-sm transition-all active:scale-95"
					>
						<IconPlus class="h-4 w-4" />
					</button>
				</div>
				<button
					onclick={() => onRemove(item.id)}
					class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
				>
					<IconTrash class="h-4 w-4" />
				</button>
			</div>
		</div>
	</div>
</div>
