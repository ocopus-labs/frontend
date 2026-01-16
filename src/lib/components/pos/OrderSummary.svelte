<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { IconChevronDown } from '@tabler/icons-svelte';
	import OrderItem from './OrderItem.svelte';
	import OrderTotals from './OrderTotals.svelte';
	import type { OrderItem as OrderItemType } from './OrderItem.svelte';

	interface Props {
		orderItems: OrderItemType[];
		orderType: string;
		selectedTable: number;
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
	}

	let {
		orderItems,
		orderType,
		selectedTable,
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
		onToggleDiscount
	}: Props = $props();
</script>

<aside class="flex h-full max-h-full flex-col overflow-hidden bg-card">
	<!-- Order Header -->
	<div class="border-b border-border p-3 md:p-4 lg:p-6">
		<div class="mb-3 flex items-center justify-between md:mb-4">
			<h2 class="text-base font-bold md:text-lg">Order Summary</h2>
			<span class="text-xs font-medium text-muted-foreground md:text-sm">#B12309</span>
		</div>
		<div class="mb-3 flex gap-2 md:mb-4">
			<Button
				size="sm"
				variant={orderType === 'Dine-In' ? 'default' : 'outline'}
				onclick={() => onOrderTypeChange('Dine-In')}
				class="flex-1 text-xs md:text-sm"
			>
				Dine-In
			</Button>
			<Button
				size="sm"
				variant={orderType === 'Delivery' ? 'default' : 'outline'}
				onclick={() => onOrderTypeChange('Delivery')}
				class="flex-1 text-xs md:text-sm"
			>
				Delivery
			</Button>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" class="flex-1 text-xs md:text-sm">
				{orderType}
				<IconChevronDown class="ml-1 h-3 w-3 md:h-4 md:w-4" />
			</Button>
			<Button variant="outline" size="sm" class="flex-1 text-xs md:text-sm">
				<span class="hidden sm:inline">Select Table {selectedTable}</span>
				<span class="sm:hidden">Table {selectedTable}</span>
				<IconChevronDown class="ml-1 h-3 w-3 md:h-4 md:w-4" />
			</Button>
		</div>
	</div>

	<!-- Order Items -->
	<div class="flex-1 overflow-auto p-3 md:p-4 lg:p-6">
		{#each orderItems as item}
			<OrderItem {item} onRemove={onRemoveItem} {onUpdateQuantity} />
		{/each}
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
	/>
</aside>
