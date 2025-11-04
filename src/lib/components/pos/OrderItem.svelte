<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { IconTrash } from '@tabler/icons-svelte';
	import { createI18nUtils } from '$lib/utils/i18n';

	export interface OrderItem {
		id: string;
		name: string;
		price: number;
		quantity: number;
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
	}

	let { item, onRemove, onUpdateQuantity }: Props = $props();

	// Initialize i18n for India
	const i18n = createI18nUtils('in');
</script>

<div class="mb-4 rounded-lg border border-border p-4">
	<div class="flex items-start gap-3">
		<img
			src={`https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=100`}
			alt={item.name}
			class="h-16 w-16 rounded-lg object-cover"
		/>
		<div class="flex-1">
			<div class="mb-1 flex items-start justify-between">
				<h3 class="text-sm font-semibold">{item.name}</h3>
				<button
					onclick={() => onRemove(item.id)}
					class="text-muted-foreground hover:text-destructive"
				>
					<IconTrash class="h-4 w-4" />
				</button>
			</div>
			<div class="mb-2 space-y-1 text-xs text-muted-foreground">
				{#if item.modifiers?.size}
					<div>Size: {item.modifiers.size}</div>
				{/if}
				{#if item.modifiers?.spiceLevel}
					<div>Spice: {item.modifiers.spiceLevel}</div>
				{/if}
				{#if item.modifiers?.preparation && item.modifiers.preparation.length > 0}
					<div>Preparation: {item.modifiers.preparation.join(', ')}</div>
				{/if}
				{#if item.modifiers?.addOns && item.modifiers.addOns.length > 0}
					<div>Add-ons: {item.modifiers.addOns.join(', ')}</div>
				{/if}
				{#if item.modifiers?.removals && item.modifiers.removals.length > 0}
					<div>Removals: {item.modifiers.removals.join(', ')}</div>
				{/if}
				{#if item.modifiers?.specialInstructions && item.modifiers.specialInstructions !== 'None'}
					<div>Notes: {item.modifiers.specialInstructions}</div>
				{/if}
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm font-bold">{i18n.formatCurrency(item.price)}</span>
				<div class="flex items-center gap-2">
					<button
						onclick={() => onUpdateQuantity(item.id, -1)}
						class="flex h-6 w-6 items-center justify-center rounded-md border border-border hover:bg-accent"
					>
						−
					</button>
					<span class="w-8 text-center text-sm font-medium">{item.quantity}</span>
					<button
						onclick={() => onUpdateQuantity(item.id, 1)}
						class="flex h-6 w-6 items-center justify-center rounded-md border border-border hover:bg-accent"
					>
						+
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
