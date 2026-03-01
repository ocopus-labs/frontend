<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		IconArmchair,
		IconBike,
		IconShoppingBag,
		IconMapPin,
		IconChevronRight
	} from '@tabler/icons-svelte';
	import OrderItem from './OrderItem.svelte';
	import OrderTotals from './OrderTotals.svelte';
	import type { OrderItem as OrderItemType } from './OrderItem.svelte';

	interface Props {
		orderItems: OrderItemType[];
		orderType: string;
		selectedTableDisplay: string | null;
		showTableSelection: boolean;
		subtotal: number;
		showTaxes: boolean;
		taxRate: number;
		taxes: number;
		showDiscount: boolean;
		discountType: 'percentage' | 'fixed';
		discountValue: number;
		discount: number;
		totalPayment: number;
		onOrderTypeChange: (type: string) => void;
		onRemoveItem: (id: string) => void;
		onUpdateQuantity: (id: string, delta: number) => void;
		onToggleTaxes: () => void;
		onToggleDiscount: () => void;
		onTableSelectClick?: () => void;
		region?: string;
	}

	let {
		orderItems,
		orderType,
		selectedTableDisplay,
		showTableSelection,
		subtotal,
		showTaxes,
		taxRate,
		taxes,
		showDiscount,
		discountType,
		discountValue,
		discount,
		totalPayment,
		onOrderTypeChange,
		onRemoveItem,
		onUpdateQuantity,
		onToggleTaxes,
		onToggleDiscount,
		onTableSelectClick,
		region = 'us'
	}: Props = $props();

	const orderTypes = [
		{ id: 'Dine-In', label: 'Dine-In', icon: IconArmchair },
		{ id: 'Takeaway', label: 'Takeaway', icon: IconShoppingBag },
		{ id: 'Delivery', label: 'Delivery', icon: IconBike }
	];
</script>

<aside class="flex h-full max-h-full flex-col overflow-hidden bg-card">
	<!-- Order Type Selection - Large Touch Targets -->
	<div class="border-b border-border p-3 md:p-4">
		<div class="grid grid-cols-3 gap-1.5 md:gap-2">
			{#each orderTypes as type}
				<button
					onclick={() => onOrderTypeChange(type.id)}
					class="flex flex-col items-center justify-center gap-1 rounded-md p-2 transition-all active:scale-95 md:gap-1.5 md:p-3
						{orderType === type.id
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'bg-muted/50 text-muted-foreground hover:bg-muted'}"
				>
					<type.icon class="h-4 w-4 md:h-5 md:w-5" />
					<span class="text-[11px] font-medium md:text-xs">{type.label}</span>
				</button>
			{/each}
		</div>

		<!-- Table Selection - Only for Dine-In -->
		{#if showTableSelection && orderType === 'Dine-In'}
			<button
				onclick={onTableSelectClick}
				class="mt-3 flex w-full items-center justify-between rounded-md border-2 border-dashed border-border p-3 transition-all hover:border-primary hover:bg-muted/30 active:scale-[0.98]
					{selectedTableDisplay ? 'border-solid border-primary/50 bg-primary/5' : ''}"
			>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
						<IconMapPin class="h-5 w-5 text-muted-foreground" />
					</div>
					<div class="text-left">
						<p class="text-sm font-medium">
							{selectedTableDisplay || 'Select Table'}
						</p>
						<p class="text-xs text-muted-foreground">
							{selectedTableDisplay ? 'Tap to change' : 'Required for dine-in'}
						</p>
					</div>
				</div>
				<IconChevronRight class="h-5 w-5 text-muted-foreground" />
			</button>
		{/if}
	</div>

	<!-- Order Items -->
	<div class="flex-1 overflow-auto p-3 md:p-4">
		{#if orderItems.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="mb-3 rounded-full bg-muted p-4">
					<IconShoppingBag class="h-8 w-8 text-muted-foreground" />
				</div>
				<p class="text-sm font-medium text-muted-foreground">No items yet</p>
				<p class="text-xs text-muted-foreground">Tap items from the menu to add</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each orderItems as item}
					<OrderItem {item} onRemove={onRemoveItem} {onUpdateQuantity} {region} />
				{/each}
			</div>
		{/if}
	</div>

	<!-- Order Totals -->
	<OrderTotals
		{subtotal}
		{showTaxes}
		{taxRate}
		{taxes}
		{showDiscount}
		{discountType}
		{discountValue}
		{discount}
		{totalPayment}
		{onToggleTaxes}
		{onToggleDiscount}
		{region}
	/>
</aside>
